import { el } from "../../app/dom";
import { t } from "../copy";
import type { AppView, ScreenId, SemesterView, Surface } from "../contract";
import { renderCalendar } from "./calendar";
import { renderChangeReview, type ChangeLayout } from "./change-review";
import { renderCourse } from "./course";
import { renderInitialReview } from "./initial-review";
import {
  brandMark,
  createUiState,
  errorBar,
  type Actions,
  type ScreenContext,
  type UiState
} from "./patterns";
import { renderRebuild } from "./rebuild";
import { renderScan } from "./scan";
import { renderNotEstablishedPrompt, renderSemester } from "./semester";
import { renderRestoreFailed, renderRestoreWorking, renderSettings } from "./settings";

export const SEMESTER_SCREENS: readonly ScreenId[] = [
  "SEM-01",
  "SEM-02",
  "SEM-03",
  "SEM-04",
  "SEM-05",
  "SEM-06",
  "SEM-07"
];
export const COURSE_SCREENS: readonly ScreenId[] = [
  "CRS-01",
  "CRS-02",
  "CRS-03",
  "CRS-04",
  "CRS-05",
  "CRS-06"
];
export const SCAN_SCREENS: readonly ScreenId[] = [
  "ISC-01",
  "ISC-02",
  "ISC-03",
  "ISC-04",
  "ISC-05",
  "ISC-06"
];
export const REVIEW_SCREENS: readonly ScreenId[] = [
  "IRV-01",
  "IRV-02",
  "IRV-03",
  "IRV-04",
  "IRV-05",
  "IRV-06",
  "CRV-01",
  "CRV-02",
  "CRV-03",
  "CRV-04",
  "CRV-05",
  "CRV-06"
];
export const SETTINGS_SCREENS: readonly ScreenId[] = [
  "SET-01",
  "SET-02",
  "SET-03",
  "SET-04",
  "SET-05",
  "BKP-01",
  "BKP-02",
  "BKP-03",
  "BKP-04",
  "BKP-05"
];

let ui: UiState = createUiState();
let lastCourseId: string | undefined;
let lastReviewItemId: string | undefined;
let lastScreen: ScreenId | undefined;
const scrollByScreen = new Map<ScreenId, number>();

export function resetUiState(): void {
  ui = createUiState();
  lastCourseId = undefined;
  lastReviewItemId = undefined;
  scrollByScreen.clear();
}

export function uiState(): UiState {
  return ui;
}

/**
 * Renders one whole state. The tree is replaced outright; only the active list's scroll
 * position and the local screen state survive.
 */
export function renderApp(
  root: HTMLElement,
  view: AppView,
  actions: Actions,
  onRepaint?: () => void
): void {
  const surface = resolveSurface(view);
  const context: ScreenContext = {
    view,
    surface,
    ui,
    actions,
    repaint: () => {
      (onRepaint ?? paint)();
    },
    open: (screen, options) => {
      actions.onOpenScreen(screen, options);
    }
  };

  const paint = (): void => {
    // A different Course starts clean; the first paint of a Course keeps what was set up.
    if (lastCourseId !== undefined && view.courseId !== lastCourseId) {
      context.ui.detailAssessmentId = undefined;
      context.ui.editingAssessmentId = undefined;
      context.ui.addingAssessment = false;
      context.ui.rebuildConfirmOpen = false;
      context.ui.notEstablishedCourseId = undefined;
      context.ui.courseMoreOpen = false;
      context.ui.evidence = [];
      context.ui.expanded = [];
    }
    lastCourseId = view.courseId;
    // Structural corrections belong to the item they were opened on, never to the next one.
    if (lastReviewItemId !== undefined && view.review?.reviewItemId !== lastReviewItemId) {
      context.ui.splitOpen = false;
      context.ui.mergeOpen = false;
      context.ui.splitParts = [];
      context.ui.editingReviewId = undefined;
      context.ui.conflictEditing = false;
      context.ui.reviewMoreOpen = false;
    }
    lastReviewItemId = view.review?.reviewItemId;
    const screen = resolveScreen(view, context.ui, surface);
    const scroller = scrollingElement(root);
    const previous = scroller?.scrollTop ?? 0;
    const keepScroll = lastScreen === screen;
    const bar = errorBar(context);
    const tree = buildScreen(context, screen);
    // A refused request is the only thing that renders outside the screen it happened on.
    root.replaceChildren(...(bar ? [bar, tree] : [tree]));
    if (scroller) scroller.scrollTop = keepScroll ? (scrollByScreen.get(screen) ?? previous) : 0;
    scrollByScreen.set(screen, scroller?.scrollTop ?? 0);
    lastScreen = screen;
  };

  paint();
}

