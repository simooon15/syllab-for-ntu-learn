import type { FactValue } from "../schema";
import { control, data, el } from "../../app/dom";
import { t } from "../copy";
import type { EvidenceView, ReviewItemView, ScreenId } from "../contract";
import { renderInitialReview, reviewShell, type ReviewAction } from "./initial-review";
import {
  actionRow,
  evidenceBlock,
  linkAction,
  markChips,
  primaryAction,
  secondaryAction,
  type ScreenContext
} from "./patterns";

export type ChangeLayout = "initial" | "changed" | "new" | "conflict" | "removed" | "identity";

/**
 * A Change Review decision is sent as the item id the contract gives the renderer: the view
 * exposes `reviewItemId` only, so the service worker resolves it to the pending change it
 * belongs to. Keep both sides on that reading.
 */

/** CRV-01, CRV-03 … CRV-05. A New Assessment Review (CRV-02) reuses the Initial Review body. */
export function renderChangeReview(
  ctx: ScreenContext,
  screen: ScreenId,
  layout: ChangeLayout
): HTMLElement {
  const review = ctx.view.review;
  if (!review) return renderInitialReview(ctx, screen);
  if (layout === "new") return renderInitialReview(ctx, "CRV-02");
  if (layout === "initial") return renderInitialReview(ctx, screen);

  const shellBase = {
    screen,
    ...(ctx.view.course ? { courseCode: ctx.view.course.courseCode } : {}),
    position: review.position,
    title: review.title,
    more: [] as ReviewAction[]
  };

  if (layout === "conflict") {
    return reviewShell(ctx, {
      ...shellBase,
      ...(review.subtitle === undefined ? {} : { subtitle: review.subtitle }),
      body: [...conflictBody(ctx, review), ...reviewContext(ctx, review)],
      quiet: [
        {
          label: t("conflictEditValue"),
          onActivate: () => {
            ctx.ui.conflictEditing = !ctx.ui.conflictEditing;
            ctx.repaint();
          }
        },
        {
          label: t("keepCurrent"),
          onActivate: () =>
            ctx.actions.onMutation({ kind: "KeepCurrent", changeId: review.reviewItemId })
        }
      ]
    });
  }

  if (layout === "removed") {
    const body: HTMLElement[] = [];
    const markRow = el("div", "review-marks");
    for (const mark of markChips(["PossiblyRemoved"])) markRow.append(mark);
    body.push(markRow);
    body.push(...reviewContext(ctx, review));
    return reviewShell(ctx, {
      ...shellBase,
      body,
      primary: {
        label: t("keep"),
        onActivate: () =>
          ctx.actions.onMutation({ kind: "KeepPossiblyRemoved", changeId: review.reviewItemId })
      },
      quiet: [
        {
          label: t("remove"),
          onActivate: () =>
            ctx.actions.onMutation({ kind: "RemovePossiblyRemoved", changeId: review.reviewItemId })
        }
      ]
    });
  }

  if (layout === "identity") {
    const body = [
      staticValue(review.current?.values[0]?.display ?? review.title),
      el("p", "identity-separator", t("identitySeparator")),
      staticValue(review.latest?.values[0]?.display ?? review.subtitle ?? review.title),
      ...reviewContext(ctx, review)
    ];
    return reviewShell(ctx, {
      ...shellBase,
      title: t("identityQuestion"),
      body,
      primary: {
        label: t("identitySame"),
        onActivate: () =>
          ctx.actions.onMutation({
            kind: "ResolveIdentity",
            changeId: review.reviewItemId,
            relationship: "SAME_ASSESSMENT"
          })
      },
      quiet: [
        {
          label: t("identityDifferent"),
          onActivate: () =>
            ctx.actions.onMutation({
              kind: "ResolveIdentity",
              changeId: review.reviewItemId,
              relationship: "DIFFERENT_ASSESSMENT"
            })
        }
      ]
    });
  }

  // changed — a Review shows only the field that actually moved
  return reviewShell(ctx, {
    ...shellBase,
    body: [
      sideBlock(ctx, "current", review.current?.label ?? t("changeCurrent"), review.current),
      sideBlock(ctx, "latest", review.latest?.label ?? t("changeLatest"), review.latest),
      ...reviewContext(ctx, review)
    ],
    primary: {
      label: t("acceptChange"),
      onActivate: () =>
        ctx.actions.onMutation({ kind: "AcceptChange", changeId: review.reviewItemId })
    },
    quiet: [
      {
        label: t("keepCurrent"),
        onActivate: () =>
          ctx.actions.onMutation({ kind: "KeepCurrent", changeId: review.reviewItemId })
      }
    ]
  });
}

type ReviewSide = ReviewItemView["current"];
type ReviewValue = { display: string; evidence: EvidenceView[] };

