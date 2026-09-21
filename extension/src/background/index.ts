import type { AiCall, AiCallOutcome } from "../v2/ai-pipeline";
import {
  buildTaskACalls,
  buildTaskAConsolidationCall,
  buildTaskBCalls,
  buildTaskBExpansionCall,
  buildTaskCCalls
} from "../v2/ai-pipeline";
import { planChunks } from "../v2/chunking";
import {
  ChromeTabDiscoveryApi,
  ChromeEnrollmentApi,
  BlackboardMachinePort
} from "../v2/blackboard";
import { CONTRACT_VERSION, isRecord } from "@syllab/contracts";
import type { DiscoveredSource } from "@syllab/contracts";
import { DeepSeekFailure, DeepSeekTransport } from "../v2/deepseek";
import { completeWithRepair } from "../v2/deepseek-complete";
import { validateTaskA, validateTaskB, validateTaskC } from "../v2/ai-contracts";
import type { AiCallContext } from "../v2/workflow";
import type { FetchedSource, MachinePort } from "../v2/workflow";
import { WorkflowEngine, retryDue, retryDueAt } from "../v2/workflow";
import { ViewHandler } from "../v2/handler";
import { LocalDatabase } from "../v2/storage";
import { LocalStore } from "../v2/store";
import { ViewBuilder } from "../v2/view";
import { applyDiscovery, readDiscovery } from "../v2/enrollment";
import { qaTrace } from "../v2/qa-telemetry";
import { SettingsRepository, DEEPSEEK_KEY_STORAGE } from "../v2/settings";
import { PRODUCT_VERSION, SCHEMA_VERSION_STORAGE } from "../v2/product";
import { RebuildStagingStore } from "../v2/staging";
import type { CourseRecord, CoverageFacts } from "../v2/domain";
import { randomId } from "../v2/crypto";
import { startMaintenanceCheck } from "../v2/opportunity";
import type { ParseResult } from "../parser/domain";
import {
  observeFirstUnapprovedRedirectOrigin,
  type RedirectEventPort
} from "../fetch/redirect-observer";
import type { Route } from "../v2/view";
import {
  V2_MESSAGE_CONTRACT,
  isViewMessage,
  type Surface,
  type ViewResponse
} from "../v2/contract";
import { checkSchedule, type OpportunityCandidate } from "../v2/scheduler";
import { e2eBackup, handleE2e, isE2eMessage } from "../v2/e2e-fixtures";

const database = new LocalDatabase();
const store = new LocalStore(database);
const settings = new SettingsRepository(chrome.storage.local);
const transport = new DeepSeekTransport();

/**
 * The provider boundary. `completeWithRepair` performs exactly one physical call and owns the
 * repair / retry escalation, so this port must not retry as well. The contract check below the
 * schema envelope is what lets a repairable mistake — an id that was never supplied, a removal
 * proposal without sufficient coverage — be corrected by the repair round instead of failing the
 * unit outright.
 */
const aiPort = {
  async execute(call: AiCall, apiKey: string, context: AiCallContext): Promise<AiCallOutcome> {
    return completeWithRepair(call, apiKey, transport, (value) => {
      switch (call.task) {
        case "task-a":
        case "task-a-consolidate":
          validateTaskA(value, context.knownSourceIds);
          return;
        case "task-b":
        case "task-b-expand":
          validateTaskB(value, context.knownSourceIds);
          return;
        case "task-c":
          validateTaskC(value, context.knownSourceIds, coverageSufficient(context.coverage));
          return;
        default:
          return;
      }
    });
  },
  apiKey(): Promise<string | null> {
    return settings.readApiKeyForTransport();
  },
  async privacyAuthorized(): Promise<boolean> {
    return (await settings.authorizations()).privacy.granted;
  },
  async usageAuthorized(): Promise<boolean> {
    return (await settings.authorizations()).apiUsage.granted;
  }
};

