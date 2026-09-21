import type { CalendarEvent } from "../calendar/domain";
import { serializeCalendar } from "../calendar/ics";
import { fieldLabel } from "./assessments";
import { clockTime, type ResolvedDate } from "./date-resolution";
import type {
  AssessmentRecord,
  ChangeRecord,
  ConstraintRecord,
  CourseRecord,
  EvidenceReference,
  FactRecord
} from "./domain";
import { isInternalIdentifier } from "./migration";

/**
 * Calendar export places the dates it is handed. It never looks for something date-shaped among
 * arbitrary field names (that is what made v0.1.0 miss confirmed dates — KR-07) and it never reads
 * a year out of anything: `date-resolution.ts` has already decided which dates are real, including
 * the year the Course's Semester supplies, and this module receives that answer.
 *
 * A fact is exportable when it is a date-bearing field, nothing about it is still in conflict, and
 * it appears in `dates`. One real deadline produces exactly one event: event identity is the owning
 * object plus the real event date, never the amount of evidence behind it, and equivalent facts
 * share one event with their evidence consolidated.
 */

export const DATE_FACT_FIELDS = [
  "date",
  "deadline",
  "due_date",
  "exam_date",
  "start_date"
] as const;
export const TIME_FACT_FIELDS = ["time", "start_time"] as const;

/** A time fact pairs with the date field it was recorded for; an unpaired one only with a single date. */
const TIME_AFFINITY: Record<string, string> = {
  date: "time",
  deadline: "time",
  due_date: "time",
  exam_date: "time",
  start_date: "start_time"
};

const CALENDAR_FALLBACK_NAME = "Syllab calendar";
const TITLE_LIMIT = 80;
const FILE_NAME_LIMIT = 60;

export interface CalendarExportInput {
  course: CourseRecord;
  assessments: readonly AssessmentRecord[];
  facts: readonly FactRecord[];
  constraints?: readonly ConstraintRecord[];
  changes?: readonly ChangeRecord[];
  /**
   * The dates the facts resolved to, keyed by fact id.
   *
   * Resolution happens upstream — in `date-resolution.ts`, which is also where the Semester is
   * understood. This module deliberately does not read a date out of a value: it places what it is
   * given and nothing else, so it can never resolve a date differently from the screen that
   * promised it.
   */
  dates: ReadonlyMap<string, ResolvedDate>;
}

export interface CalendarEventDraft {
  /** Canonical identity: the owning object plus the real event date and time. */
  eventKey: string;
  title: string;
  date: string;
  time?: string;
  description: string;
  factIds: string[];
  evidenceIds: string[];
}

export interface CalendarExportSummary {
  events: CalendarEventDraft[];
  /** Settled facts in a date-bearing field — the dates the Course actually holds. */
  dateCount: number;
  /** Of those, the ones that resolved to a real date. */
  exportableCount: number;
  /** Of those, the ones that could not be placed. Never silently dropped, only reported. */
  unresolvedCount: number;
}

export interface CalendarExportResult extends CalendarExportSummary {
  fileName: string;
  content: string;
}

type EventOwner =
  | { kind: "assessment"; key: string; assessment: AssessmentRecord }
  | { kind: "constraint"; key: string; constraint: ConstraintRecord }
  | { kind: "course"; key: string };

// ---------------------------------------------------------------------------
// Reading values
// ---------------------------------------------------------------------------

function clockOf(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  return match?.[1] && match[2] ? clockTime(match[1], match[2]) : null;
}

function isResolved(fact: FactRecord): boolean {
  if (fact.superseded) return false;
  if (fact.value.state !== "KNOWN") return false;
  // Competing values mean the value is not settled. Exporting one of them would silently pick a
  // date the user has not chosen, so the fact stays out of the calendar instead.
  return (fact.value.competingValues ?? []).length === 0;
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit);
  const boundary = cut.lastIndexOf(" ");
  return `${boundary > limit / 2 ? cut.slice(0, boundary) : cut}...`;
}

/** The view layer resolves a reference through its evidence id; the contract type is closed. */
interface LinkedEvidenceReference extends EvidenceReference {
  evidenceId?: string;
}

function evidenceIdOf(reference: EvidenceReference): string {
  const linked: LinkedEvidenceReference = reference;
  return linked.evidenceId ?? `${linked.sourceId}|${linked.locator}`;
}

// ---------------------------------------------------------------------------
// Conflict gate
// ---------------------------------------------------------------------------

