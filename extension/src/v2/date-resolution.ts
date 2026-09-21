import { qaTrace } from "./qa-telemetry";
import type { FactRecord, SemesterRecord } from "./schema";

/**
 * Semester-aware date resolution.
 *
 * A Source writes a date the way a person does — `Deadline: 18 Oct` — and the year is not in the
 * sentence. The model is asked what kind of date it is, not what year it is; the year is a fact
 * about the Course's Semester, and it is supplied here, deterministically.
 *
 * The rule is deliberately narrow. A date is resolved only when the Semester says which year the
 * month belongs to; anything else stays unresolved rather than guessed, and the raw value the
 * Source gave is never replaced — this module produces a second, canonical form beside it.
 */

export type DateResolutionSource =
  /** The Source itself wrote a complete date. */
  | "source"
  /** The Source gave a day and a month; the Course's Semester supplied the year. */
  | "semester";

export interface ResolvedDate {
  /** `YYYY-MM-DD`. */
  canonicalDate: string;
  source: DateResolutionSource;
  /** `HH:MM`, when the Source wrote a time with the date. */
  time?: string;
}

/** The part of a Semester this resolver needs. */
export interface SemesterContext {
  /** The year the academic year begins in: `AY2026/27` → `2026`. */
  startYear: number;
  term: 1 | 2;
}

// ---------------------------------------------------------------------------
// The Semester's months
// ---------------------------------------------------------------------------

/**
 * The months each term covers.
 *
 * `AY2026/27 · Semester 1` is Aug–Dec 2026 and `Semester 2` is Jan–May 2027. These boundaries come
 * from the Product Owner's direction (DIRECTION_ADJUSTMENTS §2.17); the repository states them
 * nowhere else, and the product model has no Special Term — so none is invented here. A month in
 * neither window is left unresolved.
 */
export function termMonths(term: 1 | 2): readonly number[] {
  return term === 1 ? [8, 9, 10, 11, 12] : [1, 2, 3, 4, 5];
}

const ACADEMIC_YEAR = /\bAY\s*(\d{4})\s*\/\s*(\d{2}|\d{4})\b/i;
const TERM = /\bSemester\s*([12])\b/i;

/**
 * The Semester context a label can supply. A label that does not name both an academic year and a
 * term yields nothing: this resolver never falls back to the current system year, because a date
 * seen in 2027 inside `AY2026/27 · Semester 1` still belongs to 2026.
 */
export function semesterContext(
  semester: Pick<SemesterRecord, "label"> | undefined
): SemesterContext | null {
  if (!semester) return null;
  const year = ACADEMIC_YEAR.exec(semester.label);
  const term = TERM.exec(semester.label);
  if (!year?.[1] || !term?.[1]) return null;
  const startYear = Number(year[1]);
  const second = year[2] ?? "";
  // `AY2026/27` and `AY2026/2027` both name the year that begins in 2026; anything else is a
  // label this resolver does not understand and must not interpret.
  if (second.length === 2 && Number(second) !== (startYear + 1) % 100) return null;
  if (second.length === 4 && Number(second) !== startYear + 1) return null;
  return { startYear, term: term[1] === "1" ? 1 : 2 };
}

// ---------------------------------------------------------------------------
// Reading a value
// ---------------------------------------------------------------------------

function pad(value: number, size: number): string {
  return String(value).padStart(size, "0");
}

function calendarDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(Date.UTC(year, month - 1, day));
  const real =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;
  return real ? `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` : null;
}

function clockTime(hour: string, minute: string): string | null {
  const parsed = Number(hour);
  return parsed >= 0 && parsed <= 23 ? `${pad(parsed, 2)}:${minute}` : null;
}

/**
 * A date the Source wrote in full, optionally with its time: `2026-11-19`, `2026-11-19T14:30`,
 * `19/11/2026`. These need no Semester and are resolved by the Source itself.
 */
export function parseCompleteDate(raw: unknown): { date: string; time?: string } | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/.exec(value);
  if (iso) {
    const date = calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (!date) return null;
    const time = iso[4] && iso[5] ? clockTime(iso[4], iso[5]) : null;
    return time ? { date, time } : { date };
  }
  const slashed = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2}))?/.exec(value);
  if (!slashed) return null;
  const date = calendarDate(Number(slashed[3]), Number(slashed[2]), Number(slashed[1]));
  if (!date) return null;
  const time = slashed[4] && slashed[5] ? clockTime(slashed[4], slashed[5]) : null;
  return time ? { date, time } : { date };
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12
};