/**
 * The Origins an attachment download has been seen redirecting to, and which the extension is not
 * allowed to read.
 *
 * NTU Learn serves a file through a chain — `ntulearn.ntu.edu.sg/bbcswebdav/…` →
 * `alt-<hash>.blackboard.com/…` → `<host>.prod.files.blackboard.com/…` — and only the first is
 * covered by the default host permission. A hop the extension is not allowed to read comes back
 * with `Access-Control-Allow-Origin: *`, which a credentialed request must refuse, so the file
 * stays unreachable until the user grants that Origin. The manifest declares those Origins as
 * optional host permissions for exactly this. (Gate 3 finding F28.)
 */
const RECORDED_PERMISSION_ORIGINS = "syllab.permissionOrigins";
const APPROVED_ORIGIN = "https://ntulearn.ntu.edu.sg";
/** Wakes the Worker for a run whose retry backoff has elapsed. (Gate 3 finding F31.) */
const PARKED_RESUME_ALARM = "syllab-resume-parked";

async function readRecordedOrigins(): Promise<string[]> {
  const [durable, session] = await Promise.all([
    chrome.storage.local.get(RECORDED_PERMISSION_ORIGINS),
    chrome.storage.session.get(RECORDED_PERMISSION_ORIGINS)
  ]);
  const durableValue: unknown = durable[RECORDED_PERMISSION_ORIGINS];
  const sessionValue: unknown = session[RECORDED_PERMISSION_ORIGINS];
  const origins: string[] = [];
  for (const value of [durableValue, sessionValue]) {
    if (!Array.isArray(value)) continue;
    for (const item of value as unknown[]) {
      if (typeof item === "string") origins.push(item);
    }
  }
  return [...new Set(origins)];
}

/** Remembers an Origin a download redirected to, so the run can ask the user for it. */
async function recordPermissionOrigin(origin: string): Promise<void> {
  const recorded = await readRecordedOrigins();
  if (recorded.includes(origin)) return;
  const next = [...recorded, origin];
  // The permission itself is durable. Remembering which exact redirected Origin it applies to must
  // be durable as well, otherwise an extension reload makes the first read fail again even though
  // Chrome still holds the user's grant.
  await Promise.all([
    chrome.storage.local.set({ [RECORDED_PERMISSION_ORIGINS]: next }),
    chrome.storage.session.set({ [RECORDED_PERMISSION_ORIGINS]: next })
  ]);
}

async function isOriginGranted(origin: string): Promise<boolean> {
  return chrome.permissions.contains({ origins: [`${origin}/*`] });
}

/**
 * The recorded Origins whose permission is still not held.
 *
 * Asking the permission store instead of tracking a decision of our own means a grant clears
 * itself: the moment the user allows the Origin, it stops being missing and the run can go on.
 * A Service Worker that was evicted while the run waited loses nothing, because the answer comes
 * from the browser rather than from memory.
 */
async function missingPermissionOrigins(): Promise<string[]> {
  const missing: string[] = [];
  for (const origin of await readRecordedOrigins()) {
    if (!(await isOriginGranted(origin))) missing.push(origin);
  }
  return missing;
}

/** Which Origins a redirect may be followed into: the Course API, plus every granted one. */
async function approvedRedirectOrigins(): Promise<Set<string>> {
  const approved = new Set<string>([APPROVED_ORIGIN]);
  for (const origin of await readRecordedOrigins()) {
    if (await isOriginGranted(origin)) approved.add(origin);
  }
  return approved;
}

/**
 * `webRequest` sees a redirect that a cross-origin `fetch` cannot: once the browser decides not to
 * answer a request, the response is opaque and its `Location` is unreadable. The event is what
 * makes the destination knowable, and knowing it is the whole point — a permission the user is
 * never told to grant is a file the product can never read.
 */
const redirectListeners = new Map<
  (details: { url: string; redirectUrl?: string }) => void,
  (details: chrome.webRequest.OnBeforeRedirectDetails) => void
>();

