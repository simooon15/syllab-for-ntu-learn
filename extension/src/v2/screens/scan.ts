import { append, el } from "../../app/dom";
import { t } from "../copy";
import type { ScreenId } from "../contract";
import { backAction, noticeFor, screenNode, taskBlock, type ScreenContext } from "./patterns";

/**
 * ISC-02 … ISC-06. RBL-02 and RBL-04 reuse this module with their own ids: Rebuild never
 * invents a second progress language and never changes the current Course State on failure.
 */
export function renderScan(ctx: ScreenContext, screen: ScreenId): HTMLElement {
  const root = screenNode(el("section", `screen scan-screen ${ctx.surface}`), screen);
  const course = ctx.view.course;
  const task = ctx.view.task;

  const header = el("header", "course-header");
  header.append(
    backAction("course", () => {
      if (course?.established === true) {
        ctx.open(ctx.surface === "side-panel" ? "CRS-02" : "CRS-01", { courseId: course.courseId });
        return;
      }
      ctx.open(ctx.surface === "side-panel" ? "SEM-02" : "SEM-01");
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
  append(root, noticeFor(ctx));

  if (task) {
    if (screen === "ISC-02" && task.state === "working") {
      root.append(el("h2", "task-heading", t("scanWorkingHeading")));
    }
    root.append(taskBlock(ctx, task, { forceDetails: screen === "ISC-06" }));
    return root;
  }

  // A route that names an error state without a workflow still shows the same shell.
  const block = el("div", "task-block");
  block.append(el("h2", "task-title", t("scanFailedTitle")));
  root.append(block);
  return root;
}
