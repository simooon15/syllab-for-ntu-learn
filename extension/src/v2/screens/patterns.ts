import { append, attr, control, data, el, paragraph, PROSE_LIMIT } from "../../app/dom";
import type { CurrentMark } from "../schema";
import { SCAN_STAGES, stageCopy, t } from "../copy";
import type {
  AppView,
  EvidenceView,
  FactView,
  Mutation,
  ScreenId,
  StatusCue,
  Surface,
  TaskStatusView
} from "../contract";

// ---------------------------------------------------------------------------
// Runtime types shared by every screen module
// ---------------------------------------------------------------------------

export type HintKey = "split" | "same-assessment-as";

export interface RuntimeNotice {
  screen?: ScreenId;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Data the runtime hands the renderer: it changes without the view changing. */
export interface RuntimeState {
  hints: Partial<Record<HintKey, boolean>>;
  notice: RuntimeNotice | undefined;
  error: { code: string; copy: string; detail?: string } | undefined;
  /** Restore progress: Reading (0), Validating (1), Restoring (2). Never a percentage. */
  restoreStage: number | undefined;
}

/** Local screen state. It survives a re-render and is reset when the route changes. */
export interface UiState {
  detailAssessmentId: string | undefined;
  editingAssessmentId: string | undefined;
  editingReviewId: string | undefined;
  addingAssessment: boolean;
  semesterSwitcherOpen: boolean;
  courseMoreOpen: boolean;
  reviewMoreOpen: boolean;
  mergeOpen: boolean;
  splitOpen: boolean;
  splitParts: Array<{ name: string; factIds: string[] }>;
  attentionOpen: boolean;
  rebuildConfirmOpen: boolean;
  notEstablishedCourseId: string | undefined;
  evidence: string[];
  expanded: string[];
  conflictEditing: boolean;
  apiKeyDraft: string;
  apiKeyReveal: boolean;
}

export function createUiState(): UiState {
  return {
    detailAssessmentId: undefined,
    editingAssessmentId: undefined,
    editingReviewId: undefined,
    notEstablishedCourseId: undefined,
    addingAssessment: false,
    semesterSwitcherOpen: false,
    courseMoreOpen: false,
    reviewMoreOpen: false,
    mergeOpen: false,
    splitOpen: false,
    splitParts: [],
    attentionOpen: false,
    rebuildConfirmOpen: false,
    evidence: [],
    expanded: [],
    conflictEditing: false,
    apiKeyDraft: "",
    apiKeyReveal: false
  };
}

export interface Actions {
  /** Read-only runtime data. The runtime mutates this object before every render. */
  readonly runtime: RuntimeState;
  onMutation(mutation: Mutation): void;
  onOpenScreen(screen: ScreenId, context?: { courseId?: string; semesterId?: string }): void;
  onOpenSettings(focus?: "ai" | "authorization" | "data" | "about"): void;
  onOpenFullPage(): void;
  onExportCalendar(courseId: string): void;
  onExportBackup(): void;
  onRestoreBackup(payload: unknown): void;
  onConfirmRestore(): void;
  onCancelRestore(): void;
  onSetApiKey(apiKey: string): void;
  onValidateApiKey(): void;
  onSetAuthorization(kind: "privacy" | "apiUsage", granted: boolean): void;
  onGrantPermission(workflowId: string): void;
  onHintSeen(hint: HintKey): void;
  onNotify(notice: RuntimeNotice): void;
  onDismissNotice(): void;
  onRetry(): void;
}

export interface ScreenContext {
  view: AppView;
  surface: Surface;
  ui: UiState;
  actions: Actions;
  repaint(): void;
  open(screen: ScreenId, context?: { courseId?: string; semesterId?: string }): void;
}

// ---------------------------------------------------------------------------
// Small shared builders
// ---------------------------------------------------------------------------

/** Marks the root of a screen (or an embedded screen state) for automation. */
export function screenNode(node: HTMLElement, screen: ScreenId): HTMLElement {
  node.dataset.screen = screen;
  return node;
}

/** Marks one of the shared interaction patterns (SYS-xx), which are not screens. */
export function patternNode(node: HTMLElement, pattern: string): HTMLElement {
  node.dataset.pattern = pattern;
  return node;
}

export function isExpanded(ctx: ScreenContext, key: string): boolean {
  return ctx.ui.expanded.includes(key);
}

export function setExpanded(ctx: ScreenContext, key: string, open: boolean): void {
  ctx.ui.expanded = open
    ? [...new Set([...ctx.ui.expanded, key])]
    : ctx.ui.expanded.filter((item) => item !== key);
}

export function toggleEvidence(ctx: ScreenContext, key: string): void {
  ctx.ui.evidence = ctx.ui.evidence.includes(key)
    ? ctx.ui.evidence.filter((item) => item !== key)
    : [...ctx.ui.evidence, key];
}

export function sectionHeading(text: string, className = "section-heading"): HTMLElement {
  return el("h2", className, text);
}

export function groupHeading(text: string): HTMLElement {
  return el("h3", "group-heading", text);
}

export function actionRow(...children: Array<HTMLElement | null | undefined>): HTMLElement {
  const row = el("div", "actions");
  append(row, ...children);
  return row;
}

/** The unlabelled chevron `‹` that returns to the surface a screen came from. */
export function backAction(
  target: "semester" | "course" | "previous",
  onActivate: () => void
): HTMLButtonElement {
  const label =
    target === "semester"
      ? t("backToSemester")
      : target === "course"
        ? t("backToCourse")
        : t("back");
  const node = control(t("backChevron"), "back-action", onActivate);
  return attr(node, { "aria-label": label });
}

export function primaryAction(label: string, onActivate: () => void): HTMLButtonElement {
  return control(label, "primary-action", onActivate);
}

export function secondaryAction(label: string, onActivate: () => void): HTMLButtonElement {
  return control(label, "secondary-action", onActivate);
}

export function linkAction(label: string, onActivate: () => void): HTMLButtonElement {
  return control(label, "link-action", onActivate);
}

/** Object-level and fact-level Current State marks. */
export function markChips(marks: CurrentMark[]): HTMLElement[] {
  return marks.map((mark) =>
    data(el("span", `mark mark-${mark.toLowerCase()}`, markText(mark)), { mark })
  );
}

function markText(mark: CurrentMark): string {
  if (mark === "Edited") return t("markEdited");
  if (mark === "Changed") return t("markChanged");
  return t("markPossiblyRemoved");
}

/** Long prose is cut at a sentence-friendly length behind a light disclosure. */
export function prose(ctx: ScreenContext, key: string, text: string): HTMLElement {
  if (text.length <= PROSE_LIMIT) return paragraph("prose", text);
  const open = isExpanded(ctx, key);
  const body = open ? text : `${text.slice(0, PROSE_LIMIT).trimEnd()}…`;
  const block = el("div", "prose-block");
  block.append(
    paragraph("prose", body),
    linkAction(open ? t("showLess") : t("showMore"), () => {
      setExpanded(ctx, key, !open);
      ctx.repaint();
    })
  );
  return block;
}

// ---------------------------------------------------------------------------
// SYS-04 — Evidence: a fact value is itself the trigger, and swaps in place
// ---------------------------------------------------------------------------

export function evidenceBlock(
  ctx: ScreenContext,
  key: string,
  evidence: EvidenceView[]
): HTMLElement {
  const block = screenNode(el("div", "evidence is-evidence"), "CRS-05");
  data(block, { evidenceKey: key });
  // Every source appears together in the same evidence state; any locator returns to the fact.
  for (const item of evidence) {
    block.append(
      control(`${item.sourceTitle} · ${item.locator}`, "evidence-locator", () => {
        toggleEvidence(ctx, key);
        ctx.repaint();
      }),
      paragraph("evidence-excerpt", item.excerpt)
    );
  }
  return block;
}

/** One fact: label, value (the evidence trigger), marks, and the specific question if unsure. */
export function factRow(ctx: ScreenContext, scope: string, fact: FactView): HTMLElement {
  const row = el("div", "fact");
  data(row, { field: fact.field, factId: fact.factId });
  row.append(paragraph("fact-label", fact.label));
  const key = `${scope}:${fact.factId}`;
  row.append(
    ctx.ui.evidence.includes(key)
      ? evidenceBlock(ctx, key, fact.evidence)
      : factValue(ctx, key, fact)
  );
  if (fact.mark !== undefined) append(row, ...markChips([fact.mark]));
  if (fact.knowledge === "UNCERTAIN") {
    row.append(paragraph("fact-question", t("unclearFact", { label: fact.label })));
  }
  const competing = fact.competingValues ?? [];
  if (competing.length > 0) {
    row.append(competingValues(ctx, `${scope}:${fact.factId}`, competing, fact.evidence));
  }
  return row;
}

function factValue(ctx: ScreenContext, key: string, fact: FactView): HTMLElement {
  if (fact.evidence.length === 0) {
    // A long Requirement is prose, so it gets a light disclosure instead of a trigger.
    if (fact.display.length > PROSE_LIMIT) return prose(ctx, `prose:${fact.factId}`, fact.display);
    return paragraph("fact-value is-static", fact.display);
  }
  const node = control(fact.display, "fact-value is-swappable is-fact", () => {
    toggleEvidence(ctx, key);
    ctx.repaint();
  });
  attr(node, { "aria-label": t("showEvidence", { label: fact.label }) });
  return node;
}

/** Competing values stay visible together; each one carries its own evidence. */
function competingValues(
  ctx: ScreenContext,
  scope: string,
  values: string[],
  evidence: EvidenceView[]
): HTMLElement {
  const list = el("div", "competing-values");
  values.forEach((value, index) => {
    const key = `${scope}:competing:${String(index)}`;
    if (ctx.ui.evidence.includes(key)) {
      list.append(evidenceBlock(ctx, key, evidence));
      return;
    }
    list.append(
      control(value, "fact-value is-competing is-swappable", () => {
        toggleEvidence(ctx, key);
        ctx.repaint();
      })
    );
  });
  return list;
}

// ---------------------------------------------------------------------------
// SYS-01 / SYS-02 — one status position, never stacked
// ---------------------------------------------------------------------------

const STATUS_PRIORITY: readonly StatusCue["kind"][] = [
  "api-key",
  "permission",
  "authorization",
  "needs-attention",
  "pending-review",
  "checking",
  "freshness"
];

/**
 * Needs user action > Pending Review > Checking > transient Freshness. Exactly one cue is shown.
 */
export function primaryStatus(cues: StatusCue[]): StatusCue | null {
  for (const kind of STATUS_PRIORITY) {
    const found = cues.find((cue) => cue.kind === kind);
    if (found) return found;
  }
  return null;
}

export function statusText(
  cue: StatusCue,
  surface: Surface,
  location: "course" | "semester" = "course"
): string {
  switch (cue.kind) {
    case "pending-review":
      return surface === "side-panel"
        ? t("statusReviewCompact", { count: cue.count })
        : t("statusReviewFull", { count: cue.count });
    case "checking":
      return location === "semester" ? t("semesterCheckingCourses") : t("statusChecking");
    case "needs-attention":
      // A Semester-wide cue already names what needs attention.
      return location === "semester" ? cue.copy : t("statusNeedsAttention");
    case "api-key":
      return t("statusApiKey");
    case "permission":
      return t("statusPermission");
    case "authorization":
      return t("statusAuthorization");
    case "freshness":
      return cue.copy;
  }
}

/**
 * The status position. A pending Review is the entry point to Review, not navigation;
 * an attention cue opens its detail in place.
 */
export function statusArea(
  ctx: ScreenContext,
  cues: StatusCue[],
  location: "course" | "semester"
): HTMLElement | null {
  const cue = primaryStatus(cues);
  if (!cue) return null;
  const area = el("div", "status-area");
  data(area, { kind: cue.kind, location });
  const text = statusText(cue, ctx.surface, location);
  if (cue.kind === "pending-review") {
    const courseId = ctx.view.courseId;
    area.append(
      control(text, "status-cue is-action", () => {
        // The status area is the only entry to Review. The requested id is the Initial
        // Review route; the service worker answers with whichever item is pending and the
        // renderer lays it out from the item itself (see render.ts reviewLayout).
        ctx.open("IRV-01", courseId === undefined ? undefined : { courseId });
      })
    );
  } else if (cue.kind === "needs-attention") {
    area.append(
      control(text, "status-cue is-action", () => {
        ctx.ui.attentionOpen = !ctx.ui.attentionOpen;
        ctx.repaint();
      })
    );
  } else if (cue.kind === "api-key" || cue.kind === "permission" || cue.kind === "authorization") {
    // A cue that says something is wrong and then does nothing about it is a dead end, and the
    // Side Panel had no other way to Settings at all: the panel would report a missing API key to
    // a user who could not act on it from where they were standing. These three are all things
    // Settings is where you fix, so the cue goes there.
    area.append(control(text, "status-cue is-action", () => ctx.actions.onOpenSettings()));
  } else {
    area.append(el("span", "status-cue", text));
  }
  return area;
}

/** SYS-03 — the reason behind an attention cue, with its own retry. */
export function attentionDetail(ctx: ScreenContext, cues: StatusCue[]): HTMLElement | null {
  const cue = primaryStatus(cues);
  if (!cue || cue.kind !== "needs-attention" || !ctx.ui.attentionOpen) return null;
  const block = patternNode(el("div", "attention-detail"), "SYS-03");
  block.append(paragraph("attention-title", t("attentionOutOfDate")));
  if (cue.detail !== undefined) block.append(paragraph("attention-note", cue.detail));
  const courseId = ctx.view.courseId;
  if (courseId !== undefined) {
    block.append(
      linkAction(t("tryAgain"), () => {
        ctx.actions.onMutation({ kind: "CheckForUpdates", courseId });
      })
    );
  }
  return block;
}

// ---------------------------------------------------------------------------
// SYS-05 — a contextual hint that is only ever shown once
// ---------------------------------------------------------------------------

export function contextualHint(hint: HintKey, text: string): HTMLElement {
  const node = screenNode(el("p", "contextual-hint"), "IRV-05");
  data(node, { hint });
  node.textContent = text;
  return node;
}

/** The hint for a first-use action, or null once the user has seen it. */
export function hintFor(ctx: ScreenContext, hint: HintKey, text: string): HTMLElement | null {
  if (ctx.actions.runtime.hints[hint] === true) return null;
  return contextualHint(hint, text);
}

/** Records the first use of an action so its hint never appears again. */
export function useHint(ctx: ScreenContext, hint: HintKey): void {
  if (ctx.actions.runtime.hints[hint] !== true) ctx.actions.onHintSeen(hint);
}

// ---------------------------------------------------------------------------
// SYS-06 — lightweight feedback, no completion page
// ---------------------------------------------------------------------------

export function noticeBar(ctx: ScreenContext, notice: RuntimeNotice): HTMLElement {
  const node =
    notice.screen === undefined
      ? el("div", "notice")
      : screenNode(el("div", "notice"), notice.screen);
  node.append(el("span", "notice-message", notice.message));
  if (notice.actionLabel !== undefined && notice.onAction !== undefined) {
    node.append(linkAction(notice.actionLabel, notice.onAction));
  }
  node.append(
    control(t("noticeDismiss"), "notice-dismiss", () => {
      ctx.actions.onDismissNotice();
    })
  );
  return node;
}

export function noticeFor(ctx: ScreenContext): HTMLElement | null {
  const notice = ctx.actions.runtime.notice;
  return notice ? noticeBar(ctx, notice) : null;
}

/** SYS-07 — the user-facing reason first, the stable code only inside details. */
export function errorBar(ctx: ScreenContext): HTMLElement | null {
  const error = ctx.actions.runtime.error;
  if (!error) return null;
  const block = patternNode(el("div", "error-bar"), "SYS-07");
  block.append(paragraph("error-copy", error.copy));
  const open = isExpanded(ctx, "error-details");
  block.append(
    linkAction(open ? t("hideDetails") : t("viewDetails"), () => {
      setExpanded(ctx, "error-details", !open);
      ctx.repaint();
    })
  );
  if (open) {
    const details = screenNode(el("div", "error-details"), "ISC-06");
    if (error.detail !== undefined) {
      details.append(paragraph("error-detail", error.detail));
    }
    details.append(paragraph("error-code", t("errorCodeLabel", { code: error.code })));
    block.append(details);
  }
  block.append(
    linkAction(t("tryAgain"), () => {
      ctx.actions.onRetry();
    })
  );
  return block;
}

// ---------------------------------------------------------------------------
// Task status — never navigation, never a percentage
// ---------------------------------------------------------------------------

/** Task Status is a state of the screen it belongs to, never a screen of its own. */
export function taskBlock(
  ctx: ScreenContext,
  task: TaskStatusView,
  options: { forceDetails?: boolean } = {}
): HTMLElement {
  const block = el("section", "task-block");
  data(block, { state: task.state, workflowId: task.workflowId, region: "task" });
  if (task.state === "working") {
    const stage = task.phase ?? SCAN_STAGES[0];
    const current = SCAN_STAGES.indexOf(stage);
    // The active stage breathes; finished stages stay still, so only one thing moves.
    block.append(el("p", "task-phase is-working", stageCopy(stage)));
    block.append(el("span", "working-marker"));
    const list = el("ol", "task-list");
    SCAN_STAGES.forEach((item, index) => {
      const row = el("li", undefined, stageCopy(item));
      row.dataset.state = index < current ? "complete" : index === current ? "active" : "pending";
      list.append(row);
    });
    block.append(list);
  }
  if (task.state === "waiting" && task.waiting) {
    const waiting = task.waiting;
    const copy = waitingCopy(waiting.reason);
    block.append(el("h2", "task-title", copy.title));
    block.append(paragraph("task-body", copy.body));
    const action = waiting.action ?? (waiting.reason === "api-key" ? "OpenSettings" : undefined);
    if (action === "OpenSettings") {
      block.append(
        primaryAction(t("actionOpenSettings"), () => {
          ctx.actions.onOpenSettings(waiting.reason === "api-key" ? "ai" : "authorization");
        })
      );
    } else if (action === "GrantPermission") {
      block.append(
        primaryAction(t("actionGrantPermission"), () => {
          ctx.actions.onGrantPermission(task.workflowId);
        })
      );
    } else if (action === "Resume") {
      block.append(
        primaryAction(t("actionResume"), () => {
          ctx.actions.onMutation({ kind: "RetryTask", workflowId: task.workflowId });
        })
      );
    }
  }
  if (task.state === "failed" && task.failure) {
    const failure = task.failure;
    block.append(el("h2", "task-title", t("scanFailedTitle")));
    block.append(paragraph("task-body", failure.copy));
    block.append(
      primaryAction(t("tryAgain"), () => {
        ctx.actions.onMutation({ kind: "RetryTask", workflowId: task.workflowId });
      })
    );
    const open =
      options.forceDetails === true || isExpanded(ctx, `failure-details:${task.workflowId}`);
    block.append(
      linkAction(open ? t("hideDetails") : t("viewDetails"), () => {
        setExpanded(ctx, `failure-details:${task.workflowId}`, !open);
        ctx.repaint();
      })
    );
    if (open) {
      const details = screenNode(el("div", "error-details"), "ISC-06");
      details.append(paragraph("error-code", t("errorCodeLabel", { code: failure.errorCode })));
      block.append(details);
    }
  }
  return block;
}

function waitingCopy(reason: NonNullable<TaskStatusView["waiting"]>["reason"]): {
  title: string;
  body: string;
} {
  switch (reason) {
    case "api-key":
      return { title: t("scanWaitingApiKeyTitle"), body: t("scanWaitingApiKeyBody") };
    case "host-permission":
      return { title: t("scanWaitingPermissionTitle"), body: t("scanWaitingPermissionBody") };
    case "privacy-authorization":
    case "api-usage-authorization":
      return { title: t("scanWaitingPermissionTitle"), body: t("scanWaitingAuthorizationBody") };
  }
}

// ---------------------------------------------------------------------------
// Product Mark
// ---------------------------------------------------------------------------

/** Sizes the shipped PNGs exist at; anything else would be a resampled stand-in. */
const MARK_SIZES = [16, 32, 48, 128] as const;

/**
 * The Syllab Product Mark, from the official asset set. The mark is never redrawn, recoloured or
 * substituted: the element loads the PNG exported from `assets/logo/syllab-logo-master.svg`, and
 * the nearest shipped size is used so the browser scales by at most one step.
 */
export function brandMark(size: 16 | 32 | 48 | 128 = 48): HTMLElement {
  const mark = el("span", "brand-mark");
  mark.setAttribute("aria-hidden", "true");
  const image = el("img", "brand-mark-image");
  // The attribute, not the property: a static extension-relative path should stay exactly as
  // written rather than being resolved against the page.
  image.setAttribute("src", `icons/syllab-logo-${String(size)}px.png`);
  image.alt = "";
  image.width = size;
  image.height = size;
  image.decoding = "async";
  mark.append(image);
  return mark;
}

export { MARK_SIZES };