const redirectEvent: RedirectEventPort = {
  addListener(listener, filter) {
    const wrapped = (details: chrome.webRequest.OnBeforeRedirectDetails): void => {
      listener({
        url: details.url,
        ...(details.redirectUrl ? { redirectUrl: details.redirectUrl } : {})
      });
    };
    redirectListeners.set(listener, wrapped);
    chrome.webRequest.onBeforeRedirect.addListener(wrapped, { urls: filter.urls }, []);
  },
  removeListener(listener) {
    const wrapped = redirectListeners.get(listener);
    if (!wrapped) return;
    redirectListeners.delete(listener);
    chrome.webRequest.onBeforeRedirect.removeListener(wrapped);
  }
};

async function observeRedirect(requestUrl: string): Promise<string | null> {
  // `fetch` is an operation on the global object, so it is called as one. (Gate 3 finding F1.)
  return observeFirstUnapprovedRedirectOrigin(
    requestUrl,
    await approvedRedirectOrigins(),
    redirectEvent,
    fetch.bind(globalThis)
  );
}

const machine: MachinePort = new BlackboardMachinePort({
  api: (courseId: string, tabId: number | undefined) =>
    new ChromeTabDiscoveryApi(tabId ?? -1, courseId),
  async parseAttachment(source: DiscoveredSource) {
    return parseAttachment(source);
  },
  missingPermissionOrigins,
  observeRedirect,
  recordPermissionOrigin
});

const staging = new RebuildStagingStore(chrome.storage.local);

const engine = new WorkflowEngine({
  store,
  machine,
  ai: aiPort,
  staging,
  clock: { now: () => new Date() },
  buildTaskACalls,
  buildTaskAConsolidationCall,
  buildTaskBCalls,
  buildTaskBExpansionCall,
  buildTaskCCalls,
  planChunks,
  // §5.2: the Scan screen shows the real current stage, so the surfaces have to hear about a stage
  // change while the run is still going. Without this a Scan reported only its own end, and the
  // stage list sat on `Finding course content…` for the whole run. (Gate 3 finding F27.)
  onStage: () => {
    void notifySurfaces();
  }
});

function coverageSufficient(coverage: CoverageFacts | undefined): boolean {
  if (!coverage) return false;
  return (
    coverage.scopeComplete &&
    !coverage.partialCoverage &&
    !coverage.permissionDenied &&
    coverage.failedSourceIds.length === 0
  );
}

async function settingsView() {
  const status = await settings.apiKeyStatus();
  const authorizations = await settings.authorizations();
  return {
    apiKey: status,
    privacy: authorizations.privacy.granted,
    apiUsage: authorizations.apiUsage.granted,
    version: PRODUCT_VERSION
  };
}

const views = new ViewBuilder({
  store,
  staging,
  productVersion: PRODUCT_VERSION,
  settings: settingsView
});

const surfaceRoutes = new Map<string, Route>();

function driveWorkflow(workflowId: string): void {
  void engine
    .run(workflowId)
    .then(async () => {
      // A run that just parked itself needs the same booking a run that was already parked got at
      // boot, or nothing would be awake when its backoff elapses. (Gate 3 finding F31.)
      await scheduleParkedResume();
      await notifySurfaces();
    })
    .catch(() => undefined);
}

/**
 * The NTU Learn tab this extension reads through.
 *
 * The tab the user is looking at wins. A tab opened longer ago can still be running the Content
 * Script from before the extension was updated, and that copy answers with the rules it was built
 * with — an older revision of the API scope refused a read the current one allows, and discovery
 * failed against a site that had not changed at all. The tab in front is the one whose script is
 * current, because it is the one that was loaded most recently.
 */
async function ntuLearnTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ url: `${NTU_LEARN_ORIGIN}*` });
  return (
    tabs.find((tab) => tab.active && tab.id !== undefined) ??
    tabs.find((tab) => tab.id !== undefined)
  );
}

async function resolveScanTab(): Promise<number | undefined> {
  return (await ntuLearnTab())?.id;
}

