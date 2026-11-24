import { DIRECT_COURSE_SCHEMA } from "../v2/direct-course";
import { SELECTIVE_COURSE_SCHEMA } from "../v2/selective-course";
import { AI_SCHEMAS } from "../v2/contract-registry";
import { authorizeB2Compensation } from "../v2/architecture-compensation";
import type { Session } from "../v2/architecture-session";
import { GROUNDED_B_SCHEMA } from "../v2/task-b-grounding";
import {
  teachingInput,
  teachingCall,
  validateTeachingResult,
  type TeachingInput
} from "../v2/teaching-deferral";
import {
  exhaustiveRoutingCall,
  routingInput,
  validateExhaustiveRouting,
  routingSelectedRefs,
  routingSourceView,
  type ExhaustiveRoutingResult,
  type RoutingInput
} from "../v2/exhaustive-routing";
import { activeProviderProgress } from "../v2/deepseek";
import { type AuditRound, planRetrievalWithAudit } from "../v2/retrieval-completion";
import { validateCoverageAudit, type CoverageAuditInput } from "../v2/coverage-audit";
import { stableDigest } from "../v2/chunking";
import { stableStringify } from "../v2/crypto";
import {
  planRetrieval,
  nativeFields,
  contentIndex,
  expandRef,
  validatePlanner,
  type CourseContentIndex,
  type NativeExpansion
} from "../v2/retrieval-planner";
import {
  sourceProfile,
  triageBatches,
  validateRouting,
  isCoarseResult,
  type RoutingResult,
  type CoarseResult,
  type TriageResult,
  type SourceProfile
} from "../v2/source-triage";
import { withActiveWorker } from "../v2/worker-lifecycle";
import {
  assertKnownIdentityObjects,
  assertNoProductInstructions,
  assertSuppliedEvidence
} from "../v2/ai-pipeline";
import type { ParseResult, ParsedTextUnit } from "../parser/domain";
import { activityHub } from "../v2/activity";
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
import {
  validateTaskAVisualRequests,
  validateTaskA,
  validateTaskB,
  validateTaskC
} from "../v2/ai-contracts";
import type { AiCallContext } from "../v2/workflow";
import type { FetchedSource, MachinePort } from "../v2/workflow";
import { WorkflowEngine, PERMISSION_RECOVERY_REVISION, retryDue, retryDueAt } from "../v2/workflow";
import { ViewHandler } from "../v2/handler";
import { LocalDatabase } from "../v2/storage";
import { LocalStore } from "../v2/store";
import { ViewBuilder } from "../v2/view";
import { applyDiscovery, readDiscovery } from "../v2/enrollment";
import { installQaTelemetryReceiver, qaTrace } from "../v2/qa-telemetry";
import { SettingsRepository, DEEPSEEK_KEY_STORAGE } from "../v2/settings";
import { PRODUCT_VERSION, SCHEMA_VERSION_STORAGE } from "../v2/product";
import { RebuildStagingStore } from "../v2/staging";
import type { CourseRecord, CoverageFacts } from "../v2/domain";
import { randomId } from "../v2/crypto";
import { automaticCheckPermitted, startMaintenanceCheck } from "../v2/opportunity";
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
declare const __SYLLAB_QA_RECOVERY_HOLD__: boolean;

/**
 * The provider boundary. `completeWithRepair` performs exactly one physical call and owns the
 * repair / retry escalation, so this port must not retry as well. The contract check below the
 * schema envelope is what lets a repairable mistake — an id that was never supplied, a removal
 * proposal without sufficient coverage — be corrected by the repair round instead of failing the
 * unit outright.
 */
