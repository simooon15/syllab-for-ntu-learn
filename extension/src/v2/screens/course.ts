import { append, attr, control, data, el, paragraph } from "../../app/dom";
import { t } from "../copy";
import type {
  AssessmentCardView,
  AssessmentKindView,
  ConstraintView,
  CourseView,
  FactView,
  ScreenId
} from "../contract";
import type { FactValue } from "../schema";
import {
  actionRow,
  backAction,
  attentionDetail,
  factRow,
  groupHeading,
  linkAction,
  markChips,
  noticeFor,
  primaryAction,
  screenNode,
  secondaryAction,
  sectionHeading,
  statusArea,
  taskBlock,
  type ScreenContext
} from "./patterns";

/** Fixed view grouping. It is a reading order, not a product object. */
export const GROUP_ORDER = [
  "Assignments",
  "Projects",
  "Quizzes & Tests",
  "Exams",
  "Other"
] as const;

const KIND_ORDER: AssessmentKindView[] = ["assignment", "project", "quiz_test", "exam", "other"];

export function kindLabel(kind: AssessmentKindView): string {
  switch (kind) {
    case "assignment":
      return t("kindAssignment");
    case "project":
      return t("kindProject");
    case "quiz_test":
      return t("kindQuizTest");
    case "exam":
      return t("kindExam");
    case "other":
      return t("kindOther");
  }
}

/** Groups assessments into the fixed order, sorted by name inside each group. */
export function groupAssessments(
  assessments: AssessmentCardView[]
): Array<{ group: (typeof GROUP_ORDER)[number]; items: AssessmentCardView[] }> {
  return GROUP_ORDER.map((group) => ({
    group,
    items: assessments
      .filter((item) => item.kindGroup === group)
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
  })).filter((entry) => entry.items.length > 0);
}

/** CRS-01 / CRS-02 / CRS-03 / CRS-04 / CRS-06 — the Course Brief in every state. */
export function renderCourse(ctx: ScreenContext, screen: ScreenId): HTMLElement {
  const course = ctx.view.course;
  const root = screenNode(el("section", `screen course-screen ${ctx.surface}`), screen);
  if (!course) return root;

  root.append(renderCourseHeader(ctx, course, screen));
  append(root, noticeFor(ctx), attentionDetail(ctx, course.status));
  if (ctx.view.task) root.append(taskBlock(ctx, ctx.view.task));

  if (screen === "CRS-03") {
    const assessment = selectedAssessment(ctx, course);
    if (assessment) {
      root.append(renderDetail(ctx, assessment));
      return root;
    }
  }
  if (screen === "CRS-04") {
    const assessment = selectedAssessment(ctx, course);
    if (assessment) {
      root.append(renderEditForm(ctx, assessment));
      return root;
    }
  }
  if (course.noAssessments) {
    root.append(renderNoAssessments(ctx, course));
    return root;
  }
  if (ctx.ui.addingAssessment) {
    root.append(renderAddForm(ctx, course));
    return root;
  }
  root.append(briefBody(ctx, course));
  return root;
}

function renderCourseHeader(ctx: ScreenContext, course: CourseView, screen: ScreenId): HTMLElement {
  const header = el("header", "course-header");
  header.append(
    backAction("semester", () => {
      if (screen === "CRS-03" || screen === "CRS-04") {
        ctx.ui.detailAssessmentId = undefined;
        ctx.ui.editingAssessmentId = undefined;
        ctx.repaint();
        return;
      }
      ctx.open(ctx.surface === "side-panel" ? "SEM-02" : "SEM-01");
    })
  );
  const title = el("div", "course-title-group");
  title.append(
    el("p", "course-code", course.courseCode),
    el("h1", "course-name", course.courseName)
  );
  header.append(title);
  const status = statusArea(ctx, course.status, "course");
  if (status) header.append(status);
  return header;
}

/** The Brief body: assessment groups, then Course-wide Constraints. */
export function briefBody(
  ctx: ScreenContext,
  course: CourseView,
  options: { showMore: boolean } = { showMore: true }
): HTMLElement {
  const body = el("div", "course-body");
  const groups = groupAssessments(course.assessments);
  for (const group of groups) {
    body.append(groupHeading(group.group));
    for (const assessment of group.items) {
      body.append(assessmentBody(ctx, assessment, { nested: false, showDetailAction: false }));
    }
  }
  if (course.constraints.length > 0) {
    body.append(sectionHeading(t("constraintsHeading"), "section-heading constraints-heading"));
    for (const constraint of course.constraints) body.append(renderConstraint(ctx, constraint));
  }
  if (options.showMore) body.append(renderMoreMenu(ctx, course));
  return body;
}

