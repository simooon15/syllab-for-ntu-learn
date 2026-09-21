import { data, el } from "../../app/dom";
import { t } from "../copy";
import type { ScreenId } from "../contract";
import { briefBody } from "./course";
import {
  actionRow,
  backAction,
  linkAction,
  primaryAction,
  screenNode,
  type ScreenContext
} from "./patterns";

/**
 * RBL-01 and RBL-03. The preview is a full rebuilt Course Brief, never a diff: the only
 * decision is Use rebuilt course or Keep current course. RBL-02/RBL-04 reuse the Scan screens.
 */
export function renderRebuild(ctx: ScreenContext, screen: ScreenId): HTMLElement {
  const root = screenNode(el("section", `screen rebuild-screen ${ctx.surface}`), screen);
  const course = ctx.view.course;

  const header = el("header", "course-header");
  header.append(
    backAction("course", () => {
      const courseId = ctx.view.courseId;
      ctx.open(
        ctx.surface === "side-panel" ? "CRS-02" : "CRS-01",
        courseId === undefined ? undefined : { courseId }
      );
    })
  );
  if (course) {
    const title = el("div", "course-title-group");
    title.append(
      el("p", "course-code", course.courseCode),
      el("h1", "course-name", course.courseName)
    );
    header.append(title);
  }
  root.append(header);

  if (screen === "RBL-01") {
    root.append(el("h2", "task-heading", t("rebuildConfirmTitle")));
    root.append(el("p", "review-note", t("rebuildConfirmBody")));
    root.append(
      actionRow(
        primaryAction(t("rebuildConfirmAction"), () => {
          ctx.ui.rebuildConfirmOpen = false;
          ctx.actions.onMutation({ kind: "RebuildCourse" });
        }),
        linkAction(t("cancel"), () => {
          ctx.ui.rebuildConfirmOpen = false;
          ctx.repaint();
        })
      )
    );
    return root;
  }

  const preview = ctx.view.rebuildPreview;
  const previewCourse = preview?.course ?? course;
  root.append(
    el("h2", "task-heading", preview?.partial ? t("rebuildPartialTitle") : t("rebuildPreviewLabel"))
  );
  if (preview?.partial) {
    const notice = el("div", "rebuild-coverage-notice");
    notice.append(
      el("p", "review-note", t("rebuildPartialBody")),
      el("p", "review-note", t("rebuildPartialStateSafe")),
      el("p", "review-note", t("rebuildPartialCannotAdopt"))
    );
    data(notice, { failedSourceCount: preview.failedSourceCount });
    root.append(notice);
  }
  if (previewCourse) root.append(briefBody(ctx, previewCourse, { showMore: false }));
  const keep = linkAction(t("keepCurrentCourse"), () => {
    ctx.actions.onMutation({ kind: "KeepCurrentCourse" });
  });
  root.append(
    preview?.canAdopt === false
      ? actionRow(keep)
      : actionRow(
          primaryAction(t("useRebuiltCourse"), () => {
            ctx.actions.onMutation({ kind: "UseRebuiltCourse" });
          }),
          keep
        )
  );
  return root;
}