const DAY_MONTH = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?$/;
const MONTH_DAY = /^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/;

function monthNumber(name: string): number | null {
  return MONTH_NAMES[name.toLowerCase()] ?? null;
}

/** A day and a month a Source wrote without a year — `18 Oct`, `18 October`, `Oct 18`. */
function partialDate(raw: string): { day: number; month: number; year?: number } | null {
  const value = raw.trim().replace(/\s+/g, " ").replace(/,$/, "");
  const dayFirst = DAY_MONTH.exec(value);
  if (dayFirst?.[1] && dayFirst[2]) {
    const month = monthNumber(dayFirst[2]);
    if (month === null) return null;
    const year = dayFirst[3];
    return { day: Number(dayFirst[1]), month, ...(year ? { year: Number(year) } : {}) };
  }
  const monthFirst = MONTH_DAY.exec(value);
  if (monthFirst?.[1] && monthFirst[2]) {
    const month = monthNumber(monthFirst[1]);
    if (month === null) return null;
    const year = monthFirst[3];
    return { day: Number(monthFirst[2]), month, ...(year ? { year: Number(year) } : {}) };
  }
  return null;
}

/**
 * The canonical date for a value, or `null` when it cannot be settled.
 *
 * `null` is the answer for anything the rules above do not cover — `Week 8`, `TBC`,
 * `mid-semester`, a day and month that fall outside the Semester's months, or a day and month with
 * no Semester to place them in. Not every date can be placed, and saying so is the point.
 */
export function resolveDate(raw: unknown, semester: SemesterContext | null): ResolvedDate | null {
  // A Source that wrote the date in full resolved itself; the Semester is not consulted, so a
  // complete date is unaffected by which Semester happens to hold the Course.
  const complete = parseCompleteDate(raw);
  if (complete) {
    return {
      canonicalDate: complete.date,
      source: "source",
      ...(complete.time ? { time: complete.time } : {})
    };
  }
  if (typeof raw !== "string") return null;
  const partial = partialDate(raw);
  if (!partial) return null;
  if (partial.year !== undefined) {
    const date = calendarDate(partial.year, partial.month, partial.day);
    return date ? { canonicalDate: date, source: "source" } : null;
  }
  if (!semester) return null;
  if (!termMonths(semester.term).includes(partial.month)) return null;
  const year = semester.term === 1 ? semester.startYear : semester.startYear + 1;
  const date = calendarDate(year, partial.month, partial.day);
  return date ? { canonicalDate: date, source: "semester" } : null;
}

/**
 * Whether a value is a date the Source wrote, as opposed to any other field.
 *
 * A Course holds marks, group sizes and sentences as well as dates, and a value this module cannot
 * place is only interesting when it was trying to be a date in the first place — otherwise "3 of 6
 * dates unresolved" would be counting a percentage. Used only to decide what the QA trace records;
 * resolution itself does not consult it, and nothing is resolved differently because of it.
 */
function looksLikeADate(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const value = raw.trim();
  if (parseCompleteDate(value) !== null) return true;
  if (partialDate(value) !== null) return true;
  // A field that names a period rather than a day is still the Source trying to state a date.
  return /\b(week\s*\d+|tbc|tba|to be (?:confirmed|advised)|mid-?semester)\b/i.test(value);
}

/**
 * Every fact that resolves, keyed by fact id. Facts that do not resolve are absent rather than
 * present-and-null, so a consumer can count what it was given without inspecting values.
 *
 * The Semester is passed as the record so that both callers — the screen that previews the export
 * and the action that performs it — compose this the same way, and so cannot disagree.
 */
export function resolveCourseDates(
  facts: readonly FactRecord[],
  semester: Pick<SemesterRecord, "label"> | undefined
): ReadonlyMap<string, ResolvedDate> {
  const context = semesterContext(semester);
  const resolved = new Map<string, ResolvedDate>();
  for (const fact of facts) {
    const hit = resolveDate(fact.value.value, context);
    if (hit) resolved.set(fact.factId, hit);
    if (!looksLikeADate(fact.value.value)) continue;
    // The raw value, the Semester it was read against, and what came of it — the one comparison a
    // real acceptance run exists to make. Recorded whether or not it resolved: "this date could not
    // be placed" is the answer the rule is designed to be able to give.
    qaTrace("qa.date-resolution", {
      rawValue: fact.value.value,
      semester: semester?.label ?? null,
      resolved: hit !== null,
      canonicalDate: hit?.canonicalDate ?? null,
      resolutionSource: hit?.source ?? null
    });
  }
  return resolved;
}

export { clockTime };