/** All change dispositions retain their scoped judgment and source context, including no-value conflicts. */
function reviewContext(ctx: ScreenContext, review: ReviewItemView): HTMLElement[] {
  const body: HTMLElement[] = review.unresolvedQuestions.map((question) =>
    el("p", "fact-question", question)
  );
  if (review.issueEvidence?.length) {
    const key = `issues:${review.reviewItemId}`;
    if (ctx.ui.evidence.includes(key)) body.push(evidenceBlock(ctx, key, review.issueEvidence));
    else
      body.push(
        control(
          t("showEvidence", { label: t("evidenceCourseSource") }),
          "fact-value is-swappable is-fact",
          () => {
            ctx.ui.evidence = [...ctx.ui.evidence, key];
            ctx.repaint();
          }
        )
      );
  }
  return body;
}

function staticValue(text: string): HTMLElement {
  return el("p", "fact-value is-static", text);
}

function sideBlock(
  ctx: ScreenContext,
  scope: string,
  label: string,
  side: ReviewSide
): HTMLElement {
  const block = el("div", "change-side");
  data(block, { side: scope });
  block.append(el("h3", "change-label", label));
  const values = el("div", "change-values");
  side?.values.forEach((value, index) => {
    values.append(valueNode(ctx, `${scope}:${String(index)}`, value));
  });
  if (!side || side.values.length === 0) values.append(staticValue("—"));
  block.append(values);
  return block;
}

/**
 * A value inside a Change Review. Each value carries its own evidence, and the value itself
 * is the trigger — the same in-place swap a fact uses in the Course Brief.
 */
function valueNode(ctx: ScreenContext, key: string, value: ReviewValue): HTMLElement {
  if (ctx.ui.evidence.includes(key)) return evidenceBlock(ctx, key, value.evidence);
  if (value.evidence.length === 0) return staticValue(value.display);
  return control(value.display, "fact-value is-swappable", () => {
    ctx.ui.evidence = [...ctx.ui.evidence, key];
    ctx.repaint();
  });
}

function conflictBody(ctx: ScreenContext, review: ReviewItemView): HTMLElement[] {
  const body: HTMLElement[] = [];
  body.push(sideBlock(ctx, "current", review.current?.label ?? t("changeCurrent"), review.current));

  const other = el("div", "change-side");
  data(other, { side: "other" });
  other.append(el("h3", "change-label", review.latest?.label ?? t("changeOtherValues")));
  const values = el("div", "change-values");
  review.latest?.values.forEach((value, index) => {
    const row = el("div", "conflict-value");
    row.append(valueNode(ctx, `latest:${String(index)}`, value));
    row.append(
      linkAction(t("conflictUseValue"), () => {
        ctx.actions.onMutation({
          kind: "ResolveConflict",
          changeId: review.reviewItemId,
          value: { state: "KNOWN", value: value.display }
        });
      })
    );
    values.append(row);
  });
  if (!review.latest || review.latest.values.length === 0) values.append(staticValue("—"));
  other.append(values);
  body.push(other);

  if (ctx.ui.conflictEditing) {
    const row = el("label", "field-row");
    row.append(el("span", "field-label", t("conflictValueLabel")));
    const input = el("input", "text-input");
    input.type = "text";
    input.dataset.editKey = `conflict:${review.reviewItemId}`;
    const state = el("select", "text-input");
    state.setAttribute("aria-label", t("reviewValueState", { label: review.title }));
    state.dataset.editKey = `conflict-state:${review.reviewItemId}`;
    for (const [value, label] of [
      ["KNOWN", t("reviewKnown")],
      ["UNCERTAIN", t("reviewUncertain")],
      ["EXPLICITLY_UNKNOWN", t("reviewUnknown")]
    ] as const) {
      const option = el("option", "", label);
      option.value = value;
      option.selected = value === (review.current?.value?.state ?? "KNOWN");
      state.append(option);
    }
    row.append(state);
    row.append(input);
    body.push(row);
    body.push(
      actionRow(
        primaryAction(t("conflictSaveValue"), () => {
          ctx.ui.conflictEditing = false;
          ctx.actions.onMutation({
            kind: "ResolveConflict",
            changeId: review.reviewItemId,
            value: {
              state: state.value as FactValue["state"],
              ...(state.value === "EXPLICITLY_UNKNOWN" ? {} : { value: input.value }),
              ...(state.value === "UNCERTAIN"
                ? {
                    competingValues: [
                      review.current?.value?.value,
                      review.latest?.value?.value,
                      ...(review.current?.value?.competingValues ?? []),
                      ...(review.latest?.value?.competingValues ?? [])
                    ]
                      .filter((v): v is NonNullable<FactValue["value"]> => v !== undefined)
                      .filter(
                        (v, i, all) =>
                          all.findIndex((x) => JSON.stringify(x) === JSON.stringify(v)) === i
                      )
                  }
                : {})
            }
          });
        }),
        secondaryAction(t("cancel"), () => {
          ctx.ui.conflictEditing = false;
          ctx.repaint();
        })
      )
    );
  }
  return body;
}
