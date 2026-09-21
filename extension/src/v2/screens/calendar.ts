import { el } from "../../app/dom";
import { t } from "../copy";
import type { ScreenId } from "../contract";
import {
  actionRow,
  backAction,
  linkAction,
  noticeFor,
  primaryAction,
  screenNode,
  type ScreenContext
} from "./patterns";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

/**
 * `2026-10-18` reads as `18 Oct` on screen.
 *
 * The event carries the canonical date — that is what identifies it and what the file writes —
 * but the screen shows the date the way the Interface Spec draws it. Anything that is not a
 * canonical date is left alone rather than reformatted into something wrong.
 */
function eventDateLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match?.[2] || !match[3]) return value;
  const month = MONTH_SHORT[Number(match[2]) - 1];
  return month ? `${String(Number(match[3]))} ${month}` : value;
}

/** CAL-01 Calendar Export Preview. The completion feedback (CAL-02) is a light notice. */
export function renderCalendar(ctx: ScreenContext, screen: ScreenId): HTMLElement {
  const root = screenNode(el("section", `screen calendar-screen ${ctx.surface}`), screen);
  const course = ctx.view.course;
  const events = ctx.view.exportPreview?.events ?? [];
  const unresolved = ctx.view.exportPreview?.unresolvedCount ?? 0;
  const dateCount = ctx.view.exportPreview?.dateCount ?? 0;
  const courseId = ctx.view.courseId;

  const header = el("header", "course-header");
  header.append(
    backAction("course", () => {
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
  root.append(header, el("h2", "task-heading", t("calendarTitle")));
  const notice = noticeFor(ctx);
  if (notice) root.append(notice);

  if (events.length === 0) {
    // "No dates" would be untrue when the Course holds dates this product cannot place, so the
    // headline says what is actually the case and the note says why.
    root.append(
      el("p", "empty-state", t(dateCount > 0 ? "calendarNoneExportable" : "calendarEmpty"))
    );
    if (unresolved > 0) root.append(el("p", "calendar-note", unresolvedNote(unresolved)));
    return root;
  }

  const count =
    events.length === 1
      ? t("calendarEventCountOne")
      : t("calendarEventCount", { count: events.length });
  root.append(el("p", "calendar-count", count));
  const list = el("ol", "calendar-events");
  for (const event of events) {
    const row = el("li", "calendar-event");
    row.append(
      el("span", "event-title", event.title),
      el("span", "event-date", eventDateLabel(event.date))
    );
    list.append(row);
  }
  root.append(list);
  // A partial export says so: the dates it could not place are named rather than dropped quietly.
  if (unresolved > 0) root.append(el("p", "calendar-note", unresolvedNote(unresolved)));

  if (courseId !== undefined) {
    root.append(
      actionRow(
        primaryAction(t("calendarExport"), () => {
          ctx.actions.onExportCalendar(courseId);
        }),
        linkAction(t("cancel"), () => {
          ctx.open(ctx.surface === "side-panel" ? "CRS-02" : "CRS-01", { courseId });
        })
      )
    );
  }
  return root;
}

function unresolvedNote(count: number): string {
  return count === 1 ? t("calendarUnresolvedOne") : t("calendarUnresolved", { count });
}
