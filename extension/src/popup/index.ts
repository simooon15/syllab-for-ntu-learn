import { CONTRACT_VERSION, isRecord, type MainSurface } from "@syllab/contracts";

import "./popup.css";
import { mergeCandidateRecords } from "../ai/client";
import {
  addUserBriefItem,
  briefItemsFromReview,
  editBriefItem,
  resolveBriefField
} from "../brief/state";
import { IndexedDbBriefRepository } from "../brief/repository";
import { CourseIndexRepository } from "../repository/course-index-repository";
import type { ReviewCandidate } from "../review/domain";
import { candidateRelationshipLabel } from "../review/relationship";
import { IndexedDbReviewRepository } from "../review/repository";
import {
  assignCandidateRelationship,
  confirmCandidate,
  confirmDetectedCategory,
  editAndConfirmCandidate,
  ignoreCandidate,
  reviewProgress
} from "../review/state";
import { resolveCurrentEntry } from "./entry-runtime";
import type { EntryRoute } from "./entry-router";
import { calendarEventsFromBrief } from "../calendar/query";
import { serializeCalendar } from "../calendar/ics";

const surfaces: ReadonlyArray<{ id: MainSurface; label: string }> = [
  { id: "saved-courses", label: "Saved Courses" },
  { id: "scan", label: "Scan" },
  { id: "review", label: "Review" },
  { id: "course-brief", label: "Course Brief" }
];

interface FetchState {
  pendingOrigin: { origin: string; permissionPattern: string; sourceCount: number } | null;
  fetchedCount: number;
  deniedCount: number;
  failedCount: number;
  signatureCounts: Record<string, number>;
  finalOrigins: string[];
  grantedOrigins: string[];
  deniedOrigins: string[];
  suspiciousCount: number;
  complete: boolean;
}

interface ParseState {
  parsed: number;
  partial: number;
  unsupported: number;
  failed: number;
  complete: boolean;
}

interface NormalizeState {
  unitCount: number;
  duplicateCount: number;
  sourceCount: number;
  complete: boolean;
}

function parseParseState(value: unknown): ParseState | null {
  if (!isRecord(value)) return null;
  return {
    parsed: typeof value.parsed === "number" ? value.parsed : 0,
    partial: typeof value.partial === "number" ? value.partial : 0,
    unsupported: typeof value.unsupported === "number" ? value.unsupported : 0,
    failed: typeof value.failed === "number" ? value.failed : 0,
    complete: value.complete === true
  };
}

function parseNormalizeState(value: unknown): NormalizeState | null {
  if (!isRecord(value)) return null;
  return {
    unitCount: typeof value.unitCount === "number" ? value.unitCount : 0,
    duplicateCount: typeof value.duplicateCount === "number" ? value.duplicateCount : 0,
    sourceCount: typeof value.sourceCount === "number" ? value.sourceCount : 0,
    complete: value.complete === true
  };
}

function viewCopy(route: EntryRoute): { title: string; lede: string; statusLabel: string } {
  if (route.surface === "saved-courses") {
    return {
      title: "Your course shelf",
      lede: "Open an NTU Learn course to scan it, or return to a course brief you have already built.",
      statusLabel: "Current context"
    };
  }
  if (route.surface === "course-brief") {
    return {
      title: "Course brief",
      lede: "Confirmed course facts stay here. Sources remain available when you need to check the evidence.",
      statusLabel: "Brief status"
    };
  }
  if (route.surface === "review") {
    return {
      title: "Review course facts",
      lede: "Check uncertain items first, then confirm detected facts by category or one at a time.",
      statusLabel: "Review progress"
    };
  }
  if (route.state === "ready") {
    return {
      title: "Scan this course",
      lede: "Find pages, announcements, assignments and supported documents. Nothing becomes a fact until you review it.",
      statusLabel: "Ready"
    };
  }
  if (route.state === "waiting-for-permission") {
    return {
      title: "Permission needed",
      lede: "One attachment host needs access. You can allow this exact site or continue with the other sources.",
      statusLabel: "Waiting for permission"
    };
  }
  return {
    title: route.phase === "fetch" ? "Sources discovered" : "Scan in progress",
    lede:
      route.phase === "fetch"
        ? "Discovery is saved. The next stage will read supported content without changing NTU Learn."
        : "Syllab is following the course structure and saving each completed step as it goes.",
    statusLabel: "Scan record"
  };
}

function parseFetchState(value: unknown): FetchState | null {
  if (!isRecord(value)) return null;
  const pending = value.pendingOrigin;
  if (pending !== null && !isRecord(pending)) return null;
  const stringArray = (key: string): string[] =>
    Array.isArray(value[key])
      ? value[key].filter((item): item is string => typeof item === "string")
      : [];
  const signatureCounts = isRecord(value.signatureCounts)
    ? Object.fromEntries(
        Object.entries(value.signatureCounts).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number"
        )
      )
    : {};
  return {
    pendingOrigin:
      pending &&
      typeof pending.origin === "string" &&
      typeof pending.permissionPattern === "string" &&
      typeof pending.sourceCount === "number"
        ? {
            origin: pending.origin,
            permissionPattern: pending.permissionPattern,
            sourceCount: pending.sourceCount
          }
        : null,
    fetchedCount: typeof value.fetchedCount === "number" ? value.fetchedCount : 0,
    deniedCount: typeof value.deniedCount === "number" ? value.deniedCount : 0,
    failedCount: typeof value.failedCount === "number" ? value.failedCount : 0,
    signatureCounts,
    finalOrigins: stringArray("finalOrigins"),
    grantedOrigins: stringArray("grantedOrigins"),
    deniedOrigins: stringArray("deniedOrigins"),
    suspiciousCount: typeof value.suspiciousCount === "number" ? value.suspiciousCount : 0,
    complete: value.complete === true
  };
}