/**
 * A pending Conflict is an unresolved question about the current value. Until it is resolved the
 * affected field is not a settled date, so it is never exported as one.
 */
function conflictedFields(changes: readonly ChangeRecord[]): Map<string, Set<string>> {
  const blocked = new Map<string, Set<string>>();
  for (const change of changes) {
    if (change.changeType !== "CONFLICT") continue;
    const fields = blocked.get(change.targetId) ?? new Set<string>();
    // An object-wide conflict blocks every field of that object.
    fields.add(change.field ?? "");
    blocked.set(change.targetId, fields);
  }
  return blocked;
}

function isConflicted(blocked: Map<string, Set<string>>, ownerKey: string, field: string): boolean {
  const fields = blocked.get(ownerKey);
  return fields !== undefined && (fields.has("") || fields.has(field));
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function courseLabel(course: CourseRecord): string {
  const code = course.courseCode.trim();
  if (code.length > 0 && !isInternalIdentifier(code)) return code;
  const name = course.courseName.trim();
  return name.length > 0 && !isInternalIdentifier(name) ? name : CALENDAR_FALLBACK_NAME;
}

function resolveOwner(
  fact: FactRecord,
  input: CalendarExportInput,
  assessments: ReadonlyMap<string, AssessmentRecord>,
  constraints: ReadonlyMap<string, ConstraintRecord>
): EventOwner | null {
  if (fact.assessmentId !== undefined) {
    const assessment = assessments.get(fact.assessmentId);
    // A superseded object is no longer part of the Current Course State.
    if (!assessment || assessment.supersededBy !== undefined) return null;
    return { kind: "assessment", key: assessment.assessmentId, assessment };
  }
  if (fact.constraintId !== undefined) {
    const constraint = constraints.get(fact.constraintId);
    if (!constraint || constraint.superseded) return null;
    return { kind: "constraint", key: constraint.constraintId, constraint };
  }
  // A course-level date has no assessment to sit under; it is still a real event of the course.
  return { kind: "course", key: input.course.courseId };
}

function ownerTitle(owner: EventOwner, label: string, field: string): string {
  if (owner.kind === "assessment") return owner.assessment.name;
  if (owner.kind === "constraint") return truncate(owner.constraint.content, TITLE_LIMIT);
  return `${label} - ${fieldLabel(field)}`;
}

function ownerDescription(owner: EventOwner, label: string, fields: string[]): string {
  const labels = [...new Set(fields.map((field) => fieldLabel(field)))].sort().join(", ");
  return owner.kind === "course" ? label : `${label} - ${labels}`;
}

function ownerKeyOf(fact: FactRecord, courseId: string): string {
  return fact.assessmentId ?? fact.constraintId ?? courseId;
}

/**
 * The export. Facts the user kept as Possibly Removed are part of the Current Course State, so
 * they are exported like any other; only a resolved value and an unresolved Conflict decide.
 */
export function calendarSummary(input: CalendarExportInput): CalendarExportSummary {
  const assessments = new Map(input.assessments.map((item) => [item.assessmentId, item]));
  const constraints = new Map((input.constraints ?? []).map((item) => [item.constraintId, item]));
  const blocked = conflictedFields(input.changes ?? []);
  const label = courseLabel(input.course);

  const dateFacts = input.facts.filter(
    (fact) => isResolved(fact) && (DATE_FACT_FIELDS as readonly string[]).includes(fact.field)
  );
  const timeFacts = input.facts
    .filter(
      (fact) => isResolved(fact) && (TIME_FACT_FIELDS as readonly string[]).includes(fact.field)
    )
    .flatMap((fact) => {
      const value = clockOf(fact.value.value);
      if (!value) return [];
      return [{ fact, value }];
    });

  const dateCounts = new Map<string, number>();
  for (const fact of dateFacts) {
    const key = ownerKeyOf(fact, input.course.courseId);
    dateCounts.set(key, (dateCounts.get(key) ?? 0) + 1);
  }

  const events = new Map<string, CalendarEventDraft>();
  const fieldsByEvent = new Map<string, string[]>();
  let exportableCount = 0;
  let unresolvedCount = 0;
  for (const fact of dateFacts) {
    // No resolved date means the Course holds a date this product cannot place. It is counted as
    // unresolved and no event is invented for it.
    const canonical = input.dates.get(fact.factId);
    if (!canonical) {
      unresolvedCount += 1;
      continue;
    }
    const owner = resolveOwner(fact, input, assessments, constraints);
    if (!owner) continue;
    // Conflict-blocked is a third outcome: the date is real, it just is not settled. It is neither
    // exportable nor unresolved, so it is in neither count.
    if (isConflicted(blocked, owner.key, fact.field)) continue;
    exportableCount += 1;
    const time =
      canonical.time ?? timeOf(fact, owner, timeFacts, dateCounts, input.course.courseId);
    const eventKey = `${owner.key}|${canonical.canonicalDate}|${time ?? ""}`;
    const evidenceIds = fact.evidenceRefs.map(evidenceIdOf);
    const fields = fieldsByEvent.get(eventKey) ?? [];
    if (!fields.includes(fact.field)) fields.push(fact.field);
    fieldsByEvent.set(eventKey, fields);
    const existing = events.get(eventKey);
    if (existing) {
      // Equivalent facts are one real event: their evidence consolidates onto it.
      existing.factIds.push(fact.factId);
      existing.description = ownerDescription(owner, label, fields);
      for (const evidenceId of evidenceIds) {
        if (!existing.evidenceIds.includes(evidenceId)) existing.evidenceIds.push(evidenceId);
      }
      continue;
    }
    events.set(eventKey, {
      eventKey,
      title: ownerTitle(owner, label, fact.field),
      date: canonical.canonicalDate,
      ...(time ? { time } : {}),
      description: ownerDescription(owner, label, fields),
      factIds: [fact.factId],
      evidenceIds: [...new Set(evidenceIds)]
    });
  }

  const sorted = [...events.values()].sort((left, right) => {
    const leftKey = `${left.date}|${left.time ?? ""}|${left.title}|${left.eventKey}`;
    const rightKey = `${right.date}|${right.time ?? ""}|${right.title}|${right.eventKey}`;
    return leftKey.localeCompare(rightKey);
  });

  return {
    events: sorted,
    dateCount: dateFacts.length,
    exportableCount,
    unresolvedCount
  };
}

/** The events alone, for callers that need nothing else. */
export function calendarEvents(input: CalendarExportInput): CalendarEventDraft[] {
  return calendarSummary(input).events;
}

function timeOf(
  fact: FactRecord,
  owner: EventOwner,
  timeFacts: readonly { fact: FactRecord; value: string }[],
  dateCounts: ReadonlyMap<string, number>,
  courseId: string
): string | undefined {
  const own = timeFacts.filter((entry) => ownerKeyOf(entry.fact, courseId) === owner.key);
  const preferred = own.find((entry) => entry.fact.field === TIME_AFFINITY[fact.field]);
  if (preferred) return preferred.value;
  // An unpaired time fact belongs to the only date that object has, and to nothing else.
  return (dateCounts.get(owner.key) ?? 0) === 1 && own.length === 1 ? own[0]?.value : undefined;
}

/**
 * The file name uses the course code or name the user recognises. An internal Blackboard
 * identifier is never used, and a course without a usable label falls back to a neutral name.
 */
export function calendarFileName(course: Pick<CourseRecord, "courseCode" | "courseName">): string {
  return `${fileNameLabel(course.courseCode) ?? fileNameLabel(course.courseName) ?? CALENDAR_FALLBACK_NAME}.ics`;
}

function fileNameLabel(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0 || isInternalIdentifier(trimmed)) return null;
  const cleaned = trimmed
    .replace(/[\\/:*?"<>|\p{Cc}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length === 0 || isInternalIdentifier(cleaned)) return null;
  return cleaned.length > FILE_NAME_LIMIT
    ? `${cleaned.slice(0, FILE_NAME_LIMIT).trimEnd()}...`
    : cleaned;
}

/** Events as the RFC 5545 writer takes them. One real deadline is exactly one VEVENT. */
function vevents(events: readonly CalendarEventDraft[]): CalendarEvent[] {
  return events.map((event) => ({
    eventId: event.eventKey,
    title: event.title,
    date: event.date,
    description: event.description,
    ...(event.time ? { time: event.time } : {})
  }));
}

export function exportCalendar(
  input: CalendarExportInput,
  generatedAt?: Date
): CalendarExportResult {
  const summary = calendarSummary(input);
  return {
    fileName: calendarFileName(input.course),
    content: serializeCalendar(input.course.courseId, vevents(summary.events), generatedAt),
    ...summary
  };
}
