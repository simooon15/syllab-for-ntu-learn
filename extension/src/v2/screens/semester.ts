import { append, control, data, el } from "../../app/dom";
import { t } from "../copy";
import type {
  ScreenId,
  SemesterCourseCardView,
  SemesterView,
  StatusCue,
  Surface
} from "../contract";
import {
  actionRow,
  backAction,
  linkAction,
  noticeFor,
  primaryAction,
  primaryStatus,
  screenNode,
  statusArea,
  statusText,
  type ScreenContext
} from "./patterns";

/** SEM-01 Current Semester Dashboard, SEM-04 Historical Semester Dashboard. */
export function renderSemester(ctx: ScreenContext, screen: ScreenId): HTMLElement {
  const semester = ctx.view.semester;
  const surface = ctx.surface;
  const root = screenNode(el("section", `screen semester-screen ${surface}`), screen);
  if (!semester) {
    // No Semester has been discovered yet — the state every first-time install is in. There is no
    // header to draw, but there is still a state to show, and a first-time user still needs the way
    // into Settings. Returning the bare section here is what showed a masthead with nothing under
    // it, which reads as a broken extension rather than as "nothing has been found yet".
    const header = el("div", "semester-header");
    header.append(headerActions(ctx, []));
    root.append(header, renderEmpty(ctx, "Current"));
    const trailing = semesterTrailingAction(ctx, surface);
    if (trailing) root.append(trailing);
    return root;
  }

  root.append(renderSemesterHeader(ctx, semester));
  if (ctx.ui.semesterSwitcherOpen || screen === "SEM-03") {
    root.append(renderSwitcher(ctx, semester, surface));
  }

  append(root, noticeFor(ctx));

  if (semester.empty) {
    root.append(renderEmpty(ctx, semester.lifecycle));
  } else {
    const list = el("div", surface === "side-panel" ? "course-list" : "course-grid");
    data(list, { lifecycle: semester.lifecycle });
    for (const course of semester.courses) list.append(renderCourseCard(ctx, course, surface));
    root.append(list);
  }

  const trailing = semesterTrailingAction(ctx, surface);
  if (trailing) root.append(trailing);
  return root;
}

/**
 * Where a Semester dashboard leads when there is nothing on it to open.
 *
 * Settings is in the header now, so the foot of the page carries only the hand-over a Side Panel
 * cannot perform itself.
 */
function semesterTrailingAction(ctx: ScreenContext, surface: Surface): HTMLElement | null {
  return surface === "side-panel"
    ? actionRow(linkAction(t("openFullDashboard"), () => ctx.actions.onOpenFullPage()))
    : null;
}

function renderSemesterHeader(ctx: ScreenContext, semester: SemesterView): HTMLElement {
  const header = el("div", "semester-header");
  const toggle = control(semester.label, "semester-name semester-switcher-toggle", () => {
    ctx.ui.semesterSwitcherOpen = !ctx.ui.semesterSwitcherOpen;
    ctx.repaint();
  });
  toggle.setAttribute("aria-expanded", String(ctx.ui.semesterSwitcherOpen));
  toggle.setAttribute("aria-label", t("semesterSwitch"));
  const left = el("div", "semester-title");
  left.append(toggle);
  if (semester.lifecycle === "Historical") {
    left.append(el("span", "semester-badge", t("semesterHistoricalBadge")));
  }
  header.append(left, headerActions(ctx, semester.status));
  return header;
}

/**
 * The right-hand end of a screen header: what the screen is reporting, and the way into Settings.
 *
 * Settings belongs at the top right, which is where a settings affordance is looked for. It used to
 * sit at the foot of the Full-page dashboard, and the Side Panel had no entry to it at all — so the
 * surface that most needs it, the one that reports a missing API key, could not reach it.
 * (Gate 3 findings F7 and F8.)
 */
function headerActions(ctx: ScreenContext, status: readonly StatusCue[]): HTMLElement {
  const actions = el("div", "semester-actions");
  const area = statusArea(ctx, [...status], "semester");
  if (area) actions.append(area);
  actions.append(linkAction(t("settingsLink"), () => ctx.actions.onOpenSettings()));
  return actions;
}

/** SEM-03 Semester Switcher — Current and Historical Semesters in one in-place list. */
function renderSwitcher(ctx: ScreenContext, semester: SemesterView, surface: Surface): HTMLElement {
  const panel = screenNode(el("div", "semester-switcher"), "SEM-03");
  for (const option of semester.switcherOptions) {
    const selected = option.semesterId === semester.semesterId;
    const historical = option.lifecycle === "Historical";
    const target: ScreenId = historical
      ? surface === "side-panel"
        ? "SEM-05"
        : "SEM-04"
      : surface === "side-panel"
        ? "SEM-02"
        : "SEM-01";
    const item = control(option.label, "switcher-option", () => {
      ctx.ui.semesterSwitcherOpen = false;
      ctx.ui.notEstablishedCourseId = undefined;
      ctx.open(target, { semesterId: option.semesterId });
    });
    data(item, { lifecycle: option.lifecycle, selected: String(selected) });
    item.setAttribute("aria-current", selected ? "true" : "false");
    if (selected) item.append(el("span", "switcher-current", t("semesterCurrentBadge")));
    panel.append(item);
  }
  return panel;
}