function fetchStateLabel(outcome: unknown, state: FetchState | null): string {
  if (!state) return `Fetch ${String(outcome)}`;
  const signatures = Object.entries(state.signatureCounts)
    .map(([name, count]) => `${String(count)} ${name}`)
    .join(", ");
  return [
    `Fetch ${String(outcome)}`,
    `${String(state.fetchedCount)} fetched`,
    `${String(state.deniedCount)} denied`,
    `${String(state.failedCount)} failed`,
    signatures || "no file signatures",
    `final origins ${state.finalOrigins.join(", ") || "none"}`,
    `runtime origins ${state.grantedOrigins.join(", ") || "none"}`,
    `${String(state.suspiciousCount)} incomplete byte results`
  ].join(" · ");
}

async function beginFetch(route: Extract<EntryRoute, { surface: "scan" }>): Promise<void> {
  if (!route.scanId) throw new Error("Fetch checkpoint is missing");
  render({ ...route, state: "scanning", phase: "fetch" }, "Reading discovered sources…");
  const response: unknown = await chrome.runtime.sendMessage({
    contractVersion: CONTRACT_VERSION,
    type: "START_FETCH",
    scanId: route.scanId
  });
  if (!isRecord(response) || typeof response.error === "string") {
    throw new Error(
      isRecord(response) && typeof response.error === "string"
        ? response.error
        : "Source fetch could not start"
    );
  }
  const state = parseFetchState(response.state);
  const waiting = response.outcome === "WaitingForPermission";
  render(
    {
      ...route,
      state: waiting ? "waiting-for-permission" : "scanning",
      phase: waiting ? "fetch" : "parse"
    },
    waiting
      ? "Choose how to handle this attachment host"
      : fetchStateLabel(response.outcome, state),
    false,
    state
  );
}

async function beginParse(route: Extract<EntryRoute, { surface: "scan" }>): Promise<void> {
  if (!route.scanId) throw new Error("Parse checkpoint is missing");
  render({ ...route, phase: "parse" }, "Parsing supported documents…");
  const response: unknown = await chrome.runtime.sendMessage({
    contractVersion: CONTRACT_VERSION,
    type: "START_PARSE",
    scanId: route.scanId
  });
  if (!isRecord(response) || typeof response.error === "string" || !isRecord(response.state)) {
    throw new Error(
      isRecord(response) && typeof response.error === "string" ? response.error : "Parse failed"
    );
  }
  const state = parseParseState(response.state);
  if (!state) throw new Error("Parse returned an invalid state");
  render(
    { ...route, state: "scanning", phase: "normalize" },
    `Parse Complete · ${String(state.parsed)} parsed · ${String(state.partial)} partial · ${String(state.unsupported)} unsupported · ${String(state.failed)} failed`,
    false,
    null,
    state
  );
}

async function beginNormalize(route: Extract<EntryRoute, { surface: "scan" }>): Promise<void> {
  if (!route.scanId) throw new Error("Normalize checkpoint is missing");
  render({ ...route, phase: "normalize" }, "Normalizing evidence…");
  const response: unknown = await chrome.runtime.sendMessage({
    contractVersion: CONTRACT_VERSION,
    type: "START_NORMALIZE",
    scanId: route.scanId
  });
  if (!isRecord(response) || typeof response.error === "string" || !isRecord(response.state)) {
    throw new Error(
      isRecord(response) && typeof response.error === "string" ? response.error : "Normalize failed"
    );
  }
  const state = parseNormalizeState(response.state);
  if (!state) throw new Error("Normalize returned an invalid state");
  render(
    { ...route, state: "scanning", phase: "extract" },
    `Normalize Complete · ${String(state.unitCount)} units · ${String(state.sourceCount)} sources · ${String(state.duplicateCount)} duplicates`
  );
}

async function beginExtraction(route: Extract<EntryRoute, { surface: "scan" }>): Promise<void> {
  if (!route.scanId) throw new Error("Extraction checkpoint is missing");
  render({ ...route, phase: "extract" }, "Extracting candidate facts…");
  const response: unknown = await chrome.runtime.sendMessage({
    contractVersion: CONTRACT_VERSION,
    type: "START_EXTRACTION",
    scanId: route.scanId
  });
  if (!isRecord(response) || typeof response.error === "string" || !isRecord(response.state)) {
    throw new Error(
      isRecord(response) && typeof response.error === "string"
        ? response.error
        : "Extraction failed"
    );
  }
  const candidateCount =
    typeof response.state.candidateCount === "number" ? response.state.candidateCount : 0;
  const failedBatchCount =
    typeof response.state.failedBatchCount === "number" ? response.state.failedBatchCount : 0;
  const failureCodes = Array.isArray(response.state.failureCodes)
    ? response.state.failureCodes.filter((code): code is string => typeof code === "string")
    : [];
  if (candidateCount === 0 && failedBatchCount > 0) {
    render(
      { ...route, state: "scanning", phase: "extract" },
      `Extraction Failed · ${String(failedBatchCount)} failed batches · ${failureCodes.join(", ") || "AI_BACKEND_FAILED"}`
    );
    return;
  }
  if (candidateCount > 0) {
    render(
      { surface: "review", courseId: route.courseId, scanId: route.scanId },
      "Loading Review…"
    );
  } else {
    render(
      { surface: "course-brief", courseId: route.courseId },
      "No items detected in supported sources"
    );
  }
}

