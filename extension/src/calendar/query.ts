import type { BriefItem } from "../brief/domain";
import type { CalendarEvent } from "./domain";

const dateField = /(?:date|deadline|due|when|start)/i;
const timeField = /(?:time|startTime)/i;

function normalizedDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const slash = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const year = Number(slash[3]);
    const checked = new Date(year, month - 1, day);
    if (
      checked.getFullYear() === year &&
      checked.getMonth() === month - 1 &&
      checked.getDate() === day
    ) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function firstString(value: Record<string, unknown>, keys: RegExp): string | undefined {
  return Object.entries(value).find(
    ([key, candidate]) => keys.test(key) && typeof candidate === "string"
  )?.[1] as string | undefined;
}

function eventTitle(item: BriefItem, parents: ReadonlyMap<string, BriefItem>): string {
  const value = item.currentValue;
  const own = firstString(value, /^(?:title|name|label|event|assessment|what|description)$/i);
  const parent = item.parentBriefItemId ? parents.get(item.parentBriefItemId) : undefined;
  const parentName = parent
    ? firstString(parent.currentValue, /^(?:title|name|label|assessment|identifier)$/i)
    : undefined;
  return own ?? parentName ?? (item.kind === "assessment" ? "Assessment" : "Important date");
}

export function calendarEventsFromBrief(items: readonly BriefItem[]): CalendarEvent[] {
  const parents = new Map(items.map((item) => [item.briefItemId, item]));
  const seen = new Set<string>();
  const events: CalendarEvent[] = [];
  for (const item of items) {
    if (
      Object.entries(item.fieldStates).some(
        ([field, state]) => dateField.test(field) && state.status === "Unresolved"
      )
    ) {
      continue;
    }
    const rawDate = firstString(item.currentValue, dateField);
    const date = normalizedDate(rawDate);
    if (!date) continue;
    const title = eventTitle(item, parents);
    const time = firstString(item.currentValue, timeField)?.match(
      /\b([01]\d|2[0-3]):([0-5]\d)\b/
    )?.[0];
    const dedupeKey = `${title.toLowerCase()}|${date}|${time ?? ""}|${item.parentBriefItemId ?? "course"}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    events.push({
      eventId: `${item.briefItemId}:${date}:${time ?? "all-day"}`,
      title,
      date,
      ...(time ? { time } : {}),
      description: `Syllab ${item.kind.replace("_", " ")}`
    });
  }
  return events;
}