const qaPlannerFailedValues = new Map<string, unknown>();
const aiPort = {
  async execute(call: AiCall, apiKey: string, context: AiCallContext): Promise<AiCallOutcome> {
    if (__SYLLAB_QA_RECOVERY_HOLD__) throw new Error("QA_RECOVERY_DISPATCH_HELD");
    if (__SYLLAB_E2E_FIXTURES__) {
      const gate = await store.readMetadataValue("qa.compensation-039");
      if (isRecord(gate) && call.idempotencyKey.includes(String(gate.workflowId))) {
        await database.write(["appMetadata"], async (tx) => {
          const row = await tx.get<{
            key: string;
            value: { allowed: string[]; dispatched: string[] };
          }>("appMetadata", "qa.compensation-039");
          if (
            !row ||
            !row.value.allowed.includes(call.idempotencyKey) ||
            row.value.dispatched.includes(call.idempotencyKey)
          )
            throw new Error("COMPENSATION_DISPATCH_NOT_AUTHORIZED");
          row.value.dispatched.push(call.idempotencyKey);
          await tx.put("appMetadata", row);
        });
      }
    }
    return completeWithRepair(call, apiKey, transport, (value) => {
      if (
        call.schemaVersion === DIRECT_COURSE_SCHEMA ||
        call.schemaVersion === SELECTIVE_COURSE_SCHEMA ||
        call.schemaVersion === AI_SCHEMAS.product
      ) {
        if (
          !isRecord(value) ||
          (value.schema !== call.schemaVersion &&
            !(
              (call.schemaVersion === SELECTIVE_COURSE_SCHEMA ||
                call.schemaVersion === AI_SCHEMAS.product) &&
              value.schema === undefined
            ))
        )
          throw Error("DIRECT_ENVELOPE_INVALID");
        return;
      }
      if (call.schemaVersion === AI_SCHEMAS.session) {
        if (!isRecord(value) || value.schema !== call.schemaVersion)
          throw Error("SESSION_ENVELOPE_INVALID");
        return;
      }
      if (call.physicalWorkContinuation) {
        if (!isRecord(value) || value.schema !== AI_SCHEMAS.physical || !Array.isArray(value.items))
          throw Error("PHYSICAL_ENVELOPE_INVALID");
        return; // Each independent unit validated and durably checkpointed by the workflow.
      }
      if (call.task === "teaching-classification") {
        validateTeachingResult(value, JSON.parse(call.user) as TeachingInput);
        return;
      }
      if (call.task === "exhaustive-routing") {
        try {
          validateExhaustiveRouting(value, JSON.parse(call.user) as RoutingInput);
        } catch (error) {
          if (__SYLLAB_E2E_FIXTURES__)
            qaPlannerFailedValues.set(call.idempotencyKey, structuredClone(value));
          throw error;
        }
        return;
      }
      if (__SYLLAB_E2E_FIXTURES__ && call.task === "retrieval-planner") {
        const input = JSON.parse(call.user) as {
          index: CourseContentIndex;
          expanded: NativeExpansion[];
          previousSelectedEvidenceRefs?: string[];
        };
        try {
          validatePlanner(value, input.index, input.expanded, input.previousSelectedEvidenceRefs);
        } catch (error) {
          qaPlannerFailedValues.set(call.idempotencyKey, structuredClone(value));
          throw error;
        }
        return;
      }
      if (__SYLLAB_E2E_FIXTURES__ && call.task === "coverage-audit") {
        try {
          validateCoverageAudit(value, JSON.parse(call.user) as CoverageAuditInput);
        } catch (error) {
          qaPlannerFailedValues.set(call.idempotencyKey, structuredClone(value));
          throw error;
        }
        return;
      }
      if (__SYLLAB_E2E_FIXTURES__ && call.task === "source-triage") {
        const input = JSON.parse(call.user) as { profiles: SourceProfile[] };
        validateRouting(value, input.profiles);
        return;
      }
      if (call.schemaVersion === GROUNDED_B_SCHEMA) {
        if (!isRecord(value) || value.schema !== GROUNDED_B_SCHEMA || !Array.isArray(value.items))
          throw new Error("B_ENVELOPE_SHAPE");
        return; // Item/provenance failures are durably isolated by WorkflowEngine.
      }
      assertNoProductInstructions(value);
      if (call.task.startsWith("task-b") || call.task === "task-c")
        assertSuppliedEvidence(value, context.evidence ?? []);
      switch (call.task) {
        case "task-a":
        case "task-a-consolidate":
          validateTaskAVisualRequests(
            validateTaskA(value, context.knownSourceIds),
            context.allowedVisualRequestRefs ?? new Set()
          );
          return;
        case "task-b":
        case "task-b-expand":
          validateTaskB(value, context.knownSourceIds);
          if (context.knownObjectIds) assertKnownIdentityObjects(value, context.knownObjectIds);
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

let permissionOriginWriteQueue: Promise<void> = Promise.resolve();

/** Remembers an Origin a download redirected to, so the run can ask the user for it. */
function recordPermissionOrigin(origin: string): Promise<void> {
  const run = permissionOriginWriteQueue.then(async () => {
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
  });
  permissionOriginWriteQueue = run.catch(() => undefined);
  return run;
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
  async visualAttachment(source, stored) {
    const unresolved =
      stored.parsed?.units?.filter((unit) => unit.partial).map((unit) => unit.locator) ?? [];
    if (!source.requestUrl || !stored.parsed?.contentHash) return { parts: [], unresolved };
    let response: unknown;
    try {
      await ensureOffscreenDocument();
      response = await chrome.runtime.sendMessage({
        contractVersion: CONTRACT_VERSION,
        type: "VISUAL_ATTACHMENT",
        sourceId: source.sourceId,
        requestUrl: source.requestUrl,
        contentHash: stored.parsed.contentHash,
        units: stored.parsed.units
      });
    } catch {
      return { parts: [], unresolved };
    }
    if (
      !isRecord(response) ||
      response.ok !== true ||
      !Array.isArray(response.parts) ||
      !Array.isArray(response.unresolved)
    )
      return { parts: [], unresolved };
    return {
      parts: response.parts.filter(
        (part: unknown): part is { locator: string; dataUrl: string } =>
          isRecord(part) &&
          typeof part.locator === "string" &&
          typeof part.dataUrl === "string" &&
          /^data:image\/png;base64,/.test(part.dataUrl)
      ),
      unresolved: response.unresolved.filter(
        (locator: unknown): locator is string => typeof locator === "string"
      )
    };
  },
  missingPermissionOrigins,
  observeRedirect,
  recordPermissionOrigin
});

const staging = new RebuildStagingStore(chrome.storage.local);

const engine = new WorkflowEngine({
  allowQaAcceptance: __SYLLAB_E2E_FIXTURES__,
  physicalBatching: true,
  newArchitecture: true,
  directCourse: true,
  selectiveCourse: true,
  projectedCourse: true,
  ...(__SYLLAB_E2E_FIXTURES__
    ? {
        qaValidateRouting: async (workflowId: string, result: ExhaustiveRoutingResult) => {
          const oracle = (await store.readMetadata())[`qa.acceptance:${workflowId}`];
          if (!isRecord(oracle) || !Array.isArray(oracle.requiredRefs)) return false;
          const required = new Set(oracle.requiredRefs as string[]);
          const knownRemoved: unknown[] = [];
          const selectedRefs = routingSelectedRefs(result);
          const missing = [...required].filter((ref) => !selectedRefs.includes(ref));
          const pass = !knownRemoved.length && !missing.length;
          qaTrace("qa.acceptance-recall", {
            workflowId,
            status: "ROUTED",
            required: required.size,
            missing: missing.length,
            knownRemoved: knownRemoved.length,
            pass
          });
          return pass;
        }
      }
    : {}),
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
  onStage: (workflow) => {
    qaTrace("qa.workflow-stage", {
      workflowId: workflow.workflowId,
      phase: workflow.phase,
      state: workflow.state,
      attempt: workflow.attempt
    });
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

installQaTelemetryReceiver();

function driveWorkflow(workflowId: string): void {
  if (__SYLLAB_QA_RECOVERY_HOLD__) return;
  void withActiveWorker(
    () => engine.run(workflowId),
    () => chrome.runtime.getPlatformInfo(),
    () => qaTrace("qa.worker-lifecycle-failure", { reason: "extension-api-heartbeat" })
  )
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
  status: "ok" | "partial" | "failed" | "unsupported" | "permission-denied";
  text: string;
  structure: string[];
  units?: ParsedTextUnit[];
  contentHash?: string;
  canonicalization?: ParseResult["canonicalization"];
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
      const errorCode =
        isRecord(response) && typeof response.errorCode === "string" && response.errorCode
          ? response.errorCode
          : "PARSER_RUNTIME_FAILED";
      return { status: "failed", text: "", structure: [], errorCode };
    }
    const result = response.result as unknown as ParseResult;
    const text = result.units.map((unit) => `${unit.locator}\n${unit.text}`).join("\n\n");
    const structure = result.units.map((unit) => unit.locator);
    if (result.status === "parsed" || result.status === "partial") {
      return {
        status: result.status === "parsed" ? "ok" : "partial",
        text,
        structure,
        units: result.units,
        ...(result.contentHash ? { contentHash: result.contentHash } : {}),
        ...(result.canonicalization ? { canonicalization: result.canonicalization } : {})
      };
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
  if (__SYLLAB_QA_RECOVERY_HOLD__) return;
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

function discoverCourses(): Promise<void> {
  if (__SYLLAB_QA_RECOVERY_HOLD__) return Promise.resolve();
  if (discovering !== null) {
    return discovering;
  }
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
    if (!isRecord(message) || message.type !== "E2E_COMPENSATE_B2_039") return;
    void (async () => {
      try {
        if (!__SYLLAB_QA_RECOVERY_HOLD__ || activeProviderProgress().length)
          throw Error("COMPENSATION_REQUIRES_HELD_QUIESCENT_WORKER");
        const workflowId = "wf_ffd850a9f186233026338f6f";
        await database.write(["appMetadata", "workflows", "aiRuns"], async (tx) => {
          const prior = await tx.get("appMetadata", "qa.compensation-039");
          if (prior) return;
          const workflow = await tx.get<{ workflowId: string; phase: string }>(
            "workflows",
            workflowId
          );
          if (workflow?.phase !== "task-b") throw Error("COMPENSATION_PHASE");
          const rows = await tx.getAll<{
            key: string;
            value: { workflowId?: string; ledger?: Session };
          }>("appMetadata");
          const targets = rows.filter(
            (r) =>
              r.key.startsWith("architecture-session:") &&
              r.value.workflowId === workflowId &&
              r.value.ledger?.stage === "B2" &&
              ["dispatched", "paid-unverified"].includes(
                r.value.ledger.requests.at(-1)?.state ?? ""
              )
          );
          if (targets.length !== 2) throw Error("COMPENSATION_EXACT_TWO_REQUIRED");
          const runs = await tx.getAll<{ idempotencyKey: string }>("aiRuns");
          const allowed: string[] = [];
          for (const row of targets) {
            const ledger = row.value.ledger as Session;
            if (runs.some((r) => r.idempotencyKey === ledger.requests.at(-1)?.id))
              throw Error("COMPENSATION_RESULT_ALREADY_SAVED");
            allowed.push(authorizeB2Compensation(ledger, "P2E-039").id);
            await tx.put("appMetadata", row);
          }
          await tx.put("appMetadata", {
            key: "qa.compensation-039",
            value: { workflowId, authorization: "P2E-039", allowed, dispatched: [] }
          });
        });
        sendResponse({ ok: true, authorizedCompensations: 2 });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "COMPENSATION_FAILED"
        });
      }
    })();
    return true;
  });
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isRecord(message) && message.type === "E2E_PERMISSION_RECOVERY_REVISION") {
      sendResponse({ ok: true, revision: PERMISSION_RECOVERY_REVISION });
    }
  });
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isRecord(message) && message.type === "E2E_RECOVERY_HOLD")
      sendResponse({ ok: true, held: __SYLLAB_QA_RECOVERY_HOLD__ });
  });
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (
      !isRecord(message) ||
      message.type !== "E2E_EXHAUSTIVE_ROUTING" ||
      typeof message.courseId !== "string"
    )
      return;
    const courseId = message.courseId,
      evaluationId = randomId("routing_eval");
    void withActiveWorker(
      async () => {
        const startedAt = new Date().toISOString();
        let call: AiCall | undefined;
        let routingSnapshot: RoutingInput | undefined;
        try {
          await initialize();
          if (!(await aiPort.privacyAuthorized()) || !(await aiPort.usageAuthorized()))
            throw new Error("AUTHORIZATION_REQUIRED");
          const apiKey = await aiPort.apiKey();
          if (!apiKey) throw new Error("API_KEY_REQUIRED");
          const sources = structuredClone((await store.readAllSourceStates(courseId)).sources);
          const index = contentIndex(sources),
            input = routingInput(index);
          routingSnapshot = input;
          call = exhaustiveRoutingCall(input, evaluationId);
          await store.setMetadata({
            [evaluationId]: {
              state: "working",
              courseId,
              startedAt,
              index,
              totalEntries: input.entryRefs.length
            }
          });
          sendResponse({ ok: true, evaluationId });
          const outcome = await aiPort.execute(call, apiKey, {
            knownSourceIds: new Set(index.sources.map((s) => s.sourceId))
          });
          const result = validateExhaustiveRouting(outcome.value, input);
          const selected = routingSelectedRefs(result);
          const views = sources
            .map((s) => routingSourceView(s, index, result))
            .filter((v) => v !== null);
          const nativeCharacters = views.reduce(
            (n, v) => n + (v.processing.parsed?.text.length ?? 0),
            0
          );
          await store.recordAiRun({
            aiRunId: randomId("airun"),
            workflowId: evaluationId,
            courseId,
            task: "exhaustive-routing",
            schemaVersion: call.schemaVersion,
            promptVersion: call.promptVersion,
            idempotencyKey: call.idempotencyKey,
            ...(call.invocationFingerprint
              ? { invocationFingerprint: call.invocationFingerprint }
              : {}),
            status: "succeeded",
            attempt: 1,
            payload: result,
            durationMs: Date.now() - Date.parse(startedAt),
            ...(outcome.inputTokens === undefined ? {} : { inputTokens: outcome.inputTokens }),
            ...(outcome.outputTokens === undefined ? {} : { outputTokens: outcome.outputTokens }),
            ...(outcome.reasoningTokens === undefined
              ? {}
              : { reasoningTokens: outcome.reasoningTokens }),
            recordedAt: new Date().toISOString()
          });
          await store.setMetadata({
            [evaluationId]: {
              state: "completed",
              courseId,
              startedAt,
              endedAt: new Date().toISOString(),
              index,
              result,
              totalEntries: input.entryRefs.length,
              selectedRefs: selected,
              projectedSourcePackages: views.length,
              projectedNativeCharacters: nativeCharacters,
              projectedPartialUnits: index.units.filter(
                (u) => selected.includes(u[0]) && u[7].length
              ).length,
              requestBytes: new TextEncoder().encode(call.user).byteLength
            }
          });
        } catch (error) {
          await store.setMetadata({
            [evaluationId]: {
              state: "failed",
              courseId,
              startedAt,
              endedAt: new Date().toISOString(),
              errorCode: error instanceof Error ? error.message : "ROUTING_EVALUATION_FAILED",
              ...(routingSnapshot
                ? { index: routingSnapshot.index, totalEntries: routingSnapshot.entryRefs.length }
                : {}),
              ...(call
                ? {
                    rejectedValue: qaPlannerFailedValues.get(call.idempotencyKey),
                    requestBytes: new TextEncoder().encode(call.user).byteLength
                  }
                : {})
            }
          });
          sendResponse({ ok: false, evaluationId });
        }
      },
      () => chrome.runtime.getPlatformInfo(),
      () =>
        qaTrace("qa.worker-lifecycle", { scopeId: evaluationId, errorCode: "KEEPALIVE_API_FAILED" })
    );
    return true;
  });
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (
      !isRecord(message) ||
      message.type !== "E2E_DA006_CONTINUE" ||
      typeof message.workflowId !== "string"
    )
      return undefined;
    void (async () => {
      try {
        await initialize();
        if (activeProviderProgress().length) throw new Error("PROVIDER_NOT_QUIESCENT");
        const workflow = await engine.continueTaskAPartial(message.workflowId as string, {
          mainWaves: null,
          recoveryWaves: 1,
          paidRecoveryInvocations: 10
        });
        sendResponse({
          ok: true,
          workflowId: workflow.workflowId,
          phase: workflow.phase,
          coverage: workflow.taskASemanticCoverage
        });
        driveWorkflow(workflow.workflowId);
      } catch (error) {
        sendResponse({
          ok: false,
          errorCode: error instanceof Error ? error.message : "PARTIAL_CONTINUATION_FAILED"
        });
      }
    })();
    return true;
  });
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (
      !isRecord(message) ||
      (message.type !== "E2E_TASK_B_SAFE_RECOVERY_027" &&
        message.type !== "E2E_TASK_B_VALIDATION_028" &&
        message.type !== "E2E_TASK_B_RECOVERY_021" &&
        message.type !== "E2E_TASK_B_CHECKPOINT_RESUME") ||
      typeof message.workflowId !== "string"
    )
      return undefined;
    void (async () => {
      try {
        await initialize();
        if (activeProviderProgress().length) throw new Error("PROVIDER_NOT_QUIESCENT");
        const workflow =
          message.type === "E2E_TASK_B_CHECKPOINT_RESUME"
            ? await engine.resumeTaskBCheckpoint(message.workflowId as string)
            : message.type === "E2E_TASK_B_VALIDATION_028"
              ? await engine.authorizeTaskBValidation(message.workflowId as string)
              : message.type === "E2E_TASK_B_SAFE_RECOVERY_027"
                ? await engine.authorizeNormalTaskBRecovery(message.workflowId as string)
                : await engine.authorizeTaskBRecovery(message.workflowId as string);
        sendResponse({ ok: true, workflowId: workflow.workflowId });
        driveWorkflow(workflow.workflowId);
      } catch (error) {
        sendResponse({
          ok: false,
          errorCode: error instanceof Error ? error.message : "B_RECOVERY_FAILED"
        });
      }
    })();
    return true;
  });
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isRecord(message) && message.type === "E2E_PROVIDER_PROGRESS") {
      sendResponse({ ok: true, active: activeProviderProgress() });
    }
  });
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (
      !isRecord(message) ||
      message.type !== "E2E_CLEAN_REBUILD" ||
      typeof message.courseId !== "string"
    )
      return undefined;
    void (async () => {
      try {
        await initialize();
        const course = await store.readCourse(message.courseId as string);
        if (!course) throw new Error("COURSE_NOT_FOUND");
        if (message.preflight === true) {
          const workflows = await store.listWorkflows();
          sendResponse({
            ok: true,
            acceptanceContext: "same-workflow-only",
            qaOnly: true,
            activeWorkflowCount: workflows.filter(
              (w) =>
                w.courseId === course.courseId &&
                ["working", "queued", "saved", "waiting"].includes(w.state)
            ).length
          });
          return;
        }
        const tabId = await resolveScanTab();
        if (tabId === undefined) throw new Error("NTU_TAB_REQUIRED");
        if (
          message.acceptancePolicy !== "da005-015" &&
          message.acceptancePolicy !== "architecture-034" &&
          (!Array.isArray(message.acceptanceRefs) ||
            !message.acceptanceRefs.length ||
            message.acceptanceRefs.some((ref) => typeof ref !== "string"))
        )
          throw new Error("QA_ACCEPTANCE_REFS_REQUIRED");
        const requestedKind = message.workflowKind ?? "rebuild";
        if (requestedKind !== "initial" && requestedKind !== "rebuild")
          throw new Error("QA_WORKFLOW_KIND_INVALID");
        if (requestedKind === "initial" && course.established)
          throw new Error("QA_INITIAL_REQUIRES_UNESTABLISHED_COURSE");
        const workflow = await engine.start(course, requestedKind, {
          tabId,
          qaSemanticClean: true
        });
        await store.setMetadata({
          [`qa.acceptance:${workflow.workflowId}`]: {
            requiredRefs:
              message.acceptancePolicy === "da005-015" ||
              message.acceptancePolicy === "architecture-034"
                ? []
                : message.acceptanceRefs,
            policy: message.acceptancePolicy
          }
        });
        sendResponse({
          ok: true,
          workflowId: workflow.workflowId,
          qaSemanticClean: workflow.qaSemanticClean
        });
        driveWorkflow(workflow.workflowId);
      } catch (error) {
        sendResponse({
          ok: false,
          errorCode: error instanceof Error ? error.message : "CLEAN_REBUILD_FAILED"
        });
      }
    })();
    return true;
  });
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (
      isRecord(message) &&
      message.type === "E2E_RETRIEVAL_EVALUATE" &&
      typeof message.courseId === "string" &&
      Array.isArray(message.gapProjection)
    ) {
      const courseId = message.courseId;
      const evaluationId = randomId("planner_eval");
      void withActiveWorker(
        async () => {
          const startedAt = new Date().toISOString();
          const rounds: unknown[] = [];
          const auditRounds: unknown[] = [];
          let currentCall: AiCall | undefined;
          let currentCallStarted = 0;
          let index: CourseContentIndex | undefined;
          const expanded: NativeExpansion[] = [];
          try {
            await initialize();
            if (!(await aiPort.privacyAuthorized()) || !(await aiPort.usageAuthorized()))
              throw new Error("AUTHORIZATION_REQUIRED");
            const apiKey = await aiPort.apiKey();
            if (!apiKey) throw new Error("API_KEY_REQUIRED");
            const states = await store.readAllSourceStates(courseId);
            const sources = structuredClone(states.sources);
            const projection = message.gapProjection as Array<{
              sourceId: string;
              contentHash: string;
              remainingGaps: Array<{ locator: string; triggers: string[] }>;
            }>;
            for (const row of projection) {
              const source = sources.find((s) => s.sourceId === row.sourceId);
              if (!source?.parsed?.units || source.parsed.contentHash !== row.contentHash)
                throw new Error("PLANNER_PROJECTION_HASH_CONFLICT");
              for (const unit of source.parsed.units) {
                const gap = row.remainingGaps.find((g) => g.locator === unit.locator);
                unit.partial = !!gap;
                unit.visualGaps = gap?.triggers ?? [];
              }
            }
            index = contentIndex(sources);
            if (message.objectiveAcquisition !== undefined) {
              const objective = message.objectiveAcquisition;
              if (
                !isRecord(objective) ||
                !isRecord(objective.index) ||
                !Array.isArray(objective.expanded) ||
                stableStringify(objective.index.sources) !== stableStringify(index.sources) ||
                stableStringify(objective.index.units) !== stableStringify(index.units)
              )
                throw new Error("PLANNER_OBJECTIVE_NATIVE_CHANGED");
              const seen = new Set<string>();
              for (const item of objective.expanded) {
                if (!isRecord(item) || typeof item.ref !== "string" || seen.has(item.ref))
                  throw new Error("PLANNER_OBJECTIVE_REF_INVALID");
                const native = expandRef(index, sources, item.ref);
                if (stableStringify(item) !== stableStringify(native))
                  throw new Error("PLANNER_OBJECTIVE_NATIVE_CHANGED");
                expanded.push(native);
                seen.add(item.ref);
              }
            }
            if (typeof message.recoverFrom === "string") {
              const prior = (await store.readMetadata())[message.recoverFrom];
              if (
                !isRecord(prior) ||
                !["completed", "failed"].includes(String(prior.state)) ||
                !Array.isArray(prior.expanded) ||
                !isRecord(prior.index)
              )
                throw new Error("PLANNER_RECOVERY_INVALID");
              const previousSources = prior.index.sources;
              if (
                !Array.isArray(previousSources) ||
                JSON.stringify(
                  previousSources.map((row) =>
                    isRecord(row) ? [row.ref, row.sourceId, row.unitCount] : null
                  )
                ) !==
                  JSON.stringify(index.sources.map((row) => [row.ref, row.sourceId, row.unitCount]))
              )
                throw new Error("PLANNER_RECOVERY_NATIVE_CHANGED");
              for (const source of sources.filter((s) => !s.removedFromNative)) {
                const previous: unknown = previousSources.find(
                  (row) => isRecord(row) && row.sourceId === source.sourceId
                );
                const legacyFingerprint = stableDigest(
                  stableStringify({
                    machine: source.machine,
                    parsed: source.parsed,
                    fields: nativeFields(source),
                    parent: source.parentSourceId,
                    nativeType: source.discovery?.nativeTypeHint
                  })
                );
                if (
                  !isRecord(previous) ||
                  previous.fingerprint !==
                    (prior.index.policy === "index_selective_retrieval_da002_v1"
                      ? legacyFingerprint
                      : index.sources.find((s) => s.sourceId === source.sourceId)?.fingerprint)
                )
                  throw new Error("PLANNER_RECOVERY_NATIVE_CHANGED");
              }
              for (const item of prior.expanded) {
                if (!isRecord(item) || typeof item.ref !== "string")
                  throw new Error("PLANNER_RECOVERY_REF_INVALID");
                const native = expandRef(index, sources, item.ref);
                if (item.ref.startsWith("u:") && item.text !== native.text)
                  throw new Error("PLANNER_RECOVERY_NATIVE_CHANGED");
                if (
                  prior.index.policy === "index_selective_retrieval_da002_v3" &&
                  stableStringify(item) !== stableStringify(native)
                )
                  throw new Error("PLANNER_RECOVERY_NATIVE_CHANGED");
                expanded.push(structuredClone(item) as unknown as NativeExpansion);
              }
            }
            const recoveredAcquisitions: NativeExpansion[] = [];
            // Objective native acquisitions are reusable across protocol versions; legacy scope decisions are not.
            await store.setMetadata({
              [evaluationId]: {
                state: "working",
                courseId,
                startedAt,
                index,
                expanded,
                recoveredAcquisitions
              }
            });
            sendResponse({ ok: true, evaluationId });
            const plannerIndex = index;
            const proposedComplete =
              message.proposedComplete === undefined
                ? undefined
                : validatePlanner(message.proposedComplete, index, expanded);
            if (
              proposedComplete &&
              (!message.coverageAudit || proposedComplete.status !== "COMPLETE")
            )
              throw new Error("AUDIT_PROPOSAL_NOT_COMPLETE");
            const executeEvaluation = async (call: AiCall) => {
              currentCall = call;
              currentCallStarted = performance.now();
              const outcome = await aiPort.execute(call, apiKey, {
                knownSourceIds: new Set(plannerIndex.sources.map((s) => s.sourceId))
              });
              await store.recordAiRun({
                aiRunId: randomId("airun"),
                workflowId: evaluationId,
                courseId,
                task: call.task,
                schemaVersion: call.schemaVersion,
                promptVersion: call.promptVersion,
                idempotencyKey: call.idempotencyKey,
                ...(call.invocationFingerprint
                  ? { invocationFingerprint: call.invocationFingerprint }
                  : {}),
                status: "succeeded",
                attempt: 1,
                payload: outcome.value,
                durationMs: performance.now() - currentCallStarted,
                ...(outcome.inputTokens === undefined ? {} : { inputTokens: outcome.inputTokens }),
                ...(outcome.outputTokens === undefined
                  ? {}
                  : { outputTokens: outcome.outputTokens }),
                ...(outcome.reasoningTokens === undefined
                  ? {}
                  : { reasoningTokens: outcome.reasoningTokens }),
                recordedAt: new Date().toISOString()
              });
              qaPlannerFailedValues.delete(call.idempotencyKey);
              return outcome;
            };
            const evaluate = message.coverageAudit ? planRetrievalWithAudit : planRetrieval;
            const completed = await evaluate({
              index,
              inventory: sources,
              key: evaluationId,
              expanded,
              ...(proposedComplete ? { initialProposal: proposedComplete } : {}),
              execute: executeEvaluation,
              executeAudit: executeEvaluation,
              onAudit: async (round: AuditRound, currentExpanded: NativeExpansion[]) => {
                expanded.splice(0, expanded.length, ...currentExpanded);
                auditRounds.push(round);
                qaTrace("qa.coverage-audit", {
                  scopeId: evaluationId,
                  status: round.result.status,
                  unread: round.input.unreadRefs.length,
                  covered: round.result.coveredRefs.length,
                  requested: round.newRefs.length,
                  nativeCharacters: round.newNativeCharacters,
                  durationMs: round.durationMs
                });
                await store.setMetadata({
                  [evaluationId]: {
                    state: "working",
                    courseId,
                    startedAt,
                    index,
                    expanded,
                    recoveredAcquisitions,
                    rounds,
                    auditRounds,
                    result: round.plannerResult
                  }
                });
              },
              onRound: async (round, currentExpanded) => {
                expanded.splice(0, expanded.length, ...currentExpanded);
                rounds.push(round);
                qaTrace("qa.planner-acquisition", {
                  scopeId: evaluationId,
                  runtimeState: round.runtimeState,
                  newRefs: round.newRefs.length,
                  nativeCharacters: round.newNativeCharacters
                });
                await store.setMetadata({
                  [evaluationId]: {
                    state: round.runtimeState === "COMPLETE" ? "completed" : "working",
                    courseId,
                    startedAt,
                    ...(round.runtimeState === "COMPLETE"
                      ? { endedAt: new Date().toISOString() }
                      : {}),
                    index,
                    expanded,
                    recoveredAcquisitions,
                    rounds,
                    result: round.result
                  }
                });
              }
            });
            await store.setMetadata({
              [evaluationId]: {
                state: "completed",
                courseId,
                startedAt,
                endedAt: new Date().toISOString(),
                index,
                expanded: completed.expanded,
                recoveredAcquisitions,
                rounds,
                auditRounds,
                result: completed.result,
                ...("coverageAudit" in completed ? { coverageAudit: completed.coverageAudit } : {})
              }
            });
          } catch (error) {
            const failedPayload = currentCall
              ? qaPlannerFailedValues.get(currentCall.idempotencyKey)
              : undefined;
            if (currentCall) {
              await store.recordAiRun({
                aiRunId: randomId("airun"),
                workflowId: evaluationId,
                courseId,
                task: currentCall.task,
                schemaVersion: currentCall.schemaVersion,
                promptVersion: currentCall.promptVersion,
                idempotencyKey: currentCall.idempotencyKey,
                status: "failed",
                attempt: 1,
                errorCode:
                  error instanceof DeepSeekFailure ? error.code : "PLANNER_EVALUATION_FAILED",
                durationMs: performance.now() - currentCallStarted,
                ...(failedPayload === undefined ? {} : { payload: failedPayload }),
                recordedAt: new Date().toISOString()
              });
              qaPlannerFailedValues.delete(currentCall.idempotencyKey);
            }
            await store.setMetadata({
              [evaluationId]: {
                ...(failedPayload === undefined ? {} : { failedPayload }),
                state: "failed",
                courseId,
                startedAt,
                endedAt: new Date().toISOString(),
                index,
                expanded,
                rounds,
                errorCode:
                  error instanceof DeepSeekFailure
                    ? error.code
                    : error instanceof Error
                      ? error.message
                      : "PLANNER_EVALUATION_FAILED"
              }
            });
            sendResponse({ ok: false, evaluationId });
          }
        },
        () => chrome.runtime.getPlatformInfo(),
        () =>
          qaTrace("qa.worker-lifecycle", {
            scopeId: evaluationId,
            errorCode: "KEEPALIVE_API_FAILED"
          })
      );
      return true;
    }
    if (
      isRecord(message) &&
      message.type === "E2E_TRIAGE_EVALUATE" &&
      typeof message.courseId === "string"
    ) {
      const courseId = message.courseId;
      const evaluationId = randomId("triage_eval");
      void withActiveWorker(
        async () => {
          const startedAt = new Date().toISOString();
          try {
            await initialize();
            if (!(await aiPort.privacyAuthorized()) || !(await aiPort.usageAuthorized()))
              throw new Error("AUTHORIZATION_REQUIRED");
            const apiKey = await aiPort.apiKey();
            if (!apiKey) throw new Error("API_KEY_REQUIRED");
            const { sources } = await store.readAllSourceStates(courseId);
            const profiles = sources
              .filter((source) => !source.removedFromNative)
              .map((source) => sourceProfile(source, sources));
            await store.setMetadata({
              [evaluationId]: { state: "working", courseId, startedAt, sources: profiles.length }
            });
            sendResponse({ ok: true, evaluationId });
            const results = new Map<string, RoutingResult>();
            const coarseResults: CoarseResult[] = [];
            const deepResults: TriageResult[] = [];
            const passes = [];
            for (const pass of ["coarse", "deep"] as const) {
              const passStarted = performance.now();
              const selected =
                pass === "coarse"
                  ? profiles
                  : profiles.filter((p) =>
                      coarseResults.some(
                        (r) => r.sourceId === p.sourceId && r.decision === "DEEP_TRIAGE_CANDIDATE"
                      )
                    );
              let logicalCalls = 0;
              for (const call of triageBatches(selected, evaluationId, pass)) {
                const callStarted = performance.now();
                const batch = (JSON.parse(call.user) as { profiles: SourceProfile[] }).profiles;
                const outcome = await aiPort.execute(call, apiKey, {
                  knownSourceIds: new Set(batch.map((profile) => profile.sourceId))
                });
                const validated = validateRouting(outcome.value, batch);
                for (const result of validated) {
                  results.set(result.sourceId, result);
                  if (isCoarseResult(result)) coarseResults.push(result);
                  else deepResults.push(result);
                }
                logicalCalls += 1;
                await store.recordAiRun({
                  aiRunId: randomId("airun"),
                  workflowId: evaluationId,
                  courseId,
                  task: "source-triage",
                  schemaVersion: call.schemaVersion,
                  promptVersion: call.promptVersion,
                  idempotencyKey: call.idempotencyKey,
                  ...(call.invocationFingerprint
                    ? { invocationFingerprint: call.invocationFingerprint }
                    : {}),
                  status: "succeeded",
                  attempt: 1,
                  payload: outcome.value,
                  durationMs: performance.now() - callStarted,
                  ...(outcome.inputTokens === undefined
                    ? {}
                    : { inputTokens: outcome.inputTokens }),
                  ...(outcome.outputTokens === undefined
                    ? {}
                    : { outputTokens: outcome.outputTokens }),
                  ...(outcome.reasoningTokens === undefined
                    ? {}
                    : { reasoningTokens: outcome.reasoningTokens }),
                  recordedAt: new Date().toISOString()
                });
              }
              passes.push({
                pass,
                sources: selected.length,
                logicalCalls,
                durationMs: performance.now() - passStarted
              });
            }
            await store.setMetadata({
              [evaluationId]: {
                state: "completed",
                courseId,
                startedAt,
                endedAt: new Date().toISOString(),
                profiles,
                results: [...results.values()],
                coarseResults,
                deepResults,
                passes
              }
            });
          } catch (error) {
            await store.setMetadata({
              [evaluationId]: {
                state: "failed",
                courseId,
                startedAt,
                endedAt: new Date().toISOString(),
                errorCode:
                  error instanceof DeepSeekFailure
                    ? error.code
                    : error instanceof Error &&
                        ["AUTHORIZATION_REQUIRED", "API_KEY_REQUIRED"].includes(error.message)
                      ? error.message
                      : "TRIAGE_EVALUATION_FAILED"
              }
            });
            sendResponse({ ok: false, evaluationId });
          }
        },
        () => chrome.runtime.getPlatformInfo(),
        () =>
          qaTrace("qa.worker-lifecycle", {
            scopeId: evaluationId,
            errorCode: "KEEPALIVE_API_FAILED"
          })
      );
      return true;
    }
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
if (__SYLLAB_E2E_FIXTURES__) {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (
      !isRecord(message) ||
      message.type !== "E2E_TEACHING_CLASSIFICATION" ||
      typeof message.courseId !== "string"
    )
      return;
    const courseId = message.courseId,
      evaluationId = randomId("teaching_eval");
    void withActiveWorker(
      async () => {
        const startedAt = new Date().toISOString();
        let call: AiCall | undefined;
        let routingSnapshot: TeachingInput | undefined;
        try {
          await initialize();
          if (!(await aiPort.privacyAuthorized()) || !(await aiPort.usageAuthorized()))
            throw new Error("AUTHORIZATION_REQUIRED");
          const apiKey = await aiPort.apiKey();
          if (!apiKey) throw new Error("API_KEY_REQUIRED");
          const sources = structuredClone((await store.readAllSourceStates(courseId)).sources);
          const index = contentIndex(sources),
            input = teachingInput(sources, undefined, index);
          routingSnapshot = input;
          call = teachingCall(input, evaluationId);
          await store.setMetadata({
            [evaluationId]: {
              state: "working",
              courseId,
              startedAt,
              index,
              totalEntries: input.profiles.length
            }
          });
          sendResponse({ ok: true, evaluationId });
          const outcome = await aiPort.execute(call, apiKey, {
            knownSourceIds: new Set(index.sources.map((s) => s.sourceId))
          });
          const result = validateTeachingResult(outcome.value, input);
          const deferred = new Set(
            result.sources
              .filter((s) => s.classification === "TEACHING_MATERIAL_DEFERRED")
              .map((s) => s.sourceId)
          );
          const views = sources.filter((s) => !deferred.has(s.sourceId));
          const nativeCharacters = views.reduce((n, s) => n + (s.parsed?.text.length ?? 0), 0);
          await store.recordAiRun({
            aiRunId: randomId("airun"),
            workflowId: evaluationId,
            courseId,
            task: "teaching-classification",
            schemaVersion: call.schemaVersion,
            promptVersion: call.promptVersion,
            idempotencyKey: call.idempotencyKey,
            ...(call.invocationFingerprint
              ? { invocationFingerprint: call.invocationFingerprint }
              : {}),
            status: "succeeded",
            attempt: 1,
            payload: result,
            durationMs: Date.now() - Date.parse(startedAt),
            ...(outcome.inputTokens === undefined ? {} : { inputTokens: outcome.inputTokens }),
            ...(outcome.outputTokens === undefined ? {} : { outputTokens: outcome.outputTokens }),
            ...(outcome.reasoningTokens === undefined
              ? {}
              : { reasoningTokens: outcome.reasoningTokens }),
            recordedAt: new Date().toISOString()
          });
          await store.setMetadata({
            [evaluationId]: {
              state: "completed",
              courseId,
              startedAt,
              endedAt: new Date().toISOString(),
              index,
              result,
              totalEntries: input.profiles.length,
              profiles: input.profiles,
              deferredSourceIds: [...deferred],
              projectedSourcePackages: views.length,
              projectedNativeCharacters: nativeCharacters,
              projectedPartialUnits: index.units.filter(
                (u) =>
                  !deferred.has(index.sources.find((s) => s.ref === u[1])?.sourceId ?? "") &&
                  u[7].length
              ).length,
              requestBytes: new TextEncoder().encode(call.user).byteLength
            }
          });
        } catch (error) {
          await store.setMetadata({
            [evaluationId]: {
              state: "failed",
              courseId,
              startedAt,
              endedAt: new Date().toISOString(),
              errorCode: error instanceof Error ? error.message : "ROUTING_EVALUATION_FAILED",
              ...(routingSnapshot
                ? {
                    profiles: routingSnapshot.profiles,
                    totalEntries: routingSnapshot.profiles.length
                  }
                : {}),
              ...(call
                ? {
                    rejectedValue: qaPlannerFailedValues.get(call.idempotencyKey),
                    requestBytes: new TextEncoder().encode(call.user).byteLength
                  }
                : {})
            }
          });
          sendResponse({ ok: false, evaluationId });
        }
      },
      () => chrome.runtime.getPlatformInfo(),
      () =>
        qaTrace("qa.worker-lifecycle", { scopeId: evaluationId, errorCode: "KEEPALIVE_API_FAILED" })
    );
    return true;
  });
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isViewMessage(message)) return undefined;
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(""))) {
    return undefined;
  }
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
    const storedRoutes = await chrome.storage.session.get("syllab.surfaceRoutes");
    const existingRoutes = storedRoutes["syllab.surfaceRoutes"];
    if (isRecord(existingRoutes)) {
      for (const [key, value] of Object.entries(existingRoutes)) {
        if (!surfaceRoutes.has(key) && isRecord(value)) {
          surfaceRoutes.set(key, value as unknown as Parameters<typeof surfaceRoutes.set>[1]);
        }
      }
    }
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