async function persistReview(
  route: Extract<EntryRoute, { surface: "review" }>,
  candidates: ReviewCandidate[]
): Promise<void> {
  const progress = reviewProgress(route.scanId, candidates);
  await new IndexedDbReviewRepository().save(route.scanId, candidates, progress);
  const briefRepository = new IndexedDbBriefRepository();
  const existingItems = await briefRepository.listCourseItems(route.courseId);
  const items = briefItemsFromReview(route.courseId, candidates, {}, new Date(), existingItems);
  await briefRepository.upsertCourseItems(items);
  const courses = new CourseIndexRepository(chrome.storage.local);
  const course = await courses.findCourse(route.courseId);
  if (course) {
    await courses.upsertCourse({
      ...course,
      hasBrief: course.hasBrief || items.length > 0,
      pendingReviewCount: progress.detected + progress.needsReview
    });
  }
  if (!progress.complete) {
    await appendReview(route, candidates);
    return;
  }
  if (course) {
    await courses.upsertCourse({ ...course, hasBrief: true, pendingReviewCount: 0 });
  }
  render({ surface: "course-brief", courseId: route.courseId }, "Review complete");
}

async function appendReview(
  route: Extract<EntryRoute, { surface: "review" }>,
  supplied?: ReviewCandidate[]
): Promise<void> {
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) return;
  const reviewRepository = new IndexedDbReviewRepository();
  const existingBriefItems = await new IndexedDbBriefRepository().listCourseItems(route.courseId);
  const stored = supplied ? null : await reviewRepository.load(route.scanId);
  let candidates = supplied ?? stored?.candidates ?? [];
  let savedProgress = stored?.progress ?? reviewProgress(route.scanId, candidates);
  if (!supplied && stored && savedProgress.reviewed === 0) {
    const merged = mergeCandidateRecords(candidates);
    if (JSON.stringify(merged) !== JSON.stringify(candidates)) {
      candidates = merged;
      savedProgress = reviewProgress(route.scanId, candidates);
      await reviewRepository.save(route.scanId, candidates, savedProgress);
      const courses = new CourseIndexRepository(chrome.storage.local);
      const course = await courses.findCourse(route.courseId);
      if (course) {
        await courses.upsertCourse({
          ...course,
          pendingReviewCount: savedProgress.detected + savedProgress.needsReview
        });
      }
    }
  }
  app.querySelector(".review-content")?.remove();
  const content = document.createElement("div");
  content.className = "review-content";
  if (savedProgress.reviewed === 0) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "secondary-action";
    retry.textContent = "Retry extraction";
    retry.addEventListener("click", () => {
      retry.disabled = true;
      void beginExtraction({
        surface: "scan",
        state: "scanning",
        courseId: route.courseId,
        scanId: route.scanId,
        phase: "extract"
      }).catch((error: unknown) => {
        render(route, error instanceof Error ? error.message : "Extraction retry failed");
      });
    });
    content.append(retry);
  }
  for (const section of ["NeedsReview", "Detected"] as const) {
    const heading = document.createElement("h2");
    heading.textContent = section === "NeedsReview" ? "Needs Review" : "Detected";
    content.append(heading);
    const sectionCandidates = candidates.filter((candidate) => candidate.status === section);
    if (sectionCandidates.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No items in this section.";
      content.append(empty);
      continue;
    }
    if (section === "Detected") {
      for (const category of ["assessment", "important_date", "important_rule"] as const) {
        if (!sectionCandidates.some((candidate) => candidate.kind === category)) continue;
        const confirmAll = document.createElement("button");
        confirmAll.type = "button";
        confirmAll.className = "secondary-action";
        confirmAll.textContent = `Confirm all ${category.replace("_", " ")}`;
        confirmAll.addEventListener("click", () => {
          void persistReview(route, confirmDetectedCategory(candidates, category));
        });
        content.append(confirmAll);
      }
    }
    for (const candidate of sectionCandidates) {
      const card = document.createElement("article");
      card.className = "review-card";
      const title = document.createElement("h3");
      title.textContent = candidate.kind.replace("_", " ");
      const value = document.createElement("pre");
      value.textContent = JSON.stringify(candidate.proposedValue, null, 2);
      const relationshipLabel = candidateRelationshipLabel(candidate, candidates);
      const relationship = document.createElement("p");
      relationship.className = "relationship-context";
      relationship.textContent = relationshipLabel ?? "";
      const reviewReason = document.createElement("p");
      reviewReason.className = "unresolved-field";
      reviewReason.textContent = candidate.reviewReason ?? "";
      const actions = document.createElement("div");
      actions.className = "review-actions";
      const action = (label: string, handler: () => void): HTMLButtonElement => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-action";
        button.textContent = label;
        button.addEventListener("click", handler);
        return button;
      };
      const relationshipParentExists =
        candidate.scope === "assessment" &&
        candidate.appliesToAssessmentKey !== undefined &&
        (candidates.some(
          (item) =>
            item.kind === "assessment" && item.semanticKey === candidate.appliesToAssessmentKey
        ) ||
          existingBriefItems.some(
            (item) =>
              item.kind === "assessment" && item.semanticKey === candidate.appliesToAssessmentKey
          ));
      if (candidate.kind !== "assessment" && (!candidate.scope || !relationshipParentExists)) {
        const candidateParents = candidates
          .filter((item) => item.kind === "assessment")
          .map((parent) => ({
            semanticKey: parent.semanticKey,
            value: parent.proposedValue
          }));
        const existingParents = existingBriefItems
          .filter(
            (item) =>
              item.kind === "assessment" &&
              item.semanticKey &&
              !candidateParents.some((parent) => parent.semanticKey === item.semanticKey)
          )
          .map((parent) => ({
            semanticKey: parent.semanticKey as string,
            value: parent.currentValue
          }));
        for (const parent of [...candidateParents, ...existingParents]) {
          const parentLabel =
            typeof parent.value.identifier === "string"
              ? parent.value.identifier
              : typeof parent.value.name === "string"
                ? parent.value.name
                : parent.semanticKey.replace(/^assessment:/, "").toUpperCase();
          actions.append(
            action(`Applies to ${parentLabel}`, () => {
              void persistReview(
                route,
                assignCandidateRelationship(
                  candidates,
                  candidate.candidateId,
                  "assessment",
                  parent.semanticKey
                )
              );
            })
          );
        }
        actions.append(
          action("Course-level", () => {
            void persistReview(
              route,
              assignCandidateRelationship(candidates, candidate.candidateId, "course")
            );
          })
        );
      }
      actions.append(
        action(
          "Confirm",
          () => void persistReview(route, confirmCandidate(candidates, candidate.candidateId))
        ),
        action("Edit", () => {
          const edited = window.prompt(
            "Edit the confirmed JSON value",
            JSON.stringify(candidate.proposedValue)
          );
          if (!edited) return;
          try {
            const value: unknown = JSON.parse(edited);
            if (!isRecord(value)) throw new Error("Value must be an object");
            void persistReview(
              route,
              editAndConfirmCandidate(candidates, candidate.candidateId, value)
            );
          } catch {
            window.alert("Enter a valid JSON object.");
          }
        }),
        action(
          "Ignore",
          () => void persistReview(route, ignoreCandidate(candidates, candidate.candidateId))
        ),
        action("Skip for now", () => undefined),
        action("View source", () => {
          const evidence = document.createElement("p");
          evidence.className = "evidence";
          evidence.textContent = candidate.evidenceRefs
            .map((reference) => `${reference.sourceId} · ${reference.locator}`)
            .join("\n");
          card.append(evidence);
        })
      );
      card.append(title, value);
      if (relationshipLabel) card.append(relationship);
      if (candidate.reviewReason) card.append(reviewReason);
      card.append(actions);
      content.append(card);
    }
  }
  const progress = reviewProgress(route.scanId, candidates);
  const status = app.querySelector<HTMLElement>(".status-text");
  if (status)
    status.textContent = `${String(progress.reviewed)} of ${String(progress.total)} reviewed`;
  app.insertBefore(content, app.querySelector(".status"));
}