/** Families that are a destination the user reads, as opposed to a focused task flow. */
function buildScreen(context: ScreenContext, screen: ScreenId): HTMLElement {
  const node = buildScreenBody(context, screen);
  // Every screen carries the identity line, so the top of the app keeps the same shape as the
  // user moves between a Course, a Review and a Scan.
  if (!node.querySelector(".masthead")) {
    const masthead = el("header", "masthead");
    masthead.append(brandMark(48), el("h1", "product-name", t("productName")));
    node.prepend(masthead);
  }
  return node;
}

function buildScreenBody(context: ScreenContext, screen: ScreenId): HTMLElement {
  if (screen === "SEM-07" || screen === "ISC-01") {
    return renderNotEstablishedPrompt(context, screen);
  }
  if (SEMESTER_SCREENS.includes(screen)) return renderSemester(context, screen);
  if (screen === "RBL-01" || screen === "RBL-03") return renderRebuild(context, screen);
  if (
    screen === "ISC-02" ||
    screen === "ISC-03" ||
    screen === "ISC-04" ||
    screen === "ISC-05" ||
    screen === "ISC-06"
  ) {
    return renderScan(context, screen);
  }
  if (screen === "RBL-02" || screen === "RBL-04") return renderScan(context, screen);
  if (COURSE_SCREENS.includes(screen)) return renderCourse(context, screen);
  if (screen === "CAL-01" || screen === "CAL-02") return renderCalendar(context, "CAL-01");
  if (screen === "BKP-03")
    return renderRestoreWorking(context, context.actions.runtime.restoreStage ?? 0);
  if (screen === "BKP-04") return renderRestoreFailed(context);
  if (SETTINGS_SCREENS.includes(screen)) return renderSettings(context);
  if (
    screen === "IRV-01" ||
    screen === "IRV-02" ||
    screen === "IRV-03" ||
    screen === "IRV-04" ||
    screen === "IRV-05"
  ) {
    return renderInitialReview(context, screen);
  }
  if (REVIEW_SCREENS.includes(screen)) {
    return renderChangeReview(context, screen, reviewLayout(context.view, screen));
  }
  return renderSemester(
    context,
    semesterScreen(
      context.view,
      context.surface === "side-panel" ? "SEM-02" : "SEM-01",
      context.surface
    )
  );
}

/** The surface is declared on the document; the view is only a fallback for tests. */
function resolveSurface(view: AppView): Surface {
  const declared = document.documentElement.dataset.surface;
  if (declared === "side-panel" || declared === "full-page") return declared;
  return view.surface;
}

function scrollingElement(root: HTMLElement): HTMLElement | null {
  const candidate = document.scrollingElement;
  if (candidate instanceof HTMLElement) return candidate;
  return root.parentElement;
}

/** Which screen the current state really is. Local states win over the delivered route. */
export function resolveScreen(view: AppView, state: UiState, surface: Surface): ScreenId {
  const screen = view.screen;

  const promptCourseId = state.notEstablishedCourseId;
  const asking =
    promptCourseId !== undefined &&
    (view.courseId === promptCourseId ||
      (view.courseId === undefined && SEMESTER_SCREENS.includes(screen)));
  if (asking || screen === "SEM-07" || screen === "ISC-01") {
    // The prompt asks one question — scan this Course? — and holds the screen only while that
    // question is open. The moment a Scan exists for the Course the run's own state takes over,
    // which is the flow the Interaction Spec draws (`Scan course` → `Finding course content…`).
    // Without this the answer to a question the user already answered is still the question: the
    // prompt stays up through the scan, through a failure, and after the Brief is ready.
    if (view.task) return scanScreen(view, "ISC-02");
    if (asking) return screen === "ISC-01" ? "ISC-01" : "SEM-07";
    return screen;
  }

  if (screen === "RBL-01" || state.rebuildConfirmOpen) return "RBL-01";
  if (screen === "RBL-02") {
    if (view.task?.state === "failed") return "RBL-04";
    if (view.task?.state === "waiting" && view.task.waiting === undefined && view.rebuildPreview) {
      return "RBL-03";
    }
    return "RBL-02";
  }
  if (screen === "RBL-03") return "RBL-03";
  if (screen === "RBL-04") return "RBL-04";

  if (SCAN_SCREENS.includes(screen)) return scanScreen(view, screen);

  if (COURSE_SCREENS.includes(screen)) return courseScreen(view, state, surface, screen);
  if (REVIEW_SCREENS.includes(screen)) return reviewScreen(view, state, surface, screen);
  if (screen === "CAL-01" || screen === "CAL-02") return "CAL-01";
  if (SETTINGS_SCREENS.includes(screen)) return settingsScreen(screen);
  if (SEMESTER_SCREENS.includes(screen)) return semesterScreen(view, screen, surface);

  return semesterScreen(view, surface === "side-panel" ? "SEM-02" : "SEM-01", surface);
}