const handler = new ViewHandler({
  store,
  database,
  staging,
  session: {
    async get(key: string) {
      const result = await chrome.storage.session.get(key);
      return result[key];
    },
    async set(key: string, value: unknown) {
      await chrome.storage.session.set({ [key]: value });
    }
  },
  views,
  engine,
  surfaceRoutes,
  now: () => new Date(),
  driveWorkflow,
  resolveScanTab,
  productVersion: PRODUCT_VERSION,
  setApiKey: (apiKey: string) => settings.saveApiKey(apiKey),
  async validateApiKey() {
    const key = await settings.readApiKeyForTransport();
    if (!key) return "missing";
    try {
      // The models list is a read: a working key costs nothing to confirm.
      await transport.verify(key);
      await settings.markApiKey("valid");
      return "valid";
    } catch (error) {
      // A key DeepSeek refuses is the one failure worth recording as `invalid`; a network problem
      // says nothing about the key, so the verdict stays where it was.
      if (error instanceof DeepSeekFailure && error.code === "AI_AUTH") {
        await settings.markApiKey("invalid");
        return "invalid";
      }
      return "missing";
    }
  },
  setAuthorization: (kind, granted) => settings.setAuthorization(kind, granted),
  async exportBackup(payload: string, fileName: string) {
    await download(payload, fileName, "application/json");
  },
  async exportCalendar(payload: string, fileName: string) {
    await download(payload, fileName, "text/calendar");
  }
});

async function download(payload: string, fileName: string, mimeType: string): Promise<void> {
  const url = `data:${mimeType};charset=utf-8,${encodeURIComponent(payload)}`;
  const downloadId = await chrome.downloads.download({ url, filename: fileName, saveAs: true });
  // The id Chrome gave the download. What became of it is read from `chrome.downloads` by whoever
  // is watching the run, not awaited here: a product action must not sit waiting on a save dialog,
  // and a QA build may observe the product but not change it.
  qaTrace("qa.download-requested", { fileName, downloadId });
}

async function notifySurfaces(): Promise<void> {
  await chrome.storage.local.set({ "syllab.revision": randomId("rev") });
}

/**
 * The Offscreen Document that hosts the parser Worker, created on first use.
 *
 * A Service Worker has no DOM and cannot start a Worker, so the parse itself has to happen in a
 * document. The v0.1.0 runner created this document; the v0.2.0 rewrite kept the message and lost
 * the creation, so `PARSE_ATTACHMENT` was answered by nobody and every attachment failed in
 * milliseconds with `PARSER_RUNTIME_FAILED` — including the Course Guide, the lecture slides and
 * the exam paper, which are where the Assessments actually are. (Gate 3 finding F28.)
 */
let creatingOffscreen: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  const url = chrome.runtime.getURL("offscreen.html");
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [url]
  });
  if (contexts.length > 0) return;
  creatingOffscreen ??= chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: "Parse one fetched course document per isolated worker"
  });
  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

async function parseAttachment(source: DiscoveredSource): Promise<{
  status: "ok" | "failed" | "unsupported" | "permission-denied";
  text: string;
  structure: string[];
  errorCode?: string;
}> {
  if (!source.requestUrl) {
    return { status: "failed", text: "", structure: [], errorCode: "MISSING_REQUEST_URL" };
  }
  try {
    await ensureOffscreenDocument();
    const response: unknown = await chrome.runtime.sendMessage({
      contractVersion: CONTRACT_VERSION,
      type: "PARSE_ATTACHMENT",
      sourceId: source.sourceId,
      requestUrl: source.requestUrl
    });
    if (!isRecord(response) || response.ok !== true || !isRecord(response.result)) {
      return { status: "failed", text: "", structure: [], errorCode: "PARSER_RUNTIME_FAILED" };
    }
    const result = response.result as unknown as ParseResult;
    const text = result.units.map((unit) => unit.text).join("\n");
    const structure = result.units.map((unit) => unit.locator);
    if (result.status === "parsed" || result.status === "partial") {
      return { status: "ok", text, structure };
    }
    if (result.status === "unsupported") {
      return {
        status: "unsupported",
        text: "",
        structure,
        ...(result.diagnosticsCode ? { errorCode: result.diagnosticsCode } : {})
      };
    }
    return {
      status: "failed",
      text: "",
      structure,
      ...(result.diagnosticsCode ? { errorCode: result.diagnosticsCode } : {})
    };
  } catch {
    return { status: "failed", text: "", structure: [], errorCode: "PARSER_RUNTIME_FAILED" };
  }
}