async function applyPermission(
  route: Extract<EntryRoute, { surface: "scan" }>,
  state: FetchState,
  requestAccess: boolean
): Promise<void> {
  if (!route.scanId || !state.pendingOrigin) throw new Error("Permission request is unavailable");
  const { origin, permissionPattern } = state.pendingOrigin;
  const granted = requestAccess
    ? await chrome.permissions.request({ origins: [permissionPattern] })
    : false;
  const response: unknown = await chrome.runtime.sendMessage({
    contractVersion: CONTRACT_VERSION,
    type: "APPLY_PERMISSION_DECISION",
    scanId: route.scanId,
    origin,
    granted
  });
  if (!isRecord(response) || typeof response.error === "string") {
    throw new Error(
      isRecord(response) && typeof response.error === "string"
        ? response.error
        : "Permission decision could not be saved"
    );
  }
  const nextState = parseFetchState(response.state);
  const waiting = response.outcome === "WaitingForPermission";
  render(
    {
      ...route,
      state: waiting ? "waiting-for-permission" : "scanning",
      phase: waiting ? "fetch" : "parse"
    },
    waiting
      ? "Another attachment host needs a decision"
      : fetchStateLabel(response.outcome, nextState),
    false,
    nextState
  );
}

async function beginDiscovery(route: Extract<EntryRoute, { surface: "scan" }>): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (tabId === undefined) throw new Error("No active NTU Learn tab is available");
  render({ ...route, state: "scanning" }, "Starting course discovery…");
  const response: unknown = await chrome.runtime.sendMessage({
    contractVersion: CONTRACT_VERSION,
    type: "START_DISCOVERY",
    courseId: route.courseId,
    tabId,
    ...(route.phase === "fetch" && route.scanId ? { restartScanId: route.scanId } : {})
  });
  if (!isRecord(response) || typeof response.error === "string") {
    throw new Error("Course discovery could not start");
  }
  const sourceCount = typeof response.sourceCount === "number" ? response.sourceCount : 0;
  const issueCount = typeof response.issueCount === "number" ? response.issueCount : 0;
  const discoveryStatus =
    typeof response.discoveryStatus === "string" ? response.discoveryStatus : "Unknown";
  const scanId = typeof response.scanId === "string" ? response.scanId : route.scanId;
  if (!scanId) throw new Error("Discovery did not return a Scan checkpoint");
  render(
    { ...route, state: "scanning", phase: "fetch", scanId },
    `Discovery ${discoveryStatus} · ${String(sourceCount)} sources · ${String(issueCount)} issues · next: Fetch`
  );
}

async function cancelScan(route: Extract<EntryRoute, { surface: "scan" }>): Promise<void> {
  if (!route.scanId) return;
  const response: unknown = await chrome.runtime.sendMessage({
    contractVersion: CONTRACT_VERSION,
    type: "CANCEL_SCAN",
    scanId: route.scanId
  });
  if (!isRecord(response) || response.status !== "Interrupted") {
    throw new Error("Scan could not be cancelled");
  }
  render(
    { ...route, state: "interrupted" },
    "Scan interrupted. Your existing Course Brief is unchanged."
  );
}

