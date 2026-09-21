import { control, data, el } from "../../app/dom";
import { t } from "../copy";
import type { AssessmentCardView, ReviewItemView, ScreenId } from "../contract";
import { assessmentBody, renderCourse } from "./course";
import {
  actionRow,
  backAction,
  hintFor,
  linkAction,
  noticeFor,
  primaryAction,
  screenNode,
  useHint,
  type ScreenContext
} from "./patterns";

export interface ReviewAction {
  label: string;
  onActivate: () => void;
}

export interface ReviewShellOptions {
  screen: ScreenId;
  courseCode?: string;
  position?: { index: number; total: number };
  title: string;
  subtitle?: string;
  body: HTMLElement[];
  primary?: ReviewAction;
  quiet: ReviewAction[];
  more: ReviewAction[];
}

/**
 * The shared Review frame: a light progress header, one item at a time, `Confirm` as the
 * primary action and everything else quiet. Review is a decision page, never navigation.
 */
export function reviewShell(ctx: ScreenContext, options: ReviewShellOptions): HTMLElement {
  const root = screenNode(el("section", `screen review-screen ${ctx.surface}`), options.screen);
  const header = el("header", "review-header");
  header.append(
    backAction("course", () => {
      const courseId = ctx.view.courseId;
      ctx.open(
        ctx.surface === "side-panel" ? "CRS-02" : "CRS-01",
        courseId === undefined ? undefined : { courseId }
      );
    })
  );
  if (options.courseCode !== undefined) {
    const title = el("div", "course-title-group");
    title.append(el("p", "course-code", options.courseCode));
    if (ctx.view.course)
      title.append(el("p", "course-name is-compact", ctx.view.course.courseName));
    header.append(title);
  }
  if (options.position) {
    const progress = el(
      "span",
      "review-progress",
      t("reviewProgress", { index: options.position.index, total: options.position.total })
    );
    data(progress, { index: options.position.index, total: options.position.total });
    header.append(progress);
  }
  root.append(header);
  appendNotice(ctx, root);

  const title = el("h2", "review-title", options.title);
  root.append(title);
  if (options.subtitle !== undefined) {
    root.append(el("p", "review-subtitle", options.subtitle));
  }
  for (const node of options.body) root.append(node);

  const actions = el("div", "actions review-actions");
  if (options.primary)
    actions.append(primaryAction(options.primary.label, options.primary.onActivate));
  for (const action of options.quiet) {
    actions.append(linkAction(action.label, action.onActivate));
  }
  if (options.more.length > 0) {
    const moreToggle = linkAction(t("reviewMore"), () => {
      ctx.ui.reviewMoreOpen = !ctx.ui.reviewMoreOpen;
      ctx.repaint();
    });
    moreToggle.setAttribute("aria-expanded", String(ctx.ui.reviewMoreOpen));
    actions.append(moreToggle);
    if (ctx.ui.reviewMoreOpen) {
      const items = el("div", "more-items");
      for (const item of options.more) {
        items.append(
          control(item.label, "menu-item", () => {
            ctx.ui.reviewMoreOpen = false;
            item.onActivate();
          })
        );
      }
      actions.append(items);
    }
  }
  root.append(actions);
  return root;
}

function appendNotice(ctx: ScreenContext, root: HTMLElement): void {
  const notice = noticeFor(ctx);
  if (notice) root.append(notice);
}

/** IRV-01 / CRV-02 — one whole Assessment at a time. */
export function renderInitialReview(ctx: ScreenContext, screen: ScreenId): HTMLElement {
  const review = ctx.view.review;
  // §6.7 sends a Review with nothing left in it straight back to the Course Brief: there is no
  // empty Review screen and no completion page. The `Nothing to review` screen that used to stand
  // here told the user there was nothing to review and gave them no way back, and the router could
  // not reach it either — it was kept alive by a fixture. (Gate 3 finding F33.)
  if (!review) return renderCourse(ctx, ctx.surface === "side-panel" ? "CRS-02" : "CRS-01");
  const assessment = assessmentForReview(ctx, review);

  if (ctx.ui.splitOpen) return renderSplit(ctx, "IRV-04", review, assessment);
  if (ctx.ui.mergeOpen) return renderMerge(ctx, "IRV-03", review);
  if (screen === "IRV-02" || ctx.ui.editingReviewId !== undefined) {
    return renderReviewEdit(ctx, review, assessment);
  }

  const body: HTMLElement[] = [];
  if (assessment)
    body.push(assessmentBody(ctx, assessment, { nested: false, showDetailAction: true }));
  for (const question of review.unresolvedQuestions) {
    body.push(el("p", "fact-question", question));
  }

  const available = new Set(review.actions);
  const quiet: ReviewAction[] = [];
  if (available.has("Edit")) {
    quiet.push({
      label: t("edit"),
      onActivate: () => {
        ctx.ui.editingReviewId = review.reviewItemId;
        ctx.repaint();
      }
    });
  }
  if (available.has("Exclude")) {
    quiet.push({ label: t("reviewExclude"), onActivate: () => excludeItem(ctx, review) });
  }
  if (available.has("ReviewLater")) {
    quiet.push({
      label: t("reviewLater"),
      onActivate: () =>
        ctx.actions.onMutation({ kind: "DeferReviewItem", reviewItemId: review.reviewItemId })
    });
  }
  const more: ReviewAction[] = [];
  if (available.has("SameAssessmentAs")) {
    more.push({
      label: t("reviewSameAssessmentAs"),
      onActivate: () => {
        ctx.ui.mergeOpen = true;
        ctx.repaint();
      }
    });
  }
  if (available.has("Split")) {
    more.push({
      label: t("reviewSplit"),
      onActivate: () => {
        ctx.ui.splitOpen = true;
        ctx.ui.splitParts = defaultSplitParts(assessment);
        ctx.repaint();
      }
    });
  }

  return reviewShell(ctx, {
    screen,
    ...(ctx.view.course ? { courseCode: ctx.view.course.courseCode } : {}),
    position: review.position,
    title: review.title,
    ...(review.subtitle !== undefined ? { subtitle: review.subtitle } : {}),
    body,
    primary: {
      label: t("reviewConfirm"),
      onActivate: () => confirmItem(ctx, review)
    },
    quiet,
    more
  });
}