async function initialize(): Promise<void> {
  const current = await chrome.storage.local.get(SCHEMA_VERSION_STORAGE);
  if (current[SCHEMA_VERSION_STORAGE] === undefined) {
    await chrome.storage.local.set({ [SCHEMA_VERSION_STORAGE]: 2 });
  }
  await store.initialize();
}

const NTU_LEARN_ORIGIN = "https://ntulearn.ntu.edu.sg/";

/**
 * Semester / Curriculum Course discovery (PRD §5.1.5): Curriculum Courses enter the current
 * Semester on their own, and discovery never starts a Scan — a Course it creates arrives Not
 * Established, waiting for the user to ask for it.
 *
 * The read runs against whatever NTU Learn tab asked for it, in that tab's own session. A tab
 * without a live Content Script (an extension reload, a page still loading) and a signed-out
 * session both land in the same place: nothing to discover this time, and the next visit tries
 * again. Discovery is never allowed to fail a user-visible action.
 */
let discovering: Promise<void> | null = null;
let discoveringSince = 0;
/** A read that never settles must not wedge discovery for the life of the worker. */
const DISCOVERY_STALE_MS = 60_000;

function discoverCourses(): Promise<void> {
  if (discovering !== null && Date.now() - discoveringSince < DISCOVERY_STALE_MS) {
    return discovering;
  }
  discoveringSince = Date.now();
  discovering = (async () => {
    qaTrace("qa.discovery-started", {});
    try {
      const tab = await ntuLearnTab();
      if (tab?.id === undefined) {
        qaTrace("qa.discovery-skipped", { reason: "no NTU Learn tab" });
        return;
      }
      const discovery = await readDiscovery(new ChromeEnrollmentApi(tab.id));
      const applied = await applyDiscovery(store, discovery, new Date());
      qaTrace("qa.enrollment", {
        terms: applied.semesters,
        courses: applied.courses,
        currentSemesterId: applied.currentSemesterId
      });
      if (applied.semesters > 0) await notifySurfaces();
    } catch (error) {
      // Signed out, no Content Script, or a Blackboard that answered differently. The product
      // still works; the Semester Dashboard simply has nothing new to show.
      qaTrace("qa.enrollment-failed", {
        reason: error instanceof Error ? error.message : "unknown"
      });
    } finally {
      discovering = null;
    }
  })();
  return discovering;
}

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url?.startsWith(NTU_LEARN_ORIGIN)) return;
  void initialize()
    .then(() => discoverCourses())
    // A hook that fails silently is a hook nobody can debug: the page was loaded, discovery was
    // meant to run, and the only way to learn that it did not is to be told.
    .catch((error: unknown) => {
      qaTrace("qa.discovery-skipped", {
        reason: error instanceof Error ? error.message : "initialize failed"
      });
    });
});

chrome.runtime.onInstalled.addListener(() => {
  void initialize();
});

chrome.runtime.onStartup.addListener(() => {
  void initialize().then(() => resumeInterrupted());
});

declare const __SYLLAB_E2E_FIXTURES__: boolean;

/**
 * The acceptance bridge. Registered only in an acceptance build.
 *
 * The `if` is a top-level statement rather than a condition inside the listener so that a release
 * build does not contain the bridge at all. Written as `if (__SYLLAB_E2E_FIXTURES__ && …)` inside
 * the listener, the release bundle shipped as `if (false) { … }` with the whole bridge body still
 * inside it — unreachable, but present in every installed extension.
 */