/** SYS-03 detail lives in the header area; the More menu is where Course-level actions live. */
function renderMoreMenu(ctx: ScreenContext, course: CourseView): HTMLElement {
  const block = el("div", "more-menu");
  const toggle = linkAction(t("moreMenu"), () => {
    ctx.ui.courseMoreOpen = !ctx.ui.courseMoreOpen;
    ctx.repaint();
  });
  toggle.setAttribute("aria-expanded", String(ctx.ui.courseMoreOpen));
  block.append(toggle);
  if (!ctx.ui.courseMoreOpen) return block;
  const items = el("div", "more-items");
  items.append(
    control(t("moreAddAssessment"), "menu-item", () => {
      ctx.ui.courseMoreOpen = false;
      ctx.ui.addingAssessment = true;
      ctx.repaint();
    })
  );
  // A Historical Semester keeps its Brief readable but is not checked again.
  if (ctx.view.semester?.lifecycle !== "Historical") {
    items.append(
      control(t("moreCheckForUpdates"), "menu-item", () => {
        ctx.ui.courseMoreOpen = false;
        ctx.actions.onMutation({ kind: "CheckForUpdates", courseId: course.courseId });
      })
    );
  }
  items.append(
    control(t("moreExportCalendar"), "menu-item", () => {
      ctx.ui.courseMoreOpen = false;
      ctx.open("CAL-01", { courseId: course.courseId });
    }),
    control(t("moreRebuildCourse"), "menu-item", () => {
      ctx.ui.courseMoreOpen = false;
      ctx.ui.rebuildConfirmOpen = true;
      ctx.repaint();
    })
  );
  block.append(items);
  return block;
}

export interface AssessmentOptions {
  nested: boolean;
  showDetailAction: boolean;
  /** A Review shows the Assessment name once, in its own header, then this body. */
  heading?: "full" | "marks";
}

/**
 * One Assessment. Components stay visually inside their parent; a Series is the top-level
 * object with a lighter list of its instances beneath it.
 */
export function assessmentBody(
  ctx: ScreenContext,
  assessment: AssessmentCardView,
  options: AssessmentOptions
): HTMLElement {
  const article = el("article", options.nested ? "assessment is-component" : "assessment");
  data(article, {
    assessmentId: assessment.assessmentId,
    kind: assessment.kind,
    kindGroup: assessment.kindGroup
  });
  const heading = options.nested ? "h4" : "h3";
  const headingRow = el("div", "assessment-heading");
  if (options.heading !== "marks") {
    const nameNode =
      options.nested || options.showDetailAction
        ? el(heading, options.nested ? "component-name" : "assessment-name", assessment.name)
        : (() => {
            const button = control(assessment.name, "assessment-name", () => {
              ctx.ui.detailAssessmentId = assessment.assessmentId;
              ctx.repaint();
            });
            return data(button, { kind: assessment.kind });
          })();
    headingRow.append(nameNode);
    if (!options.nested)
      headingRow.append(el("span", "assessment-kind", kindLabel(assessment.kind)));
  }
  for (const mark of markChips(assessment.marks)) headingRow.append(mark);
  if (assessment.seriesNote !== undefined) {
    headingRow.append(el("span", "series-note", assessment.seriesNote));
  }
  if (headingRow.childNodes.length > 0) article.append(headingRow);

  if (assessment.facts.length > 0) {
    const facts = el("div", "facts");
    for (const fact of assessment.facts) {
      facts.append(factRow(ctx, `brief:${assessment.assessmentId}`, fact));
    }
    article.append(facts);
  }
  for (const question of assessment.unresolvedQuestions) {
    article.append(paragraph("fact-question", question));
  }
  for (const component of assessment.components) {
    article.append(assessmentBody(ctx, component, { nested: true, showDetailAction: false }));
  }
  if (assessment.seriesInstances.length > 0) {
    const instances = el("ol", "series-instances");
    for (const instance of assessment.seriesInstances) {
      const row = el("li", "series-instance");
      row.append(el("span", "instance-name", instance.name));
      row.append(el("span", "instance-summary", instance.summary.join(" · ")));
      instances.append(row);
    }
    article.append(instances);
  }
  return article;
}

/** Course-wide Constraints render after every assessment and never join the grouping. */
function renderConstraint(ctx: ScreenContext, constraint: ConstraintView): HTMLElement {
  const node = el("div", "constraint");
  data(node, { constraintId: constraint.constraintId });
  const key = `constraint:${constraint.constraintId}`;
  const content =
    constraint.evidence.length === 0
      ? paragraph("constraint-content", constraint.content)
      : control(constraint.content, "constraint-content is-swappable", () => {
          ctx.ui.evidence = ctx.ui.evidence.includes(key)
            ? ctx.ui.evidence.filter((item) => item !== key)
            : [...ctx.ui.evidence, key];
          ctx.repaint();
        });
  node.append(content);
  for (const mark of markChips(constraint.marks)) node.append(mark);
  if (constraint.evidence.length > 0 && ctx.ui.evidence.includes(key)) {
    const evidence = screenNode(el("div", "evidence is-evidence"), "CRS-05");
    for (const item of constraint.evidence) {
      evidence.append(
        paragraph("evidence-locator", `${item.sourceTitle} · ${item.locator}`),
        paragraph("evidence-excerpt", item.excerpt)
      );
    }
    node.append(evidence);
  }
  return node;
}

