import { fieldLabel } from "../assessments";
import { requirePresent } from "../errors";
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
  evidenceBlock,
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
  if (["CRS-01", "CRS-02", "CRS-03", "CRS-06"].includes(screen))
    installCoursePrint(ctx, root, course);
  append(root, noticeFor(ctx), attentionDetail(ctx, course.status));
  if (ctx.view.task) root.append(taskBlock(ctx, ctx.view.task));
  if (course.excludedReviews?.length) {
    const excluded = el("details", "excluded-reviews");
    excluded.append(el("summary", "", t("reviewExcludedItems")));
    for (const item of course.excludedReviews)
      excluded.append(
        linkAction(t("reviewRestoreItem", { title: item.title }), () =>
          ctx.actions.onMutation({ kind: "UndeleteExclusion", reviewItemId: item.reviewItemId })
        )
      );
    root.append(excluded);
  }

  if (screen === "CRS-03") {
    const assessment = selectedAssessment(ctx, course);
    if (assessment) {
      root.append(renderDetail(ctx, assessment));
      rememberDisclosures(ctx, root, `detail:${assessment.assessmentId}`);
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
  rememberDisclosures(ctx, root, `course:${course.courseId}`);
  return root;
}

/** Preserve native disclosure state through Evidence repaint; navigation is view-only. */
function rememberDisclosures(ctx: ScreenContext, root: HTMLElement, scope: string): void {
  Array.from(root.querySelectorAll("details")).forEach((node, index) => {
    const key = `detail-disclosure:${scope}:${String(index)}`;
    if (ctx.ui.expanded.includes(key)) node.open = true;
    node.addEventListener("toggle", () => {
      ctx.ui.expanded = node.open
        ? [...new Set([...ctx.ui.expanded, key])]
        : ctx.ui.expanded.filter((k) => k !== key);
    });
  });
}

function renderCourseHeader(ctx: ScreenContext, course: CourseView, screen: ScreenId): HTMLElement {
  const header = el("header", "course-header");
  header.append(
    backAction(screen === "CRS-03" || screen === "CRS-04" ? "course" : "semester", () => {
      if (screen === "CRS-03" || screen === "CRS-04") {
        ctx.ui.detailAssessmentId = undefined;
        ctx.ui.editingAssessmentId = undefined;
        ctx.repaint();
        if (typeof requestAnimationFrame === "function")
          requestAnimationFrame(() => {
            const button = Array.from(document.querySelectorAll<HTMLElement>(".is-summary"))
              .find((n) => n.dataset.assessmentId === ctx.ui.courseReturnId)
              ?.querySelector<HTMLButtonElement>(".assessment-name");
            button?.focus({ preventScroll: true });
            if (typeof window !== "undefined") window.scrollTo(0, ctx.ui.courseReturnScroll ?? 0);
          });
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
  const current = course.assessments.filter((a) => a.productDisposition !== "ISSUE");
  // A series is an overview relationship. Its components are equal planning objects,
  // while submission steps stay within their own assessment. No name-based inference.
  const schemes = current.filter(
    (a) =>
      a.role === "series" &&
      a.productDisposition &&
      a.components.length > 0 &&
      a.seriesInstances.length === 0
  );
  const assessments = current.flatMap((a) =>
    schemes.includes(a) ? a.components.filter((c) => c.productDisposition !== "ISSUE") : [a]
  );
  if (assessments.some((a) => a.productDisposition)) {
    const cards = el("section", "assessment-cards");
    cards.append(sectionHeading(t("productOverview")));
    for (const assessment of [...assessments].sort(
      (a, b) =>
        Number(b.facts.some((f) => f.field === "weight")) -
        Number(a.facts.some((f) => f.field === "weight"))
    )) {
      const card = data(el("article", "assessment is-summary"), {
        assessmentId: assessment.assessmentId
      });
      const open = () => {
        ctx.ui.courseReturnId = assessment.assessmentId;
        if (typeof window !== "undefined") ctx.ui.courseReturnScroll = window.scrollY;
        ctx.ui.detailAssessmentId = assessment.assessmentId;
        ctx.repaint();
      };
      // Summary stays compact when returning from a revealed source. Show that source in CRS-03.
      const evidenceUi = { ...ctx.ui, evidence: [] as string[] };
      const evidenceContext: ScreenContext = {
        ...ctx,
        ui: evidenceUi,
        repaint: () => {
          ctx.ui.evidence = [...new Set([...ctx.ui.evidence, ...evidenceUi.evidence])];
          open();
        }
      };
      const header = el("header", "assessment-card-header");
      header.append(
        control(assessment.name, "assessment-name", open),
        el("span", "assessment-kind", kindLabel(assessment.kind))
      );
      for (const mark of markChips(assessment.marks)) header.append(mark);
      const selected = summaryFacts(assessment);
      const critical = selected.filter(isPrimaryFact);
      const metrics = el("div", "assessment-primary-facts");
      for (const fact of critical) metrics.append(planningFact(evidenceContext, assessment, fact));
      header.append(metrics);
      if (
        assessment.facts.some((f) => f.knowledge === "UNCERTAIN") ||
        assessment.unresolvedQuestions.length
      )
        header.append(
          control(
            t("productVerifyFields", {
              fields:
                [
                  ...new Set(
                    assessment.facts
                      .filter((f) => f.knowledge === "UNCERTAIN")
                      .map((f) => planningLabel(f))
                  )
                ].join(" · ") || t("productRequirements")
            }),
            "assessment-risk-link",
            open
          )
        );
      card.append(header);
      const scroll = data(el("div", "assessment-card-scroll"), { region: "card-summary" });
      scroll.tabIndex = 0;
      attr(scroll, {
        role: "region",
        "aria-label": t("productAdditionalSummary", { name: assessment.name })
      });
      for (const fact of selected.filter((f) => !critical.includes(f))) {
        scroll.append(planningFact(evidenceContext, assessment, fact));
      }
      card.append(scroll);
      const footer = el("footer", "assessment-card-footer"),
        hint = paragraph("scroll-hint", t("productScrollHint"));
      hint.hidden = true;
      footer.append(hint, secondaryAction(t("productOpenDetails"), open));
      card.append(footer);
      const updateOverflow = () => {
        hint.hidden = scroll.scrollHeight <= scroll.clientHeight;
      };
      scroll.addEventListener("scroll", () => {
        ctx.ui.cardScroll = {
          ...(ctx.ui.cardScroll ?? {}),
          [assessment.assessmentId]: scroll.scrollTop
        };
        updateOverflow();
      });
      scroll.addEventListener("focus", updateOverflow);
      // Page keys act on this focused region, never on its nested Evidence buttons.
      scroll.addEventListener("keydown", (event) => {
        if (event.target !== scroll) return;
        if (event.key === "PageDown") scroll.scrollTop += scroll.clientHeight;
        else if (event.key === "PageUp") scroll.scrollTop -= scroll.clientHeight;
        else if (event.key === "Home") scroll.scrollTop = 0;
        else if (event.key === "End") scroll.scrollTop = scroll.scrollHeight;
        else return;
        event.preventDefault();
      });
      if (typeof requestAnimationFrame === "function")
        requestAnimationFrame(() => {
          scroll.scrollTop = ctx.ui.cardScroll?.[assessment.assessmentId] ?? 0;
          updateOverflow();
        });
      cards.append(card);
    }
    body.append(cards);
  } else {
    for (const group of groupAssessments(assessments)) {
      body.append(groupHeading(group.group));
      for (const assessment of group.items)
        body.append(assessmentBody(ctx, assessment, { nested: false, showDetailAction: false }));
    }
  }
  for (const scheme of schemes) {
    const details = el("details", "product-details");
    details.append(el("summary", "", t("productScheme")));
    details.append(productFacts(ctx, scheme.facts, `scheme:${scheme.assessmentId}`));
    body.append(details);
  }
  const issues = [...course.assessments, ...schemes.flatMap((a) => a.components)].filter(
    (a) => a.productDisposition === "ISSUE"
  );
  if (issues.length) {
    body.append(sectionHeading(t("productIssues")));
    for (const a of issues) {
      const node = el("article", "product-issue");
      node.append(
        el("h3", "", a.name),
        paragraph("hint", a.dispositionBasis ?? t("productIdentityUnknown"))
      );
      const details = el("details", "product-details");
      details.append(el("summary", "", t("productReference")));
      details.append(assessmentBody(ctx, a, { nested: false, showDetailAction: true }));
      node.append(details);
      body.append(node);
    }
  }
  if (course.constraints.length > 0) {
    body.append(sectionHeading(t("constraintsHeading"), "section-heading constraints-heading"));
    for (const constraint of course.constraints) body.append(renderConstraint(ctx, constraint));
  }
  if (course.sourceContext) {
    const source = course.sourceContext,
      key = `source-context:${course.courseId}`;
    const context = el("details", "source-context-details");
    context.append(el("summary", "", t("evidenceCourseSource")));
    if (source.referenceFacts?.length) {
      context.append(
        paragraph("hint", t("productUnreviewedReference")),
        productFacts(ctx, source.referenceFacts, key)
      );
    }
    for (const scope of source.readingScope) context.append(paragraph("hint", scope));
    for (const question of source.questions) context.append(paragraph("fact-question", question));
    if (source.evidence.length)
      context.append(
        ctx.ui.evidence.includes(key)
          ? evidenceBlock(ctx, key, source.evidence)
          : control(
              t("showEvidence", { label: t("evidenceCourseSource") }),
              "fact-value is-swappable is-fact",
              () => {
                ctx.ui.evidence.push(key);
                ctx.repaint();
              }
            )
      );
    body.append(context);
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

  if (assessment.facts.some((f) => f.product)) {
    article.append(productFacts(ctx, assessment.facts, `brief:${assessment.assessmentId}`));
  } else if (assessment.facts.length > 0) {
    const facts = el("div", "facts");
    for (const fact of assessment.facts)
      facts.append(factRow(ctx, `brief:${assessment.assessmentId}`, fact));
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

/** Render typed actions as a semantic tree; references never compete with core fields. */
export function productFacts(ctx: ScreenContext, input: FactView[], key: string): HTMLElement {
  const root = el("div", "product-facts");
  const reviewing =
    !!ctx.view.review && (ctx.view.screen.startsWith("IRV") || ctx.view.screen.startsWith("CRV"));
  const byRef = new Map(
    input.filter((f) => f.product).map((f) => [requirePresent(f.product).propositionRef, f])
  );
  const children = (ref: string) => input.filter((f) => f.product?.parentRef === ref);
  const rendered = new Set<string>();
  const tree = (fact: FactView): HTMLElement => {
    rendered.add(fact.factId);
    const node = el("li", "product-action");
    if (fact.product?.relation === "ALTERNATIVE")
      node.append(el("span", "choice-label", t("productOr")));
    node.append(factRow(ctx, key, fact));
    const descendants = children(requirePresent(fact.product).propositionRef);
    if (descendants.length) {
      const list = el("ul", "product-action-children");
      for (const child of descendants) list.append(tree(child));
      node.append(list);
    }
    return node;
  };
  const primary = input.filter(
    (f) =>
      !f.product ||
      (f.product.role === "core" && !children(f.product.propositionRef).length) ||
      f.product.role === "risk" ||
      f.product.disposition === "ISSUE"
  );
  const fieldOrder = [
    "weight",
    "deadline",
    "exam_date",
    "deliverable",
    "submission_method",
    "responsibility",
    "mode",
    "duration"
  ];
  const priority = (f: FactView) => {
    const index = fieldOrder.indexOf(f.field);
    return index < 0 ? fieldOrder.length : index;
  };
  const primaryGroups = new Map<string, HTMLElement>();
  for (const fact of primary
    .filter((f) => !f.product?.parentRef || !byRef.has(f.product.parentRef))
    .sort((a, b) => priority(a) - priority(b))) {
    if (fact.product) {
      const list = el("ul", "product-primary");
      list.append(tree(fact));
      if (fact.product.role === "risk") {
        const group = fact.product.group;
        let section = primaryGroups.get(group);
        if (!section) {
          section = el("section", "product-rule-group");
          section.append(el("h4", "checklist-heading", group));
          primaryGroups.set(group, section);
          root.append(section);
        }
        section.append(list);
      } else root.append(list);
    } else root.append(factRow(ctx, key, fact));
  }
  for (const [roles, label] of [
    [["action"], t("productChecklist")],
    [["rubric"], t("productRubric")],
    [["reference"], t("productReference")]
  ] as const) {
    const members = input.filter(
      (f) =>
        f.product &&
        ((roles as readonly string[]).includes(f.product.role) ||
          (roles[0] === "action" &&
            f.product.role === "core" &&
            children(f.product.propositionRef).length > 0)) &&
        !rendered.has(f.factId)
    );
    if (!members.length) continue;
    const details = el("details", "product-details");
    details.open = reviewing || roles[0] === "action";
    details.append(el("summary", "", label));
    const groups = new Map<string, FactView[]>();
    for (const f of members)
      groups.set(requirePresent(f.product).group, [
        ...(groups.get(requirePresent(f.product).group) ?? []),
        f
      ]);
    for (const [group, facts] of groups) {
      details.append(el("h4", "checklist-heading", group));
      const list = el("ul", "product-checklist");
      for (const f of facts)
        if (
          !rendered.has(f.factId) &&
          (!f.product?.parentRef ||
            !members.some((m) => m.product?.propositionRef === f.product?.parentRef))
        )
          list.append(tree(f));
      details.append(list);
    }
    root.append(details);
  }
  // Every in-scope value remains accessible even if a parent belongs to another group/scope.
  const remaining = input.filter((f) => !rendered.has(f.factId) && f.product);
  if (remaining.length) {
    const list = el("ul", "product-checklist");
    for (const f of remaining) if (!rendered.has(f.factId)) list.append(tree(f));
    root.append(list);
  }
  return root;
}

/** Course-wide Constraints render after every assessment and never join the grouping. */
export function renderConstraint(ctx: ScreenContext, constraint: ConstraintView): HTMLElement {
  const node = el("div", "constraint");
  data(node, { constraintId: constraint.constraintId });
  if (constraint.facts?.some((f) => f.product)) {
    const reviewing = ctx.view.screen.startsWith("IRV") || ctx.view.screen.startsWith("CRV");
    if (reviewing)
      node.append(productFacts(ctx, constraint.facts, `constraint:${constraint.constraintId}`));
    else {
      const groups = new Map<string, FactView[]>();
      for (const f of constraint.facts)
        groups.set(f.product?.group ?? t("productCourseRules"), [
          ...(groups.get(f.product?.group ?? t("productCourseRules")) ?? []),
          f
        ]);
      for (const [group, facts] of [...groups].sort(
        ([, a], [, b]) => rulePriority(b) - rulePriority(a)
      )) {
        const details = el("details", "product-details course-rule-details");
        details.open = rulePriority(facts) > 0;
        details.append(el("summary", "", group));
        if (facts.some((f) => f.knowledge === "UNCERTAIN"))
          details.append(paragraph("hint", t("productRulesUnresolved")));
        details.append(organizedDetails(ctx, facts, `constraint:${constraint.constraintId}`));
        node.append(details);
      }
    }
    for (const mark of markChips(constraint.marks)) node.append(mark);
    return node;
  }
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

const SUMMARY_FIELDS = [
  "weight",
  "deadline",
  "exam_date",
  "presentation_date",
  "mode",
  "duration",
  "presentation_duration",
  "qa_duration",
  "submission_method",
  "deliverable",
  "responsibility"
];
function summaryFacts(a: AssessmentCardView): FactView[] {
  return a.facts
    .filter(
      (f) =>
        SUMMARY_FIELDS.includes(f.field) &&
        (!f.product || !["BACKGROUND", "REFERENCE"].includes(f.product.disposition)) &&
        f.knowledge !== "UNCERTAIN" &&
        (f.field !== "deadline" ||
          !f.product ||
          f.product.unit === undefined ||
          f.product.unit === "date") &&
        (f.field !== "submission_method" ||
          !f.product ||
          (f.knowledge === "KNOWN" && suppliedCategory(f.product.group) !== "Format"))
    )
    .sort((a, b) => SUMMARY_FIELDS.indexOf(a.field) - SUMMARY_FIELDS.indexOf(b.field));
}
/** Planning labels remove an explicit saved owner prefix, without guessing source meaning. */
function planningLabel(fact: FactView): string {
  if (fact.field === "weight") return t("productCourseWeight");
  if (fact.field === "deadline") return detailTitle(fact);
  if (fact.field === "exam_date")
    return fact.knowledge === "UNCERTAIN" ? t("productDateTime") : detailTitle(fact);
  if (fact.field === "presentation_date") return t("productPresentationDates");
  if (
    fact.field === "submission_method" &&
    suppliedCategory(fact.product?.group ?? "") === "Schedule"
  )
    return t("productPresentationPlatform");
  if (["mode", "duration"].includes(fact.field)) return detailTitle(fact);
  return fieldLabel(fact.field);
}
function isPrimaryFact(fact: FactView): boolean {
  return (
    fact.field === "weight" ||
    (["deadline", "exam_date"].includes(fact.field) &&
      fact.knowledge === "KNOWN" &&
      (!fact.product?.unit || fact.product.unit === "date"))
  );
}
function planningFact(
  ctx: ScreenContext,
  assessment: AssessmentCardView,
  fact: FactView
): HTMLElement {
  const summary = { ...fact, label: planningLabel(fact) };
  delete summary.competingValues;
  const row = factRow(ctx, `brief:${assessment.assessmentId}`, summary);
  row.classList.add(isPrimaryFact(fact) ? "planning-primary" : "planning-secondary");
  if (fact.field === "weight") row.classList.add("planning-weight");
  return row;
}
function rulePriority(facts: FactView[]): number {
  return facts.some((f) => f.knowledge === "UNCERTAIN" || f.product?.role === "risk")
    ? 2
    : facts.some(
          (f) =>
            f.field === "submission_method" ||
            ["must", "prohibition"].includes(f.semantics?.modality ?? "")
        )
      ? 1
      : 0;
}

/** A temporary print document reuses the same facts/renderers; it never creates another screen. */
function installCoursePrint(ctx: ScreenContext, root: HTMLElement, course: CourseView): void {
  const toolbar = el("div", "course-print-actions");
  for (const mode of ["summary", "full"] as const)
    toolbar.append(
      secondaryAction(t(mode === "summary" ? "productPrintSummary" : "productPrintFull"), () => {
        root.dataset.printMode = mode;
        window.print();
      })
    );
  root.append(toolbar);
  root.addEventListener("syllab-prepare-print", () => {
    if (root.querySelector(".course-print-document")) return;
    const mode = root.dataset.printMode ?? "summary";
    const sheet = el("div", "course-print-document");
    sheet.dataset.mode = mode;
    sheet.append(
      el("h2", "print-purpose", t(mode === "summary" ? "productPrintSummary" : "productPrintFull"))
    );
    const all = [
      ...course.assessments.flatMap(function visit(a): FactView[] {
        return [...a.facts, ...a.components.flatMap(visit)];
      }),
      ...course.constraints.flatMap((c) => c.facts ?? []),
      ...(course.sourceContext?.referenceFacts ?? [])
    ];
    const printUi = {
      ...ctx.ui,
      evidence: [] as string[],
      expanded: all.map((f) => `prose:${f.factId}`)
    };
    const printCtx: ScreenContext = { ...ctx, ui: printUi, repaint: () => {} };
    const body = briefBody(printCtx, course, { showMore: false });
    if (mode === "summary") {
      const cards = body.querySelector(".assessment-cards");
      if (cards) sheet.append(cards);
      else sheet.append(body);
      for (const issue of Array.from(body.querySelectorAll(".product-issue"))) {
        const pending = el("section", "print-rule-risk");
        pending.append(
          el("h3", "", issue.querySelector("h3")?.textContent ?? t("productIssues")),
          paragraph(
            "hint",
            issue.querySelector(".hint")?.textContent ?? t("productIdentityUnknown")
          )
        );
        sheet.append(pending);
      }
      const rules = el("section", "print-critical-rules");
      rules.append(sectionHeading(t("productPrintKeyRules")));
      for (const constraint of course.constraints) {
        const selected = (constraint.facts ?? []).filter(
          (f) =>
            (f.field === "submission_method" || f.product?.role === "risk") &&
            f.product?.role !== "reference" &&
            f.knowledge === "KNOWN"
        );
        if (selected.length)
          rules.append(
            organizedDetails(printCtx, selected, `constraint:${constraint.constraintId}`)
          );
        const pending = (constraint.facts ?? []).filter((f) => f.knowledge === "UNCERTAIN");
        if (pending.length)
          rules.append(
            paragraph(
              "print-rule-risk",
              t("productVerifyFields", {
                fields: pending.map((f) => detailTitle(f)).join(" · ")
              })
            )
          );
      }
      rules.append(paragraph("print-reading-note", t("productPrintSummaryScope")));
      sheet.append(rules);
    } else {
      const cards = body.querySelector(".assessment-cards");
      for (const card of Array.from(
        cards?.querySelectorAll<HTMLElement>(":scope > .assessment") ?? []
      )) {
        const id = card.dataset.assessmentId;
        const find = (a: AssessmentCardView): AssessmentCardView | undefined =>
          a.assessmentId === id ? a : a.components.map(find).find(Boolean);
        const assessment = course.assessments.map(find).find(Boolean);
        if (assessment) sheet.append(renderDetail(printCtx, assessment));
      }
      cards?.remove();
      sheet.append(body);
      const printed = new Set<string>();
      for (const row of Array.from(sheet.querySelectorAll<HTMLElement>(".fact"))) {
        const id = row.dataset.factId;
        if (id && printed.has(id)) {
          row.remove();
          continue;
        }
        if (id) printed.add(id);
        const ids = new Set([
          id,
          ...Array.from(
            row.parentElement?.querySelectorAll<HTMLElement>(":scope > .fact-alias") ?? []
          ).map((alias) => alias.dataset.factId)
        ]);
        const evidence = [
          ...new Map(
            all
              .filter((f) => ids.has(f.factId))
              .flatMap((f) => f.evidence)
              .map((e) => [e.evidenceId, e])
          ).values()
        ];
        if (evidence.length)
          row.append(
            paragraph(
              "print-source-path",
              evidence.map((e) => `${e.sourceTitle} · ${e.locator}`).join("; ")
            )
          );
      }
    }
    // Exact shared-ID references were printed at their owning section; remove their empty wrappers.
    for (const node of Array.from(sheet.querySelectorAll(".product-action")).reverse())
      if (!node.querySelector(".fact, .fact-alias")) node.remove();
    for (const heading of Array.from(sheet.querySelectorAll(".checklist-heading"))) {
      const list = heading.nextElementSibling;
      if (list?.classList.contains("product-checklist") && !list.children.length) {
        list.remove();
        heading.remove();
      }
    }
    for (const section of Array.from(sheet.querySelectorAll(".product-details")).reverse())
      if (!section.querySelector(".fact, .fact-alias, .evidence, .hint, .fact-question"))
        section.remove();
    root.append(sheet);
    root.classList.add("has-print-document");
  });
}

/** Use typed field names and operative facets; never rewrite an action's body. */
function studentFact(fact: FactView): FactView {
  const action = ["requirement", "content"].includes(fact.field);
  // Supplied proposition titles retain score/criterion, time type and mode distinctions.
  if (
    fact.product?.role === "rubric" ||
    ["exam_date", "presentation_date", "mode", "group_size"].includes(fact.field)
  )
    return fact;
  if (
    fact.field === "submission_method" &&
    suppliedCategory(fact.product?.group ?? "") === "Schedule"
  )
    return { ...fact, label: t("productPresentationPlatform") };
  if (action) {
    const force = fact.semantics?.modality;
    return {
      ...fact,
      label: fact.knowledge === "UNCERTAIN" ? (fact.product?.title ?? fieldLabel(fact.field)) : "",
      display: force && force !== "descriptive" ? `${force}: ${fact.display}` : fact.display
    };
  }
  return { ...fact, label: fieldLabel(fact.field) };
}

/** Deterministic duplicates only: owner scope is the input; every facet/relation must match. */
export function distinctDetailFacts(input: FactView[]): Array<{ fact: FactView; ids: string[] }> {
  const groups = new Map<string, { fact: FactView; ids: string[] }>();
  for (const fact of input) {
    const key = JSON.stringify([
      fact.field,
      fact.label,
      fact.product?.title,
      fact.product?.unit,
      fact.display,
      fact.knowledge,
      fact.competingValues,
      fact.semantics,
      fact.mark,
      fact.product?.group,
      fact.product?.role,
      fact.product?.parentRef,
      fact.product?.relation
    ]);
    const prior = groups.get(key);
    if (prior) {
      prior.ids.push(fact.factId);
      prior.fact = {
        ...prior.fact,
        evidence: [
          ...new Map(
            [...prior.fact.evidence, ...fact.evidence].map((e) => [e.evidenceId, e])
          ).values()
        ]
      };
    } else groups.set(key, { fact, ids: [fact.factId] });
  }
  return [...groups.values()];
}

const DETAIL_GROUP_ORDER = [
  "Preparation",
  "Content",
  "Submission",
  "Format",
  "Schedule",
  "Procedure",
  "Delivery"
];
/** UI ordering of model-supplied business labels, not keyword judgment of source meaning. */
function suppliedCategory(group: string): string | undefined {
  return DETAIL_GROUP_ORDER.find(
    (category) => group === category || group.endsWith(` ${category}`)
  );
}

/** Remove only an explicit redundant group scope prefix from a title in that same owner view. */
function detailTitle(fact: FactView): string {
  const title = fact.product?.title ?? fieldLabel(fact.field),
    group = fact.product?.group ?? "";
  const category = suppliedCategory(group),
    prefix = category ? group.slice(0, group.length - category.length).trim() : group;
  const result = prefix && title.startsWith(prefix + " ") ? title.slice(prefix.length + 1) : title;
  return result.replace(/^\w/, (letter) => letter.toUpperCase());
}

/** Existing CRS-03: business groups from saved typed values, then on-demand source detail. */
function organizedDetails(ctx: ScreenContext, input: FactView[], key: string): HTMLElement {
  const root = el("div", "organized-details"),
    rows = distinctDetailFacts(input),
    rendered = new Set<string>();
  const byRef = new Map(
    input.filter((f) => f.product).map((f) => [requirePresent(f.product).propositionRef, f])
  );
  const children = (f: FactView) =>
    input.filter((c) => c.product?.parentRef === f.product?.propositionRef);
  const draw = (inputFact: FactView): HTMLElement => {
    const fact = rows.find((r) => r.ids.includes(inputFact.factId))?.fact ?? inputFact;
    const node = data(el("li", "product-action"), {
      modality: fact.semantics?.modality,
      role: fact.product?.role,
      knowledge: fact.knowledge
    });
    rendered.add(fact.factId);
    const descendants = children(fact);
    if (fact.product?.relation === "ALTERNATIVE")
      node.append(el("span", "choice-label", t("productOr")));
    if (descendants.length) {
      node.append(
        el(
          "h4",
          "checklist-heading",
          [
            fact.semantics?.modality === "descriptive" ? "" : fact.semantics?.modality,
            detailTitle(fact)
          ]
            .filter(Boolean)
            .join(": ")
        )
      );
      if (fact.semantics)
        for (const facet of [...fact.semantics.conditions, ...fact.semantics.exceptions])
          if (facet && facet !== "descriptive") node.append(el("span", "action-facet", facet));
      const original = el("details", "product-details");
      original.append(
        el("summary", "", t("productOriginalRequirement")),
        factRow(ctx, key, studentFact(fact))
      );
      node.append(original);
      const list = el("ul", "product-action-children");
      for (const child of descendants) {
        if (rendered.has(child.factId)) continue;
        const chapter = el("details", "product-details");
        chapter.append(el("summary", "", detailTitle(child)), draw(child));
        list.append(chapter);
      }
      node.append(list);
    } else if (
      fact.field === "content" &&
      suppliedCategory(fact.product?.group ?? "") === "Schedule"
    ) {
      const schedule = el("details", "product-details schedule-reference");
      schedule.append(
        el("summary", "", t("productDetailedSchedule")),
        factRow(ctx, key, { ...fact, label: fact.product?.title ?? fieldLabel(fact.field) })
      );
      node.append(schedule);
    } else {
      const row = factRow(ctx, key, studentFact(fact));
      if (fact.product?.role === "rubric" && /^\d+(?:\.\d+)?$/.test(fact.display.trim()))
        row.classList.add("rubric-score-pair");
      node.append(row);
    }
    const group = rows.find((r) => r.ids.includes(fact.factId));
    for (const id of group?.ids ?? []) {
      if (id !== fact.factId) {
        rendered.add(id);
        node.append(data(el("span", "fact-alias"), { factId: id }));
      }
    }
    return node;
  };
  const sections = new Map<string, FactView[]>();
  for (const { fact } of rows) {
    if (fact.product?.parentRef && byRef.has(fact.product.parentRef)) continue;
    const category = suppliedCategory(fact.product?.group ?? "");
    let label = t("productActions");
    if (fact.product?.disposition === "ISSUE" || fact.knowledge === "UNCERTAIN")
      label = t("productIssues");
    else if (fact.product?.role === "reference") label = t("productReference");
    else if (fact.product?.role === "rubric") label = t("productRubric");
    else if (["Submission", "Format"].includes(category ?? "")) label = t("productSubmission");
    else if (["Schedule", "Procedure", "Delivery"].includes(category ?? ""))
      label = t("productArrangements");
    else if (
      !category &&
      ["deadline", "submission_method", "deliverable", "responsibility", "format"].includes(
        fact.field
      )
    )
      label = t("productSubmission");
    else if (
      !category &&
      ["exam_date", "presentation_date", "duration", "mode", "question_count"].includes(fact.field)
    )
      label = t("productArrangements");
    sections.set(label, [...(sections.get(label) ?? []), fact]);
  }
  for (const label of [
    t("productSubmission"),
    t("productActions"),
    t("productArrangements"),
    t("productIssues"),
    t("productRubric"),
    t("productReference")
  ]) {
    const members = sections.get(label);
    if (!members?.length) continue;
    const optional = [t("productRubric"), t("productReference")].includes(label);
    const section = optional
      ? el("details", "product-details")
      : el("section", "detail-business-group");
    section.append(optional ? el("summary", "", label) : sectionHeading(label));
    const groups = new Map<string, FactView[]>();
    for (const fact of members)
      groups.set(fact.product?.group ?? "", [
        ...(groups.get(fact.product?.group ?? "") ?? []),
        fact
      ]);
    const groupPriority = (name: string) => {
      const index = DETAIL_GROUP_ORDER.indexOf(suppliedCategory(name) ?? "");
      return index < 0 ? DETAIL_GROUP_ORDER.length : index;
    };
    for (const [group, facts] of [...groups].sort(
      ([a], [b]) => groupPriority(a) - groupPriority(b)
    )) {
      if (group) section.append(el("h4", "checklist-heading", suppliedCategory(group) ?? group));
      const list = el("ul", "product-checklist");
      for (const fact of facts) if (!rendered.has(fact.factId)) list.append(draw(fact));
      section.append(list);
    }
    root.append(section);
  }
  // Cross-section child links and legacy fields remain reachable, never silently discarded.
  const remaining = input.filter((f) => !rendered.has(f.factId));
  if (remaining.length) {
    const list = el("ul", "product-checklist");
    for (const fact of remaining) if (!rendered.has(fact.factId)) list.append(draw(fact));
    root.append(list);
  }
  return root;
}

function renderDetail(ctx: ScreenContext, assessment: AssessmentCardView): HTMLElement {
  const detail = el("div", "assessment-detail");
  if (assessment.facts.some((f) => f.product)) {
    detail.append(el("h2", "assessment-name", assessment.name));
    const summary = summaryFacts(assessment),
      ids = new Set(summary.map((f) => f.factId));
    const fields = el("section", "assessment-summary planning-summary");
    for (const fact of summary) fields.append(planningFact(ctx, assessment, fact));
    detail.append(fields);
    for (const question of assessment.unresolvedQuestions)
      detail.append(paragraph("fact-question", question));
    detail.append(
      organizedDetails(
        ctx,
        assessment.facts.filter((f) => !ids.has(f.factId)),
        `brief:${assessment.assessmentId}`
      )
    );
    for (const child of assessment.components) {
      const section = el("details", "product-details");
      section.append(
        el("summary", "", child.name),
        organizedDetails(ctx, child.facts, `brief:${child.assessmentId}`)
      );
      detail.append(section);
    }
  } else detail.append(assessmentBody(ctx, assessment, { nested: false, showDetailAction: true }));
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
  nameInput.dataset.editKey = `assessment:${assessment.assessmentId}:name`;
  nameInput.value = assessment.name;
  nameRow.append(nameInput);
  form.append(sectionHeading(t("editAssessmentHeading")), nameRow);

  const editors: Array<{
    fact: FactView;
    input: HTMLInputElement;
    state: HTMLSelectElement;
    modality?: HTMLInputElement;
    conditions?: HTMLTextAreaElement;
    exceptions?: HTMLTextAreaElement;
  }> = [];
  for (const fact of assessment.facts) {
    if (!fact.editable) continue;
    const row = el("label", "field-row");
    row.append(el("span", "field-label", fact.label));
    const input = el("input", "text-input");
    input.type = "text";
    input.dataset.editKey = `fact:${fact.factId}`;
    input.value = fact.rawDisplay ?? fact.display;
    const state = el("select", "text-input");
    state.dataset.editKey = `fact:${fact.factId}:state`;
    state.setAttribute("aria-label", t("reviewValueState", { label: fact.label }));
    for (const [value, label] of [
      ["KNOWN", t("reviewKnown")],
      ["UNCERTAIN", t("reviewUncertain")],
      ["EXPLICITLY_UNKNOWN", t("reviewUnknown")]
    ]) {
      const option = el("option", "", label);
      option.value = value ?? "";
      option.selected = value === fact.knowledge;
      state.append(option);
    }
    row.append(input, state);
    form.append(row);
    const editor: (typeof editors)[number] = { fact, input, state };
    if (fact.semantics) {
      editor.modality = el("input", "text-input");
      editor.modality.value = fact.semantics.modality;
      editor.conditions = el("textarea", "text-input");
      editor.conditions.value = fact.semantics.conditions.join("\n");
      editor.exceptions = el("textarea", "text-input");
      editor.exceptions.value = fact.semantics.exceptions.join("\n");
      for (const [key, node, label] of [
        ["modality", editor.modality, t("reviewModality")],
        ["conditions", editor.conditions, t("reviewConditions")],
        ["exceptions", editor.exceptions, t("reviewExceptions")]
      ] as const) {
        node.dataset.editKey = `fact:${fact.factId}:${key}`;
        node.setAttribute("aria-label", `${label} · ${fact.label}`);
        const facetRow = el("label", "field-row");
        facetRow.append(el("span", "field-label", label), node);
        form.append(facetRow);
      }
    }
    editors.push(editor);
  }

  form.append(
    actionRow(
      primaryAction(t("save"), () => {
        for (const { fact, input, state, modality, conditions, exceptions } of editors) {
          const semantics =
            modality && conditions && exceptions
              ? {
                  modality: modality.value.trim(),
                  conditions: conditions.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  exceptions: exceptions.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                }
              : undefined;
          if (
            input.value === (fact.rawDisplay ?? fact.display) &&
            state.value === fact.knowledge &&
            JSON.stringify(semantics) === JSON.stringify(fact.semantics)
          )
            continue;
          ctx.actions.onMutation({
            kind: "EditFact",
            factId: fact.factId,
            ...(semantics ? { semantics } : {}),
            value: {
              state: state.value as FactValue["state"],
              ...(state.value === "EXPLICITLY_UNKNOWN" ? {} : { value: input.value }),
              ...(state.value === "UNCERTAIN"
                ? { competingValues: fact.competingValues ?? [] }
                : {})
            }
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