function semesterScreen(view: AppView, screen: ScreenId, surface: Surface): ScreenId {
  if (screen === "SEM-03") return "SEM-03";
  if (semesterIsEmpty(view.semester)) return "SEM-06";
  if (view.semester?.lifecycle === "Historical")
    return surface === "side-panel" ? "SEM-05" : "SEM-04";
  if (screen === "SEM-04" || screen === "SEM-05") return screen;
  return surface === "side-panel" ? "SEM-02" : "SEM-01";
}

/**
 * Whether a Semester view holds nothing to show.
 *
 * A Semester with no Curriculum Course and no Semester at all are one state to a reader — there is
 * nothing for a dashboard to be about — and the Interaction Spec gives that state one screen
 * (SEM-06). Only the first counts as empty by `semester.empty`, and that is what left a first-time
 * install looking at a bare masthead: the view fell through to SEM-01, and SEM-01 has no Semester
 * to draw, so it drew nothing.
 */
export function semesterIsEmpty(semester: SemesterView | undefined): boolean {
  return semester === undefined || semester.empty;
}

function courseScreen(view: AppView, state: UiState, surface: Surface, screen: ScreenId): ScreenId {
  if (view.course?.noAssessments === true) return "CRS-06";
  if (state.editingAssessmentId !== undefined || screen === "CRS-04") return "CRS-04";
  if (state.detailAssessmentId !== undefined || screen === "CRS-03") return "CRS-03";
  if (screen === "CRS-06") return "CRS-06";
  return surface === "side-panel" ? "CRS-02" : "CRS-01";
}

/** A live workflow decides which Scan state is real; a bare route still renders its state. */
function scanScreen(view: AppView, screen: ScreenId): ScreenId {
  const task = view.task;
  if (!task) return screen;
  if (task.state === "working") return "ISC-02";
  // ISC-06 is the details state of the same failure.
  if (task.state === "failed") return screen === "ISC-06" ? "ISC-06" : "ISC-05";
  // What is left is a run waiting on the user. Waiting has four reasons and a description for
  // each, all of them something the user supplies (§11.7). A run waiting for nothing is a Scan
  // that has finished, and §5.4 sends it straight into the Initial Review it produced — the next
  // thing the user has to do is the review itself. `Waiting for your review` was a screen the
  // product invented: it told the user to finish a review and gave them no way to open one. §5.6
  // makes `Waiting` an internal state that is never user copy. (Gate 3 finding F21.)
  if (task.waiting === undefined) return "IRV-01";
  return task.waiting.reason === "api-key" ? "ISC-03" : "ISC-04";
}

function settingsScreen(screen: ScreenId): ScreenId {
  if (screen === "BKP-03" || screen === "BKP-04") return screen;
  return "SET-01";
}

function reviewLayout(view: AppView, screen: ScreenId): ChangeLayout {
  if (screen === "CRV-01") return "changed";
  if (screen === "CRV-02") return "new";
  if (screen === "CRV-03") return "conflict";
  if (screen === "CRV-04") return "removed";
  if (screen === "CRV-05") return "identity";
  const review = view.review;
  if (review?.kind === "initial") return review.changeType === "NEW" ? "new" : "initial";
  if (review?.changeType === "CONFLICT") return "conflict";
  if (review?.changeType === "POSSIBLY_REMOVED") return "removed";
  if (review?.changeType === "IDENTITY_UNCERTAIN" || review?.kind === "identity") return "identity";
  if (review?.changeType === "NEW") return "new";
  return "changed";
}

function reviewScreen(view: AppView, state: UiState, surface: Surface, screen: ScreenId): ScreenId {
  // §6.7 sends a Review with nothing left in it straight back to the Course Brief: there is no
  // empty Review screen and no completion page. This state used to fall through to the Change
  // Review layout, which drew a `changed` screen about nothing. (Gate 3 finding F33.)
  if (view.review === undefined) return surface === "side-panel" ? "CRS-02" : "CRS-01";
  const layout = reviewLayout(view, screen);
  if (layout === "initial" || layout === "new") {
    if (state.splitOpen) return "IRV-04";
    if (state.mergeOpen) return "IRV-03";
    if (state.editingReviewId !== undefined || screen === "IRV-02") return "IRV-02";
  }
  if (
    screen === "CRV-01" ||
    screen === "CRV-02" ||
    screen === "CRV-03" ||
    screen === "CRV-04" ||
    screen === "CRV-05"
  ) {
    return screen;
  }
  switch (layout) {
    case "initial":
      return "IRV-01";
    case "new":
      return "CRV-02";
    case "conflict":
      return "CRV-03";
    case "removed":
      return "CRV-04";
    case "identity":
      return "CRV-05";
    case "changed":
      return "CRV-01";
  }
}