/** CRS-05 — the evidence state of one fact, reached by clicking its value. */
function renderDetail(ctx: ScreenContext, assessment: AssessmentCardView): HTMLElement {
  const detail = el("div", "assessment-detail");
  detail.append(assessmentBody(ctx, assessment, { nested: false, showDetailAction: true }));
  detail.append(
    actionRow(
      primaryAction(t("edit"), () => {
        ctx.ui.editingAssessmentId = assessment.assessmentId;
        ctx.repaint();
      })
    )
  );
  return detail;
}

/** CRS-04 — in-place editing of the fields a reader can understand. */
function renderEditForm(ctx: ScreenContext, assessment: AssessmentCardView): HTMLElement {
  const form = el("form", "edit-form");
  const nameRow = el("label", "field-row");
  nameRow.append(el("span", "field-label", t("editNameLabel")));
  const nameInput = el("input", "text-input");
  nameInput.type = "text";
  nameInput.value = assessment.name;
  nameRow.append(nameInput);
  form.append(sectionHeading(t("editAssessmentHeading")), nameRow);

  const editors: Array<{ fact: FactView; input: HTMLInputElement }> = [];
  for (const fact of assessment.facts) {
    if (!fact.editable) continue;
    const row = el("label", "field-row");
    row.append(el("span", "field-label", fact.label));
    const input = el("input", "text-input");
    input.type = "text";
    input.value = fact.display;
    row.append(input);
    form.append(row);
    editors.push({ fact, input });
  }

  form.append(
    actionRow(
      primaryAction(t("save"), () => {
        for (const { fact, input } of editors) {
          if (input.value === fact.display) continue;
          ctx.actions.onMutation({
            kind: "EditFact",
            factId: fact.factId,
            value: editedValue(input.value)
          });
        }
        if (nameInput.value.trim().length > 0 && nameInput.value !== assessment.name) {
          ctx.actions.onMutation({
            kind: "RenameAssessment",
            assessmentId: assessment.assessmentId,
            name: nameInput.value.trim()
          });
        }
        ctx.ui.editingAssessmentId = undefined;
        ctx.repaint();
      }),
      secondaryAction(t("cancel"), () => {
        ctx.ui.editingAssessmentId = undefined;
        ctx.repaint();
      })
    )
  );
  return form;
}

function editedValue(text: string): FactValue {
  return { state: "KNOWN", value: text };
}

/** Manual Add — a Course-level capability, never a correction of one Assessment. */
function renderAddForm(ctx: ScreenContext, course: CourseView): HTMLElement {
  const form = el("form", "edit-form");
  data(form, { region: "add-assessment" });
  const nameRow = el("label", "field-row");
  nameRow.append(el("span", "field-label", t("addAssessmentNameLabel")));
  const nameInput = el("input", "text-input");
  nameInput.type = "text";
  nameRow.append(nameInput);

  const kindRow = el("label", "field-row");
  kindRow.append(el("span", "field-label", t("addAssessmentKindLabel")));
  const select = el("select", "select-input");
  for (const kind of KIND_ORDER) {
    const option = el("option", undefined, kindLabel(kind));
    option.value = kind;
    select.append(option);
  }
  kindRow.append(select);

  form.append(sectionHeading(t("addAssessmentHeading")), nameRow, kindRow);
  form.append(
    actionRow(
      primaryAction(t("addAssessmentSubmit"), () => {
        const name = nameInput.value.trim();
        const kind = select.value as AssessmentKindView;
        if (name.length === 0) return;
        ctx.ui.addingAssessment = false;
        ctx.actions.onMutation({
          kind: "AddAssessment",
          assessment: { name, kind },
          facts: []
        });
        ctx.repaint();
      }),
      secondaryAction(t("cancel"), () => {
        ctx.ui.addingAssessment = false;
        ctx.repaint();
      })
    )
  );
  attr(form, { "data-course-id": course.courseId });
  return form;
}

function renderNoAssessments(ctx: ScreenContext, course: CourseView): HTMLElement {
  const block = el("div", "empty-state-block");
  block.append(paragraph("empty-state", t("noAssessments")));
  block.append(
    actionRow(
      primaryAction(t("moreAddAssessment"), () => {
        ctx.ui.addingAssessment = true;
        ctx.repaint();
      })
    )
  );
  block.append(renderMoreMenu(ctx, course));
  return block;
}

/** The Assessment Detail shows the whole object; Edit is the only action it adds. */
export function selectedAssessment(
  ctx: ScreenContext,
  course: CourseView
): AssessmentCardView | undefined {
  const wanted = ctx.ui.detailAssessmentId ?? ctx.ui.editingAssessmentId;
  if (wanted !== undefined) {
    const found = findAssessment(course.assessments, wanted);
    if (found) return found;
  }
  return course.assessments[0];
}

function findAssessment(
  assessments: AssessmentCardView[],
  assessmentId: string
): AssessmentCardView | undefined {
  for (const assessment of assessments) {
    if (assessment.assessmentId === assessmentId) return assessment;
    const nested = findAssessment(assessment.components, assessmentId);
    if (nested) return nested;
  }
  return undefined;
}