async function appendScanIssues(scanId: string): Promise<void> {
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) return;
  app.querySelector(".scan-issues")?.remove();
  const response: unknown = await chrome.runtime.sendMessage({
    contractVersion: CONTRACT_VERSION,
    type: "GET_SCAN_OVERVIEW",
    scanId
  });
  const issues = isRecord(response) && Array.isArray(response.issues) ? response.issues : [];
  const container = document.createElement("section");
  container.className = "scan-issues";
  const heading = document.createElement("h2");
  heading.textContent = "Scan issues";
  container.append(heading);
  if (issues.length === 0) {
    container.append("No source issues recorded.");
  } else {
    const list = document.createElement("ul");
    for (const issue of issues) {
      if (!isRecord(issue)) continue;
      const item = document.createElement("li");
      item.textContent = `${String(issue.reason)}${typeof issue.sourceId === "string" ? ` · ${issue.sourceId}` : ""} · ${String(issue.detail)}${issue.retryable === false ? " · No retry" : ""}`;
      list.append(item);
    }
    container.append(list);
  }
  app.insertBefore(container, app.querySelector(".status"));
}

async function readDiscoverySummary(
  scanId: string
): Promise<{ label: string; needsRefresh: boolean } | null> {
  const response: unknown = await chrome.runtime.sendMessage({
    contractVersion: CONTRACT_VERSION,
    type: "GET_DISCOVERY_SUMMARY",
    scanId
  });
  if (!isRecord(response) || !isRecord(response.summary)) return null;
  const summary = response.summary;
  const numberValue = (key: string): number =>
    typeof summary[key] === "number" ? summary[key] : 0;
  return {
    label: [
      `Discovery ${summary.complete === true ? "Complete" : "checkpoint"}`,
      `${String(numberValue("sourceCount"))} sources`,
      `${String(numberValue("issueCount"))} issues`,
      `${String(numberValue("contentPageCount"))} content pages`,
      `${String(numberValue("contentDetailCount"))} content details`,
      `${String(numberValue("announcementPageCount"))} announcement pages`,
      `max content depth ${String(numberValue("contentMaxDepth"))}`,
      `${String(numberValue("assignmentCount"))} assignments`,
      `${String(numberValue("announcementCount"))} announcements`,
      `${String(numberValue("attachmentCount"))} attachments`,
      `${String(numberValue("attachmentsMissingRequestUrl"))} attachment URLs pending refresh`,
      `attachment origins ${Array.isArray(summary.attachmentOrigins) ? summary.attachmentOrigins.join(", ") || "none" : "unknown"}`,
      `pagination ${summary.paginationDetected === true ? "observed" : "not observed"}`
    ].join(" · "),
    needsRefresh:
      summary.detailCoverageComplete !== true ||
      (typeof summary.attachmentsMissingRequestUrl === "number" &&
        summary.attachmentsMissingRequestUrl > 0)
  };
}