if (__SYLLAB_E2E_FIXTURES__) {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isE2eMessage(message)) return undefined;
    void (async () => {
      try {
        await initialize();
        if (message.type === "E2E_BACKUP") {
          sendResponse(await e2eBackup(store, new Date().toISOString()));
          return;
        }
        if (message.type === "E2E_OPEN") {
          // Routed through the real handler, so acceptance navigates exactly the way a click does
          // — including the route bookkeeping that survives a worker restart.
          await handler.handle({
            contract: V2_MESSAGE_CONTRACT,
            type: "OPEN_SCREEN",
            surface: message.surface,
            // Typed as a Screen id across the bridge, so this needs no cast.
            screen: message.screen,
            ...(message.courseId ? { courseId: message.courseId } : {})
          });
          sendResponse({ ok: true, reviewItemIds: [], changeIds: [] });
          return;
        }
        sendResponse(await handleE2e(store, message));
      } catch {
        sendResponse({ ok: false, reviewItemIds: [], changeIds: [], errorCode: "E2E_FAILED" });
      }
    })();
    return true;
  });
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isViewMessage(message)) return undefined;
  void (async () => {
    let response: ViewResponse;
    try {
      await initialize();
      response = await handler.handle(message);
    } catch {
      response = {
        ok: false,
        error: { code: "STORAGE_SCHEMA", copy: "Syllab could not read its local data." }
      };
    }
    sendResponse(response);
  })();
  return true;
});

chrome.action.onClicked.addListener((tab) => {
  // Outside NTU Learn there is no Course and no semester to be about, so the toolbar opens the
  // product's own page. That is the only case that does, and it is the only case that does not
  // need the click's user activation.
  if (tab.id === undefined || tab.url === undefined || !tab.url.startsWith(NTU_LEARN_ORIGIN)) {
    void chrome.tabs.create({ url: chrome.runtime.getURL("app.html") });
    return;
  }

  // `chrome.sidePanel.open` spends the click's user activation, and awaiting anything first can
  // spend it instead — the call is then refused and the click does nothing at all, which is exactly
  // how this behaved. So it comes first, before any await, and everything else follows it.
  const opened = chrome.sidePanel.open({ windowId: tab.windowId });

  void (async () => {
    try {
      await opened;
    } catch (error) {
      // A refused open is not silence. Say so, because the alternative is a click that appears to
      // do nothing and a developer with nothing to go on.
      qaTrace("qa.side-panel-failed", {
        reason: error instanceof Error ? error.message : "side panel refused"
      });
      await chrome.tabs.create({ url: chrome.runtime.getURL("app.html") });
      return;
    }

    await initialize();
    // The toolbar click is the one moment the user has told us they are looking at NTU Learn, so
    // it is where a discovery that the page-load hook missed is picked up.
    void discoverCourses();

    // On NTU Learn the Side Panel is where the answer goes, whether or not this particular page is
    // a Course. The Side Panel already has a screen for "no Course in front of you" — its semester
    // course list — so a page that is not a Course is a screen it knows, not a reason to throw the
    // user into a full-page tab they did not ask for. (Product Owner direction; this supersedes the
    // Interaction Spec §2.2 rule that sent a context-less click to the Full-page dashboard. Recorded
    // in DIRECTION_ADJUSTMENTS §2.25.)
    const courseId = await currentCourseContext(tab);
    // Recorded per tab so the Side Panel lands on the Course the user is actually looking at.
    const route = courseId
      ? { surface: "side-panel" as const, screen: "CRS-02" as const, courseId }
      : { surface: "side-panel" as const, screen: "SEM-02" as const };
    surfaceRoutes.set("side-panel:default", route);
    surfaceRoutes.set(`side-panel:${String(tab.id)}`, route);
    await chrome.storage.session.set({
      "syllab.surfaceRoutes": Object.fromEntries(surfaceRoutes)
    });
    // The panel is already on screen by now and read the route before it was set; this is what
    // tells it to read again.
    await notifySurfaces();
    qaTrace("qa.side-panel-opened", { route: route.screen });
  })();
});