let resuming: Promise<void> | null = null;

/**
 * Picks up runs that stopped without finishing — interrupted by an eviction, or parked after a
 * retryable failure whose backoff has since elapsed.
 */
function resumeInterrupted(): Promise<void> {
  if (__SYLLAB_QA_RECOVERY_HOLD__) return Promise.resolve();
  if (resuming !== null) return resuming;
  resuming = (async () => {
    try {
      await engine.reconcileSession();
      const now = new Date();
      for (const workflow of await store.listWorkflows()) {
        if (retryDue(workflow, now)) driveWorkflow(workflow.workflowId);
      }
      await scheduleParkedResume();
    } finally {
      resuming = null;
    }
  })();
  return resuming;
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

// Ensure the periodic maintenance alarm exists without resetting its schedule on every SW wake-up.
void chrome.alarms.get("syllab-opportunity-check").then((existing) => {
  if (!existing) {
    void chrome.alarms.create("syllab-opportunity-check", { periodInMinutes: 15 });
  }
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PARKED_RESUME_ALARM) {
    void initialize().then(() => resumeInterrupted());
    return;
  }
  if (alarm.name !== "syllab-opportunity-check") return;
  void initialize().then(() => opportunityCheck());
});

/** Opportunity Checking: local machine comparison first; a paid call only after a difference. */
async function opportunityCheck(): Promise<void> {
  if (__SYLLAB_QA_RECOVERY_HOLD__) return;
  const workflows = await store.listWorkflows();
  const courses = (await store.readCourses()).filter(
    (course) => course.established && automaticCheckPermitted(workflows, course.courseId)
  );
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

// Only extension surfaces can subscribe. Activity never goes through chrome.storage or backups.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "syllab.activity/1" || !port.sender?.url?.startsWith(chrome.runtime.getURL("")))
    return;
  const unsubscribe = activityHub.subscribe((scope, view) => {
    port.postMessage({
      contract: "syllab.activity/1",
      courseId: scope.courseId,
      workflowId: scope.workflowId,
      ...view
    });
  });
  port.onDisconnect.addListener(unsubscribe);
});