function render(
  route: EntryRoute,
  routeLabel: string,
  allowCoverageRefresh = false,
  fetchState: FetchState | null = null,
  parseState: ParseState | null = null
): void {
  const active: MainSurface = route.surface;
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) throw new Error("Popup root is missing");

  app.replaceChildren();
  const copy = viewCopy(route);
  const header = document.createElement("header");
  header.className = "masthead";
  const brand = document.createElement("div");
  brand.className = "brand-mark";
  brand.setAttribute("aria-hidden", "true");
  brand.textContent = "S";
  const headingGroup = document.createElement("div");
  headingGroup.className = "heading-group";
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Syllab / NTU Learn";

  const title = document.createElement("h1");
  title.textContent = copy.title;

  headingGroup.append(eyebrow, title);
  header.append(brand, headingGroup);

  const lede = document.createElement("p");
  lede.className = "lede";
  lede.textContent = copy.lede;

  const list = document.createElement("ul");
  list.className = "surface-list";
  list.setAttribute("aria-label", "Syllab sections");
  for (const surface of surfaces) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = surface.label;
    button.setAttribute("aria-current", surface.id === active ? "page" : "false");
    button.disabled = surface.id !== active;
    item.append(button);
    list.append(item);
  }

  const status = document.createElement("p");
  status.className = "status";
  const statusLabel = document.createElement("span");
  statusLabel.className = "status-label";
  statusLabel.textContent = copy.statusLabel;
  const statusText = document.createElement("span");
  statusText.className = "status-text";
  statusText.textContent = routeLabel;
  status.append(statusLabel, statusText);
  app.append(header, lede, list);

  if (route.surface === "scan" && route.state === "ready") {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "primary-action";
    action.textContent = "Scan this course";
    action.addEventListener("click", () => {
      action.disabled = true;
      void beginDiscovery(route).catch((error: unknown) => {
        render(route, error instanceof Error ? error.message : "Discovery could not start");
      });
    });
    app.append(action);
  }

  if (route.surface === "scan" && route.state === "scanning") {
    const tasks = document.createElement("ol");
    tasks.className = "task-list";
    const taskLabels = [
      "Finding course pages",
      "Finding announcements",
      "Finding assignments",
      "Preparing documents",
      "Extracting course information"
    ];
    for (const [index, task] of taskLabels.entries()) {
      const item = document.createElement("li");
      const completedTasks =
        route.phase === "normalize" || route.phase === "extract"
          ? 4
          : route.phase === "parse" || route.phase === "fetch"
            ? 3
            : 0;
      item.dataset.state =
        index < completedTasks ? "complete" : index === completedTasks ? "active" : "pending";
      item.textContent = task;
      tasks.append(item);
    }
    app.append(tasks);
    if (route.scanId) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "secondary-action";
      cancel.textContent = "Cancel scan";
      cancel.addEventListener("click", () => {
        cancel.disabled = true;
        void cancelScan(route).catch((error: unknown) => {
          render(route, error instanceof Error ? error.message : "Scan could not be cancelled");
        });
      });
      app.append(cancel);
    }
    if (route.phase === "fetch" && !allowCoverageRefresh) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "primary-action";
      action.textContent = "Continue to fetch";
      action.addEventListener("click", () => {
        action.disabled = true;
        void beginFetch(route).catch((error: unknown) => {
          render(route, error instanceof Error ? error.message : "Source fetch could not start");
        });
      });
      app.append(action);
    } else if (route.phase === "parse" && fetchState?.suspiciousCount) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "primary-action";
      action.textContent = "Verify fetched files";
      action.addEventListener("click", () => {
        action.disabled = true;
        void beginFetch(route).catch((error: unknown) => {
          render(
            route,
            error instanceof Error ? error.message : "Fetched files could not be verified",
            false,
            fetchState
          );
        });
      });
      app.append(action);
    } else if (route.phase === "parse") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "primary-action";
      action.textContent = "Continue to parse";
      action.addEventListener("click", () => {
        action.disabled = true;
        void beginParse(route).catch((error: unknown) => {
          render(route, error instanceof Error ? error.message : "Parse failed");
        });
      });
      app.append(action);
    } else if (route.phase === "normalize") {
      const continueToNormalize = document.createElement("button");
      continueToNormalize.type = "button";
      continueToNormalize.className = parseState?.failed ? "secondary-action" : "primary-action";
      continueToNormalize.textContent = parseState?.failed
        ? "Continue with partial results"
        : "Continue to normalize";
      continueToNormalize.addEventListener("click", () => {
        continueToNormalize.disabled = true;
        void beginNormalize(route).catch((error: unknown) => {
          render(route, error instanceof Error ? error.message : "Normalize failed");
        });
      });
      if (parseState?.failed) {
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "primary-action";
        retry.textContent = "Retry failed parsing";
        retry.addEventListener("click", () => {
          retry.disabled = true;
          void beginParse(route).catch((error: unknown) => {
            render(route, error instanceof Error ? error.message : "Parse retry failed");
          });
        });
        app.append(retry, continueToNormalize);
      } else {
        app.append(continueToNormalize);
      }
    } else if (route.phase === "extract") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "primary-action";
      action.textContent = "Extract course information";
      action.addEventListener("click", () => {
        action.disabled = true;
        void beginExtraction(route).catch((error: unknown) => {
          render(route, error instanceof Error ? error.message : "Extraction failed");
        });
      });
      app.append(action);
    } else if (route.phase === "discovery" || allowCoverageRefresh) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "primary-action";
      action.textContent = allowCoverageRefresh
        ? "Refresh discovery coverage"
        : "Continue discovery";
      action.addEventListener("click", () => {
        action.disabled = true;
        void beginDiscovery(route).catch((error: unknown) => {
          render(route, error instanceof Error ? error.message : "Discovery could not continue");
        });
      });
      app.append(action);
    }
  }
  if (route.surface === "scan" && route.state === "interrupted") {
    const interruptedScanId = route.scanId;
    const continueScan = document.createElement("button");
    continueScan.type = "button";
    continueScan.className = "primary-action";
    continueScan.textContent = "Continue scan";
    continueScan.disabled = !interruptedScanId;
    continueScan.addEventListener("click", () => {
      if (!interruptedScanId) return;
      continueScan.disabled = true;
      void chrome.runtime
        .sendMessage({
          contractVersion: CONTRACT_VERSION,
          type: "RESUME_SCAN",
          scanId: interruptedScanId
        })
        .then((response: unknown) => {
          if (!isRecord(response) || response.status !== "Scanning") {
            throw new Error(
              isRecord(response) && typeof response.error === "string"
                ? response.error
                : "Scan could not resume"
            );
          }
          render({ ...route, state: "scanning" }, "Continue from the saved checkpoint");
        })
        .catch((error: unknown) => {
          render(route, error instanceof Error ? error.message : "Scan could not resume");
        });
    });
    const tryAgain = document.createElement("button");
    tryAgain.type = "button";
    tryAgain.className = "secondary-action";
    tryAgain.textContent = "Try again from the beginning";
    tryAgain.addEventListener("click", () => {
      void beginDiscovery({ surface: "scan", state: "ready", courseId: route.courseId }).catch(
        (error: unknown) =>
          render(route, error instanceof Error ? error.message : "A new scan could not start")
      );
    });
    app.append(continueScan, tryAgain);
  }
  if (route.surface === "scan" && route.state === "waiting-for-permission") {
    if (fetchState?.pendingOrigin) {
      const origin = document.createElement("p");
      origin.className = "permission-origin";
      origin.textContent = `${fetchState.pendingOrigin.origin} · ${String(fetchState.pendingOrigin.sourceCount)} source${fetchState.pendingOrigin.sourceCount === 1 ? "" : "s"}`;
      const actions = document.createElement("div");
      actions.className = "permission-actions";
      const allow = document.createElement("button");
      allow.type = "button";
      allow.className = "primary-action";
      allow.textContent = "Allow access";
      const deny = document.createElement("button");
      deny.type = "button";
      deny.className = "secondary-action";
      deny.textContent = "Continue without them";
      for (const [button, requestAccess] of [
        [allow, true],
        [deny, false]
      ] as const) {
        button.addEventListener("click", () => {
          allow.disabled = true;
          deny.disabled = true;
          void applyPermission(route, fetchState, requestAccess).catch((error: unknown) => {
            render(
              route,
              error instanceof Error ? error.message : "Permission decision failed",
              false,
              fetchState
            );
          });
        });
      }
      actions.append(allow, deny);
      app.append(origin, actions);
    }
  }
  app.append(status);
  if (route.surface === "review") void appendReview(route);
  if (route.surface === "course-brief") void appendCourseBrief(route.courseId);
  if (route.surface === "saved-courses") void appendSavedCourses();
  if (route.surface === "scan" && route.scanId) {
    const issues = document.createElement("button");
    issues.type = "button";
    issues.className = "secondary-action";
    issues.textContent = "View issues";
    issues.addEventListener("click", () => void appendScanIssues(route.scanId ?? ""));
    app.insertBefore(issues, status);
  }
}