async function currentCourseContext(tab: chrome.tabs.Tab): Promise<string | null> {
  if (tab.id === undefined || !tab.url?.startsWith(NTU_LEARN_ORIGIN)) return null;
  try {
    const response: unknown = await chrome.tabs.sendMessage(tab.id, {
      contractVersion: CONTRACT_VERSION,
      type: "GET_COURSE_CONTEXT"
    });
    if (!isRecord(response) || !isRecord(response.context)) return null;
    const courseId = response.context.courseId;
    return typeof courseId === "string" ? courseId : null;
  } catch {
    // No live content script (usually after an extension reload) — fall through to the full page.
    return null;
  }
}

/**
 * Picks up runs that stopped without finishing — interrupted by an eviction, or parked after a
 * retryable failure whose backoff has since elapsed.
 */
async function resumeInterrupted(): Promise<void> {
  const now = new Date();
  for (const workflow of await store.listWorkflows()) {
    if (retryDue(workflow, now)) driveWorkflow(workflow.workflowId);
  }
  await scheduleParkedResume();
}

/**
 * Books the alarm for the moment the earliest parked run becomes due.
 *
 * A Service Worker is not awake for a timeout and is not awake at an arbitrary future moment: an
 * alarm is the only thing that brings it back. A run that fails recoverably parks as `saved` on a
 * five-minute, thirty-minute, two-hour schedule, and until this existed the schedule was counted
 * but never kept — the run waited for the next browser start while the screen said
 * `Progress saved.` with nothing to press. (Gate 3 finding F31.)
 */
async function scheduleParkedResume(): Promise<void> {
  const now = Date.now();
  let nextDue: number | null = null;
  for (const workflow of await store.listWorkflows()) {
    const dueAt = retryDueAt(workflow);
    if (dueAt === null || dueAt <= now) continue;
    if (nextDue === null || dueAt < nextDue) nextDue = dueAt;
  }
  await chrome.alarms.clear(PARKED_RESUME_ALARM);
  if (nextDue !== null) await chrome.alarms.create(PARKED_RESUME_ALARM, { when: nextDue });
}

// The alarm is the only thing that wakes the Worker for maintenance; creating it is idempotent.
void chrome.alarms.create("syllab-opportunity-check", { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PARKED_RESUME_ALARM) {
    void resumeInterrupted();
    return;
  }
  if (alarm.name !== "syllab-opportunity-check") return;
  void opportunityCheck();
});

/** Opportunity Checking: local machine comparison first; a paid call only after a difference. */
async function opportunityCheck(): Promise<void> {
  const courses = (await store.readCourses()).filter((course) => course.established);
  const candidates: OpportunityCandidate[] = courses.map((course: CourseRecord) => ({
    courseId: course.courseId,
    currentSemester: true,
    established: course.established,
    schedule: {
      ...(course.lastSuccessfulCheckAt
        ? { lastSuccessfulCheckAt: course.lastSuccessfulCheckAt }
        : {}),
      ...(course.nextCheckAt ? { nextAttemptAt: course.nextCheckAt } : {}),
      unchangedStreak: course.unchangedStreak ?? 0,
      consecutiveFailures: course.consecutiveCheckFailures,
      currentSemester: true,
      established: course.established
    }
  }));
  const due = checkSchedule(candidates, new Date());
  const course = courses.find((item) => item.courseId === due[0]);
  if (!course) return;
  const workflow = await startMaintenanceCheck(course, engine, resolveScanTab);
  if (!workflow) return;
  driveWorkflow(workflow.workflowId);
}

// A service worker is evicted and restarted many times inside one browser session, and a run that
// was interrupted must not need the whole browser to be restarted to continue. `retryDue` is what
// keeps this from becoming a retry on every restart.
void initialize()
  .then(() => resumeInterrupted())
  .catch(() => undefined);

export { DEEPSEEK_KEY_STORAGE };
export type { FetchedSource };
export type { Surface };
export { V2_MESSAGE_CONTRACT };
