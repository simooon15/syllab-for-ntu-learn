import { t } from "../copy";
import {
  V2_MESSAGE_CONTRACT,
  type AppView,
  type Mutation,
  type ScreenId,
  type Surface,
  type ViewMessage,
  type ViewResponse
} from "../contract";
import type { Actions, HintKey, RuntimeNotice, RuntimeState } from "./patterns";
import { renderApp, resetUiState, uiState } from "./render";
import { mountQaMonitor } from "../qa-telemetry";

const HINTS_KEY = "syllab.v2.ui.hints";
/** Keys this surface owns. A change to one of them is not a Course State revision. */
const UI_KEY_PREFIX = "syllab.v2.ui.";
const NTU_LEARN_ORIGIN = "https://ntulearn.ntu.edu.sg/";
const NOTICE_MS = 4000;
const NOTICE_WITH_ACTION_MS = 7000;
const RETRY_MS = 1500;
const RESTORE_STAGE_MS = 450;

export interface MountOptions {
  root: HTMLElement;
  surface: Surface;
}

export interface MountHandle {
  /** Re-reads the view; used by tests and by anything that knows the state moved. */
  refresh(): Promise<void>;
  dispose(): void;
}

/**
 * The runtime half of the UI: it asks the service worker for a view, follows local revision
 * changes, sends mutations with the revision they were computed from, and shows the error
 * copy when the service worker refuses. Nothing here decides product semantics.
 */