async function appendSavedCourses(): Promise<void> {
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) return;
  app.querySelector(".saved-courses-content")?.remove();
  const content = document.createElement("div");
  content.className = "saved-courses-content";
  const courses = await new CourseIndexRepository(chrome.storage.local).listCourses();
  if (courses.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No saved courses yet. Open an NTU Learn course to start a scan.";
    content.append(empty);
  }
  for (const course of courses) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "saved-course-card";
    button.textContent = `${course.courseCode ?? course.courseName ?? course.courseId}${course.pendingReviewCount ? ` · ${String(course.pendingReviewCount)} to review` : ""}`;
    button.addEventListener("click", () => {
      render({ surface: "course-brief", courseId: course.courseId }, "Saved course");
    });
    content.append(button);
  }
  app.insertBefore(content, app.querySelector(".status"));
}

async function appendCourseBrief(courseId: string): Promise<void> {
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) return;
  app.querySelector(".brief-content")?.remove();
  const content = document.createElement("div");
  content.className = "brief-content";
  const briefRepository = new IndexedDbBriefRepository();
  const courseRepository = new CourseIndexRepository(chrome.storage.local);
  const [items, course] = await Promise.all([
    briefRepository.listCourseItems(courseId),
    courseRepository.findCourse(courseId)
  ]);
  const promptValue = (
    message: string,
    initial: Record<string, unknown> = {}
  ): Record<string, unknown> | null => {
    const response = window.prompt(message, JSON.stringify(initial));
    if (!response) return null;
    try {
      const value: unknown = JSON.parse(response);
      if (!isRecord(value)) throw new Error("Value must be an object");
      return value;
    } catch {
      window.alert("Enter a valid JSON object.");
      return null;
    }
  };
  const saveItems = async (next: ReturnType<typeof addUserBriefItem>): Promise<void> => {
    await briefRepository.replaceCourseItems(courseId, next);
    await appendCourseBrief(courseId);
  };

  const exportableEvents = calendarEventsFromBrief(items);
  if (exportableEvents.length > 0) {
    const calendar = document.createElement("section");
    calendar.className = "calendar-export";
    const heading = document.createElement("h2");
    heading.textContent = "Calendar export";
    const selected = new Set(exportableEvents.map((event) => event.eventId));
    calendar.append(heading);
    for (const event of exportableEvents) {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selected.add(event.eventId);
        else selected.delete(event.eventId);
      });
      label.append(
        checkbox,
        ` ${event.title} · ${event.date}${event.time ? ` ${event.time}` : ""}`
      );
      calendar.append(label);
    }
    const selectNone = document.createElement("button");
    selectNone.type = "button";
    selectNone.className = "secondary-action";
    selectNone.textContent = "Select none";
    selectNone.addEventListener("click", () => {
      selected.clear();
      calendar.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = false;
      });
    });
    const download = document.createElement("button");
    download.type = "button";
    download.className = "primary-action";
    download.textContent = "Export .ics";
    download.addEventListener("click", () => {
      const chosen = exportableEvents.filter((event) => selected.has(event.eventId));
      if (chosen.length === 0) return;
      const blob = new Blob([serializeCalendar(courseId, chosen)], {
        type: "text/calendar;charset=utf-8"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${course?.courseCode ?? courseId}-syllab.ics`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    });
    calendar.append(selectNone, download);
    content.append(calendar);
  }

  const scanAgain = document.createElement("button");
  scanAgain.type = "button";
  scanAgain.className = "secondary-action";
  scanAgain.textContent = "Scan again";
  scanAgain.addEventListener("click", () => {
    void beginDiscovery({ surface: "scan", state: "ready", courseId }).catch((error: unknown) =>
      render(
        { surface: "course-brief", courseId },
        error instanceof Error ? error.message : "A new scan could not start"
      )
    );
  });
  content.append(scanAgain);

  if (course?.pendingReviewCount && course.lastEffectiveScanId) {
    const pending = document.createElement("p");
    pending.className = "unresolved-field";
    pending.textContent = `${String(course.pendingReviewCount)} items need review`;
    const continueReview = document.createElement("button");
    continueReview.type = "button";
    continueReview.className = "secondary-action";
    continueReview.textContent = "Continue review";
    continueReview.addEventListener("click", () => {
      render(
        { surface: "review", courseId, scanId: course.lastEffectiveScanId ?? "" },
        "Review progress"
      );
    });
    content.append(pending, continueReview);
  }

  if (items.length === 0 && !course?.pendingReviewCount) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent =
      "No items detected in the supported sources. This does not mean the course has no information.";
    content.append(empty);
    if (course?.lastEffectiveScanId) {
      const scanId = course.lastEffectiveScanId;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "secondary-action";
      retry.textContent = "Retry extraction";
      retry.addEventListener("click", () => {
        retry.disabled = true;
        void beginExtraction({
          surface: "scan",
          state: "scanning",
          courseId,
          scanId,
          phase: "extract"
        }).catch((error: unknown) => {
          render(
            { surface: "course-brief", courseId },
            error instanceof Error ? error.message : "Extraction retry failed"
          );
        });
      });
      content.append(retry);
    }
  } else if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Confirmed course facts will appear here as you review them.";
    content.append(empty);
  }
  const topLevelItems = items.filter((item) => !item.parentBriefItemId);
  for (const category of ["assessment", "important_date", "important_rule"] as const) {
    const section = document.createElement("section");
    section.className = "brief-section";
    const sectionHeading = document.createElement("h2");
    sectionHeading.textContent =
      category === "assessment"
        ? "Assessments"
        : category === "important_date"
          ? "Other Important Dates"
          : "Important Rules";
    const add = document.createElement("button");
    add.type = "button";
    add.className = "secondary-action";
    add.textContent = `Add ${category.replace("_", " ")}`;
    add.addEventListener("click", () => {
      const value = promptValue(`Add ${category.replace("_", " ")} as JSON`);
      if (value) void saveItems(addUserBriefItem(items, courseId, category, value));
    });
    section.append(sectionHeading, add);

    for (const item of topLevelItems.filter((current) => current.kind === category)) {
      const card = document.createElement("article");
      card.className = "brief-card";
      const value = document.createElement("pre");
      value.textContent = JSON.stringify(item.currentValue, null, 2);
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "secondary-action";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        const edited = promptValue("Edit the confirmed JSON value", item.currentValue);
        if (edited) void saveItems(editBriefItem(items, item.briefItemId, edited));
      });
      card.append(value, edit);
      for (const [field, state] of Object.entries(item.fieldStates)) {
        if (state.status !== "Unresolved") continue;
        const unresolved = document.createElement("div");
        unresolved.className = "unresolved-field";
        unresolved.append(`${field}: Needs review`);
        for (const option of state.candidateValues ?? []) {
          const choose = document.createElement("button");
          choose.type = "button";
          choose.className = "secondary-action";
          choose.textContent = `Use ${JSON.stringify(option)}`;
          choose.addEventListener("click", () => {
            void saveItems(resolveBriefField(items, item.briefItemId, field, option));
          });
          unresolved.append(choose);
        }
        card.append(unresolved);
      }
      if (item.kind === "assessment") {
        const children = items.filter((child) => child.parentBriefItemId === item.briefItemId);
        for (const child of children) {
          const childContent = document.createElement("section");
          childContent.className = "brief-child";
          const childHeading = document.createElement("h3");
          childHeading.textContent =
            child.kind === "important_date" ? "Important date" : "Requirement";
          const childValue = document.createElement("pre");
          childValue.textContent = JSON.stringify(child.currentValue, null, 2);
          const childEdit = document.createElement("button");
          childEdit.type = "button";
          childEdit.className = "secondary-action";
          childEdit.textContent = "Edit";
          childEdit.addEventListener("click", () => {
            const edited = promptValue("Edit the confirmed JSON value", child.currentValue);
            if (edited) void saveItems(editBriefItem(items, child.briefItemId, edited));
          });
          childContent.append(childHeading, childValue, childEdit);
          if (child.evidenceRefs.length > 0) {
            const childSource = document.createElement("details");
            const childSummary = document.createElement("summary");
            childSummary.textContent = "Source";
            const childEvidence = document.createElement("p");
            childEvidence.className = "evidence";
            childEvidence.textContent = child.evidenceRefs
              .map((reference) => `${reference.sourceId} · ${reference.locator}`)
              .join("\n");
            childSource.append(childSummary, childEvidence);
            childContent.append(childSource);
          }
          card.append(childContent);
        }
      }
      if (item.evidenceRefs.length > 0) {
        const source = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "Source";
        const evidence = document.createElement("p");
        evidence.className = "evidence";
        evidence.textContent = item.evidenceRefs
          .map((reference) => `${reference.sourceId} · ${reference.locator}`)
          .join("\n");
        source.append(summary, evidence);
        card.append(source);
      }
      section.append(card);
    }
    content.append(section);
  }
  app.insertBefore(content, app.querySelector(".status"));
}

void resolveCurrentEntry().then(
  async (route) => {
    render(route, `Entry route: ${route.surface}${"state" in route ? ` · ${route.state}` : ""}`);
    if (route.surface === "scan" && route.scanId) {
      if (route.state === "waiting-for-permission" || route.phase === "parse") {
        const response: unknown = await chrome.runtime.sendMessage({
          contractVersion: CONTRACT_VERSION,
          type: "GET_FETCH_STATE",
          scanId: route.scanId
        });
        const state = isRecord(response) ? parseFetchState(response.state) : null;
        render(
          route,
          route.state === "waiting-for-permission"
            ? "Choose how to handle this attachment host"
            : fetchStateLabel("Complete", state),
          false,
          state
        );
      } else if (route.phase === "normalize") {
        const response: unknown = await chrome.runtime.sendMessage({
          contractVersion: CONTRACT_VERSION,
          type: "GET_PARSE_STATE",
          scanId: route.scanId
        });
        const state = isRecord(response) ? parseParseState(response.state) : null;
        render(
          route,
          state
            ? `Parse checkpoint · ${String(state.parsed)} parsed · ${String(state.partial)} partial · ${String(state.unsupported)} unsupported · ${String(state.failed)} failed`
            : "Parse checkpoint unavailable",
          false,
          null,
          state
        );
      } else if (route.phase === "extract") {
        const response: unknown = await chrome.runtime.sendMessage({
          contractVersion: CONTRACT_VERSION,
          type: "GET_NORMALIZE_STATE",
          scanId: route.scanId
        });
        const state = isRecord(response) ? parseNormalizeState(response.state) : null;
        render(
          route,
          state
            ? `Normalize checkpoint · ${String(state.unitCount)} units · ${String(state.sourceCount)} sources · ${String(state.duplicateCount)} duplicates`
            : "Normalize checkpoint unavailable"
        );
      } else {
        const summary = await readDiscoverySummary(route.scanId);
        if (summary) render(route, summary.label, summary.needsRefresh);
      }
    }
  },
  () => render({ surface: "saved-courses" }, "Open a course in NTU Learn to begin")
);