/** IRV-06 — an Exclude is a mistake correction, so it can be taken back immediately. */
export function excludeItem(ctx: ScreenContext, review: ReviewItemView): void {
  ctx.actions.onMutation({ kind: "ExcludeReviewItem", reviewItemId: review.reviewItemId });
  ctx.actions.onNotify({
    screen: "IRV-06",
    message: t("toastExcluded"),
    actionLabel: t("undo"),
    onAction: () => {
      ctx.actions.onMutation({ kind: "UndeleteExclusion", reviewItemId: review.reviewItemId });
    }
  });
}

/** Confirm takes effect immediately; the last item is followed by light completion feedback. */
export function confirmItem(
  ctx: ScreenContext,
  review: ReviewItemView,
  edited?: {
    name?: string;
    facts?: Array<{ factId: string; value: { state: "KNOWN"; value: string } }>;
  },
  completeScreen?: ScreenId
): void {
  ctx.actions.onMutation({
    kind: "ConfirmReviewItem",
    reviewItemId: review.reviewItemId,
    ...(edited ? { edited } : {})
  });
  if (review.position.total > 0 && review.position.index >= review.position.total) {
    ctx.actions.onNotify({
      message: t("toastReviewComplete"),
      ...(completeScreen === undefined ? {} : { screen: completeScreen })
    });
  }
}

/** IRV-02 — the current Assessment edits in place and continues the same Review. */
function renderReviewEdit(
  ctx: ScreenContext,
  review: ReviewItemView,
  assessment: AssessmentCardView | undefined
): HTMLElement {
  const factEditors: Array<{ factId: string; display: string; input: HTMLInputElement }> = [];
  const nameRow = el("label", "field-row");
  nameRow.append(el("span", "field-label", t("editNameLabel")));
  const nameInput = el("input", "text-input");
  nameInput.type = "text";
  nameInput.value = review.title;
  nameRow.append(nameInput);

  const fields: HTMLElement[] = [nameRow];
  if (assessment) {
    for (const fact of assessment.facts) {
      if (!fact.editable) continue;
      const row = el("label", "field-row");
      row.append(el("span", "field-label", fact.label));
      const input = el("input", "text-input");
      input.type = "text";
      input.value = fact.display;
      row.append(input);
      fields.push(row);
      factEditors.push({ factId: fact.factId, display: fact.display, input });
    }
  }

  return reviewShell(ctx, {
    screen: "IRV-02",
    ...(ctx.view.course ? { courseCode: ctx.view.course.courseCode } : {}),
    position: review.position,
    title: review.title,
    body: fields,
    primary: {
      label: t("reviewConfirm"),
      onActivate: () => {
        const editedFacts = factEditors
          .filter((editor) => editor.input.value !== editor.display)
          .map((editor) => ({
            factId: editor.factId,
            value: { state: "KNOWN" as const, value: editor.input.value }
          }));
        const name = nameInput.value.trim();
        ctx.ui.editingReviewId = undefined;
        confirmItem(ctx, review, {
          ...(name.length > 0 && name !== review.title ? { name } : {}),
          ...(editedFacts.length > 0 ? { facts: editedFacts } : {})
        });
      }
    },
    quiet: [
      {
        label: t("cancel"),
        onActivate: () => {
          ctx.ui.editingReviewId = undefined;
          ctx.repaint();
        }
      }
    ],
    more: []
  });
}