function renderEmpty(ctx: ScreenContext, lifecycle: SemesterView["lifecycle"]): HTMLElement {
  const block = screenNode(el("div", "empty-state-block"), "SEM-06");
  block.append(
    el(
      "p",
      "empty-state",
      lifecycle === "Historical" ? t("semesterEmptyHistorical") : t("semesterEmpty")
    )
  );
  append(block, noticeFor(ctx));
  return block;
}

function renderCourseCard(
  ctx: ScreenContext,
  course: SemesterCourseCardView,
  surface: Surface
): HTMLElement {
  const card = el("article", course.established ? "course-card" : "course-card is-untouched");
  data(card, { courseId: course.courseId, established: String(course.established) });

  const main = control("", "course-card-main", () => openCourse(ctx, course, surface));
  main.append(el("strong", "course-code", course.courseCode));
  main.append(el("span", "course-name", course.courseName));
  if (course.established && surface === "full-page") {
    const preview = el("div", "course-preview");
    for (const group of course.preview) {
      preview.append(el("span", "preview-group", group.group));
      for (const line of group.lines) preview.append(el("span", "preview-line", line));
    }
    if (course.moreAssessments !== undefined) {
      preview.append(
        el("span", "preview-more", t("moreAssessments", { count: course.moreAssessments }))
      );
    }
    main.append(preview);
  }
  card.append(main);

  const cue = primaryStatus(course.status);
  if (cue) {
    const status = el("div", "course-card-status");
    data(status, { kind: cue.kind });
    if (cue.kind === "pending-review") {
      status.append(
        control(statusText(cue, surface), "status-cue is-action", () => {
          ctx.open("IRV-01", { courseId: course.courseId });
        })
      );
    } else {
      status.append(el("span", "status-cue", statusText(cue, surface)));
    }
    card.append(status);
  } else if (!course.established) {
    // The same box as every other card, with its own line in the slot the others use for a status
    // cue — so the two line up across a row and the card does not announce itself with a different
    // shape.
    const note = el("div", "course-card-status");
    note.append(el("span", "course-card-note", t("notEstablishedPrompt")));
    card.append(note);
  }
  return card;
}

/** An established Course opens its Brief; an untouched one opens the light Scan prompt. */
function openCourse(ctx: ScreenContext, course: SemesterCourseCardView, surface: Surface): void {
  if (!course.established) {
    ctx.ui.notEstablishedCourseId = course.courseId;
    ctx.repaint();
    return;
  }
  ctx.open(surface === "side-panel" ? "CRS-02" : "CRS-01", { courseId: course.courseId });
}

/** SEM-07 / ISC-01 — the light prompt shown before anything is scanned. */
export function renderNotEstablishedPrompt(ctx: ScreenContext, screen: ScreenId): HTMLElement {
  const root = screenNode(el("section", `screen prompt-screen ${ctx.surface}`), screen);
  const semester = ctx.view.semester;
  const courseId = ctx.ui.notEstablishedCourseId ?? ctx.view.courseId;
  const course =
    courseId === undefined
      ? undefined
      : semester?.courses.find((item) => item.courseId === courseId);
  const header = el("header", "course-header");
  header.append(
    backAction("semester", () => {
      ctx.ui.notEstablishedCourseId = undefined;
      ctx.ui.detailAssessmentId = undefined;
      ctx.actions.onOpenScreen(ctx.surface === "side-panel" ? "SEM-02" : "SEM-01");
    })
  );
  const labelled = course ?? ctx.view.course;
  if (labelled) {
    const title = el("div", "course-title-group");
    title.append(
      el("p", "course-code", labelled.courseCode),
      el("h1", "course-name", labelled.courseName)
    );
    header.append(title);
  }
  root.append(header, el("p", "prompt-line", t("notEstablishedPrompt")));
  append(root, noticeFor(ctx));
  if (courseId !== undefined) {
    root.append(
      actionRow(
        primaryAction(t("scanCourse"), () => {
          // The question the prompt asks has been answered, so the prompt goes away and the surface
          // moves to the Scan it just started. The route carries the Course, because which Scan
          // screen is real (working, waiting, failed) is a fact about that Course's run.
          ctx.ui.notEstablishedCourseId = undefined;
          ctx.open("ISC-02", { courseId });
          ctx.actions.onMutation({ kind: "StartScan", courseId });
        })
      )
    );
  }
  return root;
}