export function mount(options: MountOptions): MountHandle {
  const { root, surface } = options;
  const runtime: RuntimeState = {
    hints: {},
    notice: undefined,
    error: undefined,
    restoreStage: undefined
  };
  let view: AppView | undefined;
  let revision = 0;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let restoreTimer: ReturnType<typeof setInterval> | undefined;
  let restorePayload: unknown;
  let restoreStaged = false;
  let screenOverride: ScreenId | undefined;
  let busy = 0;
  let queue: Promise<void> = Promise.resolve();
  let disposed = false;
  const disposeQaMonitor = mountQaMonitor();

  const actions: Actions = {
    runtime,
    onMutation: (mutation) => {
      sendMutation(mutation);
    },
    onOpenScreen: (screen, context) => {
      void runRequest({
        contract: V2_MESSAGE_CONTRACT,
        type: "OPEN_SCREEN",
        surface,
        screen,
        ...(context?.courseId === undefined ? {} : { courseId: context.courseId }),
        ...(context?.semesterId === undefined ? {} : { semesterId: context.semesterId })
      });
    },
    onOpenSettings: () => {
      // Settings is a Full-page entry (Interaction Spec §12), so from the Side Panel that means the
      // Full-page surface rather than rendering a four-section configuration page into a column the
      // width of a phone. The route is recorded for the Full-page surface first, so the tab it opens
      // lands on Settings rather than on the dashboard.
      if (surface === "side-panel") {
        void runRequest({
          contract: V2_MESSAGE_CONTRACT,
          type: "OPEN_SCREEN",
          surface: "full-page",
          screen: "SET-01"
        });
        void chrome.tabs.create({ url: chrome.runtime.getURL("app.html") });
        return;
      }
      void runRequest({
        contract: V2_MESSAGE_CONTRACT,
        type: "OPEN_SCREEN",
        surface,
        screen: "SET-01"
      });
    },
    onOpenFullPage: () => {
      void chrome.tabs.create({ url: chrome.runtime.getURL("app.html") });
    },
    onExportCalendar: (courseId) => {
      void runRequest(
        { contract: V2_MESSAGE_CONTRACT, type: "EXPORT_CALENDAR", surface, courseId },
        { notice: { screen: "CAL-02", message: t("calendarExported") } }
      );
    },
    onExportBackup: () => {
      void runRequest(
        { contract: V2_MESSAGE_CONTRACT, type: "EXPORT_BACKUP", surface },
        { notice: { screen: "BKP-05", message: t("backupExported") } }
      );
    },
    onRestoreBackup: (payload) => {
      restorePayload = payload;
      restoreStaged = false;
      startRestore();
    },
    onConfirmRestore: () => {
      if (restorePayload === undefined) return;
      restoreStaged = true;
      startRestore();
    },
    onCancelRestore: () => {
      restorePayload = undefined;
      restoreStaged = false;
      void requestView();
    },
    onSetApiKey: (apiKey) => {
      void (async () => {
        await runRequest({ contract: V2_MESSAGE_CONTRACT, type: "SET_API_KEY", surface, apiKey });
        await runRequest({ contract: V2_MESSAGE_CONTRACT, type: "VALIDATE_API_KEY", surface });
      })();
    },
    onValidateApiKey: () => {
      void runRequest({ contract: V2_MESSAGE_CONTRACT, type: "VALIDATE_API_KEY", surface });
    },
    onSetAuthorization: (kind, granted) => {
      void runRequest({
        contract: V2_MESSAGE_CONTRACT,
        type: "SET_AUTHORIZATION",
        surface,
        kind,
        granted
      });
    },
    onGrantPermission: (workflowId) => {
      void (async () => {
        // The prompt has to be asked for here, in the click that meant it: Chrome shows it only
        // during a user gesture, and a message hop into the Service Worker is not one. What is
        // asked for is what the manifest declares as optional for reading a Course's files —
        // asking for anything broader would be asking for something the product does not use.
        const manifest = chrome.runtime.getManifest() as { optional_host_permissions?: string[] };
        const origins = manifest.optional_host_permissions ?? [];
        if (origins.length > 0) {
          await chrome.permissions.request({ origins }).catch(() => false);
        }
        // The run kept its place, so resuming it is all that is left. (Gate 3 finding F28.)
        sendMutation({ kind: "RetryTask", workflowId });
      })();
    },
    onHintSeen: (hint: HintKey) => {
      runtime.hints = { ...runtime.hints, [hint]: true };
      paint();
      void chrome.storage.local.set({ [HINTS_KEY]: runtime.hints }).catch(() => undefined);
    },
    onNotify: (notice: RuntimeNotice) => {
      setNotice(notice);
    },
    onDismissNotice: () => {
      clearNotice();
    },
    onRetry: () => {
      void requestView();
    }
  };

  function currentView(): AppView {
    const base = view ?? { surface, screen: surface === "side-panel" ? "SEM-02" : "SEM-01" };
    return screenOverride === undefined ? base : { ...base, screen: screenOverride };
  }

  /**
   * The last thing that was drawn, as text.
   *
   * Rendering replaces the whole tree, images included, so a paint that draws what is already on
   * screen is a visible flash for nothing. A single click used to reach here two or three times —
   * once when the response landed, once when the queue drained, once when a follow-up view arrived
   * — and each of those re-created every node. Comparing what would be drawn against what was drawn
   * leaves exactly one paint per real change. (Gate 3 finding F6.)
   */
  let paintedSignature = "";

  function paint(): void {
    if (disposed) return;
    // Everything the renderer reads: the view, the local screen state, and the runtime's own error
    // bar, notice and first-use hints. A signature that covered only the view would swallow the
    // paint that shows a refused request.
    const signature = JSON.stringify([currentView(), uiState(), runtime]);
    if (signature === paintedSignature) return;
    paintedSignature = signature;
    renderApp(root, currentView(), actions, () => {
      // Local screen state repaints must invalidate the mount-level signature cache. Otherwise a
      // later service-worker response can look unchanged even though the DOM is still showing an
      // older inline menu or confirmation layer.
      paintedSignature = "";
      paint();
    });
  }

  function setNotice(notice: RuntimeNotice): void {
    runtime.notice = notice;
    paint();
    clearTimeout(noticeTimer);
    const delay = notice.actionLabel === undefined ? NOTICE_MS : NOTICE_WITH_ACTION_MS;
    noticeTimer = setTimeout(() => {
      clearNotice();
    }, delay);
  }

  function clearNotice(): void {
    clearTimeout(noticeTimer);
    runtime.notice = undefined;
    paint();
  }

  /** Takes in whatever the service worker answered and reports whether it was a real view. */
  function absorb(response: ViewResponse | undefined): boolean {
    if (response?.ok === true) {
      view = response.view;
      revision = response.view.course?.revision ?? revision;
      runtime.error = undefined;
      clearTimeout(retryTimer);
      return true;
    }
    runtime.error =
      response?.ok === false
        ? response.error
        : { code: "NO_RESPONSE", copy: t("errorUnreachable") };
    return false;
  }

  async function send(message: ViewMessage): Promise<ViewResponse | undefined> {
    try {
      const response: unknown = await chrome.runtime.sendMessage(message);
      if (isViewResponse(response)) return response;
      // A request that only acknowledges success still has to refresh the view.
      return response === undefined ? undefined : { ok: true, view: currentView() };
    } catch {
      return undefined;
    }
  }

  function scheduleRetry(): void {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      void requestView();
    }, RETRY_MS);
  }

  async function requestView(): Promise<void> {
    clearTimeout(retryTimer);
    const tabId = await resolveTabId();
    const response = await send({
      contract: V2_MESSAGE_CONTRACT,
      type: "GET_VIEW",
      surface,
      ...(tabId === undefined ? {} : { tabId })
    });
    const ok = absorb(response);
    paint();
    if (!ok) scheduleRetry();
  }

  function sendMutation(mutation: Mutation): void {
    busy += 1;
    // Mutation handlers may close a local menu/confirmation before handing work to the service
    // worker. Repaint immediately so that the click has visible feedback even while the response
    // is in flight; otherwise the old overlay can stay mounted and make a successful click look
    // inert until the next refresh.
    paint();
    const courseId = view?.courseId;
    queue = queue.then(async () => {
      const response = await send({
        contract: V2_MESSAGE_CONTRACT,
        type: "MUTATE",
        surface,
        ...(courseId === undefined ? {} : { courseId }),
        expectedRevision: revision,
        mutation
      });
      const ok = absorb(response);
      busy -= 1;
      if (busy === 0) paint();
      if (!ok) await requestView();
    });
  }

  async function runRequest(
    message: ViewMessage,
    options: { notice?: RuntimeNotice } = {}
  ): Promise<void> {
    clearTimeout(retryTimer);
    const response = await send(message);
    const ok = absorb(response);
    paint();
    if (ok) {
      if (options.notice) setNotice(options.notice);
      return;
    }
    await requestView();
  }

  /**
   * Restore is Full Replace through one message: the first send stages the file and comes back
   * with its summary (BKP-02), the confirmed send applies it. A refused restore leaves the
   * previous state untouched and shows BKP-04 instead of the current screen.
   */
  function startRestore(): void {
    if (restorePayload === undefined) return;
    const payload = restorePayload;
    // Reading → Validating → Restoring. A user never sees a half-restored state.
    screenOverride = "BKP-03";
    runtime.restoreStage = 0;
    paint();
    clearInterval(restoreTimer);
    restoreTimer = setInterval(() => {
      runtime.restoreStage = Math.min(2, (runtime.restoreStage ?? 0) + 1);
      paint();
    }, RESTORE_STAGE_MS);

    void (async () => {
      const response = await send({
        contract: V2_MESSAGE_CONTRACT,
        type: "RESTORE_BACKUP",
        surface,
        backup: payload,
        // The first send only asks what the file holds. Nothing is replaced until the user has
        // seen the summary and confirmed the Full Replace warning.
        confirmed: restoreStaged
      });
      clearInterval(restoreTimer);
      runtime.restoreStage = undefined;
      const ok = absorb(response);
      if (!ok) {
        // BKP-04 keeps the previous state visible and untouched.
        screenOverride = "BKP-04";
        paint();
        return;
      }
      if (!restoreStaged) {
        // BKP-02: the summary and the warning, with the previous state still in place.
        screenOverride = undefined;
        paint();
        return;
      }
      screenOverride = undefined;
      restorePayload = undefined;
      paint();
      await requestView();
    })();
  }

  async function resolveTabId(): Promise<number | undefined> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (
        tab?.id !== undefined &&
        typeof tab.url === "string" &&
        tab.url.startsWith(NTU_LEARN_ORIGIN)
      ) {
        return tab.id;
      }
    } catch {
      // A surface without tab access still works; it just does not name the current Course.
    }
    return undefined;
  }

  function onStorageChanged(changes: Record<string, unknown>, area: string): void {
    if (area !== "local") return;
    const keys = Object.keys(changes);
    if (keys.length > 0 && keys.every((key) => key.startsWith(UI_KEY_PREFIX))) return;
    void requestView();
  }

  async function start(): Promise<void> {
    resetUiState();
    paintedSignature = "";
    const stored: unknown = await chrome.storage.local.get(HINTS_KEY).catch(() => undefined);
    runtime.hints = readHints(property(stored, HINTS_KEY));
    chrome.storage.onChanged.addListener(onStorageChanged);
    await requestView();
  }

  void start();

  return {
    refresh: requestView,
    dispose: () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearTimeout(noticeTimer);
      clearInterval(restoreTimer);
      chrome.storage.onChanged.removeListener(onStorageChanged);
      disposeQaMonitor();
    }
  };
}

function property(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}

function readHints(value: unknown): Partial<Record<HintKey, boolean>> {
  if (typeof value !== "object" || value === null) return {};
  const record = value as Record<string, unknown>;
  const hints: Partial<Record<HintKey, boolean>> = {};
  if (record.split === true) hints.split = true;
  if (record["same-assessment-as"] === true) hints["same-assessment-as"] = true;
  return hints;
}

function isViewResponse(value: unknown): value is ViewResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { ok?: unknown }).ok === "boolean"
  );
}