/** IRV-03 / SYS-… — the user's own reading of "this is the same Assessment as that one". */
function renderMerge(ctx: ScreenContext, screen: ScreenId, review: ReviewItemView): HTMLElement {
  const candidates = (ctx.view.course?.assessments ?? []).filter(
    (assessment) => assessment.name !== review.title
  );
  const body: HTMLElement[] = [el("p", "review-note", t("mergeIntro"))];
  const hint = hintFor(ctx, "same-assessment-as", t("hintSameAssessmentAs"));
  if (hint) body.push(hint);
  if (candidates.length === 0) {
    body.push(el("p", "empty-state", t("mergeEmpty")));
  } else {
    const list = el("div", "merge-candidates");
    for (const candidate of candidates) {
      list.append(
        control(candidate.name, "menu-item", () => {
          // The hint has been read by the time the user picks a target, so this is where first
          // use is recorded — the same render that showed it is still on screen.
          useHint(ctx, "same-assessment-as");
          ctx.ui.mergeOpen = false;
          ctx.actions.onMutation({
            kind: "SameAssessmentAs",
            reviewItemId: review.reviewItemId,
            targetAssessmentId: candidate.assessmentId
          });
        })
      );
    }
    body.push(list);
  }
  return reviewShell(ctx, {
    screen,
    ...(ctx.view.course ? { courseCode: ctx.view.course.courseCode } : {}),
    position: review.position,
    title: t("mergeHeading"),
    body,
    quiet: [
      {
        label: t("cancel"),
        onActivate: () => {
          ctx.ui.mergeOpen = false;
          ctx.repaint();
        }
      }
    ],
    more: []
  });
}

function defaultSplitParts(assessment: AssessmentCardView | undefined): UiSplitPart[] {
  const facts = assessment?.facts.map((fact) => fact.factId) ?? [];
  return [
    { name: assessment?.name ?? "", factIds: facts },
    { name: "", factIds: [] }
  ];
}

interface UiSplitPart {
  name: string;
  factIds: string[];
}

/** IRV-04 — a low-frequency structural correction: one item is really two or more. */
function renderSplit(
  ctx: ScreenContext,
  screen: ScreenId,
  review: ReviewItemView,
  assessment: AssessmentCardView | undefined
): HTMLElement {
  const parts = ctx.ui.splitParts.length >= 2 ? ctx.ui.splitParts : defaultSplitParts(assessment);
  ctx.ui.splitParts = parts;
  const body: HTMLElement[] = [];
  const hint = hintFor(ctx, "split", t("hintSplit"));
  if (hint) body.push(hint);
  body.push(el("p", "review-note", t("splitIntro")));

  const partList = el("div", "split-parts");
  parts.forEach((part, index) => {
    const row = el("label", "field-row");
    row.append(el("span", "field-label", t("splitPart", { index: index + 1 })));
    const input = el("input", "text-input");
    input.type = "text";
    input.value = part.name;
    input.placeholder = t("splitPartName");
    input.addEventListener("input", () => {
      part.name = input.value;
    });
    row.append(input);
    partList.append(row);
  });
  body.push(partList);
  body.push(
    actionRow(
      linkAction(t("splitAddPart"), () => {
        ctx.ui.splitParts = [...parts, { name: "", factIds: [] }];
        ctx.repaint();
      })
    )
  );

  if (assessment) {
    body.push(el("p", "review-note", t("splitAssignFacts")));
    const facts = el("div", "facts");
    for (const fact of assessment.facts) {
      const row = el("div", "fact split-fact");
      row.append(
        el("span", "fact-label", fact.label),
        el("span", "fact-value is-static", fact.display)
      );
      const choices = el("div", "split-choices");
      parts.forEach((part, index) => {
        const button = control(String(index + 1), "split-choice", () => {
          assignFact(parts, fact.factId, index);
          ctx.repaint();
        });
        data(button, { part: index + 1, selected: String(part.factIds.includes(fact.factId)) });
        choices.append(button);
      });
      row.append(choices);
      facts.append(row);
    }
    body.push(facts);
  }

  return reviewShell(ctx, {
    screen,
    ...(ctx.view.course ? { courseCode: ctx.view.course.courseCode } : {}),
    position: review.position,
    title: t("splitHeading"),
    body,
    primary: {
      label: t("splitConfirm"),
      onActivate: () => {
        const named = parts.filter((part) => part.name.trim().length > 0);
        if (named.length < 2) return;
        // Recorded on confirmation, so the first-use hint was visible for the decision itself.
        useHint(ctx, "split");
        ctx.ui.splitOpen = false;
        ctx.actions.onMutation({
          kind: "SplitAssessment",
          reviewItemId: review.reviewItemId,
          parts: named.map((part) => ({ name: part.name.trim(), factIds: part.factIds }))
        });
      }
    },
    quiet: [
      {
        label: t("cancel"),
        onActivate: () => {
          ctx.ui.splitOpen = false;
          ctx.repaint();
        }
      }
    ],
    more: []
  });
}

function assignFact(parts: UiSplitPart[], factId: string, partIndex: number): void {
  parts.forEach((part, index) => {
    if (index === partIndex) {
      if (!part.factIds.includes(factId)) part.factIds.push(factId);
      return;
    }
    part.factIds = part.factIds.filter((item) => item !== factId);
  });
}

/** The whole Assessment behind a Review item, when the Course Brief is in the same view. */
export function assessmentForReview(
  ctx: ScreenContext,
  review: ReviewItemView
): AssessmentCardView | undefined {
  const assessments = ctx.view.course?.assessments ?? [];
  return assessments.find((assessment) => assessment.name === review.title) ?? assessments[0];
}
