import { isRecord } from "@syllab/contracts";

import type { BriefFieldState, BriefItem } from "../brief/domain";
import type { NormalizedUnit } from "../normalize/domain";
import type { ParsedSourceRecord } from "../parser/repository";
import { requestResult, transactionComplete } from "../repository/local-database";
import type { ReviewCandidate, ReviewProgress } from "../review/domain";
import type {
  AppMetadataRecord,
  AssessmentRecord,
  ConstraintRecord,
  CourseRecord,
  CourseStateRecord,
  EvidenceRecord,
  FactRecord,
  HistoryRecord,
  ReviewItemRecord,
  SemesterRecord,
  SourceRecord,
  WorkflowRecord
} from "./domain";
import { GENERATION_FIELD, type DurableTable } from "./schema";
import { LEGACY_STORES, type LocalDatabase } from "./storage";

/**
 * v0.1.0 → v0.2.0 import.
 *
 * The legacy stores are read once and never written or deleted, so the v0.1 data stays readable
 * for rollback. Everything the migration writes goes out in a single transaction, and every v0.2
 * id is derived from its legacy key: a second run is therefore a no-op, and a run against a
 * database that already holds a course imports only what that course is missing.
 *
 * Ownership is never guessed. A confirmed child whose parent cannot be resolved becomes a
 * migration Review Item that carries the original brief item, candidate and evidence references,
 * and no v0.2 object is created for it.
 */

export const LEGACY_MIGRATION_KEY = "legacyMigration" as const;
export const LEGACY_MIGRATION_VERSION = 1 as const;
/** Semester that holds courses discovered by v0.1.0, which had no semester model of its own. */
export const LEGACY_IMPORT_SEMESTER_ID = "semester_v010" as const;
export const LEGACY_IMPORT_CURSOR = "legacy-import" as const;
export const IMPORTED_COURSE_NAME = "Imported course" as const;

export interface LegacyMigrationMarker {
  version: number;
  migratedAt: string;
  courseIds: string[];
}

export interface LegacyCourseSummary {
  courseId: string;
  courseCode?: string;
  courseName?: string;
}

export interface LegacyMigrationCounts {
  semesters: number;
  courses: number;
  courseStates: number;
  assessments: number;
  constraints: number;
  facts: number;
  sources: number;
  evidence: number;
  reviewItems: number;
  history: number;
  workflows: number;
}

export interface LegacyMigrationResult {
  status: "migrated" | "already-migrated" | "nothing-to-migrate";
  migratedAt: string;
  semesterId: string;
  courseIds: string[];
  skippedCourseIds: string[];
  counts: LegacyMigrationCounts;
}

export interface LegacyMigrationInput {
  database: LocalDatabase;
  /** v0.1.0 course index, read from `chrome.storage.local` before that surface is dropped. */
  courseSummaries: readonly LegacyCourseSummary[];
  /** Semester the imported courses join; defaults to the dedicated v0.1.0 import semester. */
  semester?: SemesterRecord;
  now?: string;
}

/**
 * E3 guard, shared with the calendar path: a Blackboard internal identifier must never become a
 * user-visible course label or file name. The patterns are deliberately narrow so that real course
 * codes and names are never mistaken for one.
 */
export function isInternalIdentifier(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (/^\d+$/.test(trimmed)) return true;
  if (/^_?\d+(?:_\d+)+$/.test(trimmed)) return true;
  if (/^[0-9a-f]{16,}$/i.test(trimmed)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return true;
  return /^(?:bb|bbcs|content|announcement|attachment|course|item)[-_:][0-9a-z_-]{6,}$/i.test(
    trimmed
  );
}

// ---------------------------------------------------------------------------
// Legacy reads
// ---------------------------------------------------------------------------

interface LegacySnapshot {
  briefItems: BriefItem[];
  parsedSources: ParsedSourceRecord[];
  normalizedUnits: NormalizedUnit[];
  candidates: ReviewCandidate[];
  progress: ReviewProgress[];
}

const [CANDIDATES_STORE, PROGRESS_STORE, BRIEF_ITEMS_STORE, PARSED_SOURCES_STORE, UNITS_STORE] =
  LEGACY_STORES;

async function readLegacy(database: LocalDatabase): Promise<LegacySnapshot> {
  const connection = await database.open();
  const transaction = connection.transaction([...LEGACY_STORES], "readonly");
  const [candidates, progress, briefItems, parsedSources, normalizedUnits] = await Promise.all([
    requestResult(transaction.objectStore(CANDIDATES_STORE).getAll()) as Promise<ReviewCandidate[]>,
    requestResult(transaction.objectStore(PROGRESS_STORE).getAll()) as Promise<ReviewProgress[]>,
    requestResult(transaction.objectStore(BRIEF_ITEMS_STORE).getAll()) as Promise<BriefItem[]>,
    requestResult(transaction.objectStore(PARSED_SOURCES_STORE).getAll()) as Promise<
      ParsedSourceRecord[]
    >,
    requestResult(transaction.objectStore(UNITS_STORE).getAll()) as Promise<NormalizedUnit[]>
  ]);
  await transactionComplete(transaction);
  return { briefItems, parsedSources, normalizedUnits, candidates, progress };
}

function markerOf(value: unknown): LegacyMigrationMarker | null {
  if (!isRecord(value) || value["version"] !== LEGACY_MIGRATION_VERSION) return null;
  if (typeof value["migratedAt"] !== "string") return null;
  return {
    version: LEGACY_MIGRATION_VERSION,
    migratedAt: value["migratedAt"],
    courseIds: Array.isArray(value["courseIds"])
      ? value["courseIds"].filter((item): item is string => typeof item === "string")
      : []
  };
}

async function readMarker(database: LocalDatabase): Promise<LegacyMigrationMarker | null> {
  return database.read(["appMetadata"], async (transaction) => {
    const record = await transaction.get<AppMetadataRecord>("appMetadata", LEGACY_MIGRATION_KEY);
    return markerOf(record?.value);
  });
}

async function readExistingCourseIds(database: LocalDatabase): Promise<Set<string>> {
  return database.read(["courses"], async (transaction) => {
    const rows = await transaction.getAll<CourseRecord>("courses");
    return new Set(rows.map((row) => row.courseId));
  });
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

type Ownership = { assessmentId: string } | { constraintId: string } | "course";

function legacyId(kind: string, key: string): string {
  return `${kind}_legacy_${key}`;
}

function sameValue(
  left: string | number | boolean | string[] | null,
  right: string | number | boolean | string[] | null
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function ownerKey(courseId: string, ownership: Ownership): string {
  if (ownership === "course") return courseId;
  return "assessmentId" in ownership ? ownership.assessmentId : ownership.constraintId;
}

/** Only a value that reads as a real label reaches the user. An internal id never does. */
function readableLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || isInternalIdentifier(trimmed)) return null;
  return trimmed;
}

function scalarOf(value: unknown): string | number | boolean | string[] | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }
  return null;
}

function textOf(value: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const reading = readableLabel(value[key]);
    if (reading) return reading;
  }
  return null;
}

/** The v0.1 field state translated into a v0.2 typed value. An unresolved field is never settled. */
function factValueOf(raw: unknown, fieldState: BriefFieldState | undefined): FactRecord["value"] {
  const competing = (fieldState?.candidateValues ?? [])
    .map((item) => scalarOf(item))
    .filter((item): item is NonNullable<ReturnType<typeof scalarOf>> => item !== null);
  const resolved = scalarOf(raw) ?? scalarOf(fieldState?.value);
  if (fieldState?.status === "Unresolved") {
    return {
      state: "UNCERTAIN",
      ...(resolved !== null ? { value: resolved } : {}),
      ...(competing.length > 0 ? { competingValues: competing } : {})
    };
  }
  if (resolved === null) return { state: "EXPLICITLY_UNKNOWN" };
  return {
    state: "KNOWN",
    value: resolved,
    ...(competing.length > 0 ? { competingValues: competing } : {})
  };
}

/**
 * Native identity of a v0.1 source. Its id was built as `<kind>:<nativeItemId>`, with an
 * attachment adding the parent item in between; anything else keeps the id as its own anchor.
 */
function nativeItemIdOf(sourceId: string): string {
  const parts = sourceId.split(":");
  if (parts.length >= 3) return parts.slice(2).join(":");
  if (parts.length === 2) return parts[1] ?? sourceId;
  return sourceId;
}

function sourceTitleOf(title: string, kind: string): string {
  const reading = title.trim();
  return reading.length > 0 ? reading : kind;
}

function evidenceIdOf(sourceId: string, locator: string): string {
  // `|` cannot appear inside an encoded part, so the two halves stay separable.
  return legacyId("ev", `${encodeURIComponent(sourceId)}|${encodeURIComponent(locator)}`);
}

const EXCERPT_LIMIT = 400;

function excerptOf(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length <= EXCERPT_LIMIT ? collapsed : `${collapsed.slice(0, EXCERPT_LIMIT)}…`;
}

interface ReferenceContext {
  courseId: string;
  now: string;
  /** `"<sourceId>|<locator>"` → the original text, so an excerpt is never invented. */
  units: ReadonlyMap<string, string>;
  sourceIds: ReadonlySet<string>;
  evidence: EvidenceRecord[];
}

/**
 * The view layer resolves an evidence reference through its `evidenceId`, which the shared
 * contract type does not carry. Keeping the link on a subtype adds it without widening the type;
 * a record's `evidenceRefs` accepts this list unchanged.
 */
export interface LinkedEvidenceReference {
  sourceId: string;
  locator: string;
  evidenceId: string;
}

function keepReferences(
  references: readonly { sourceId: string; locator: string }[],
  context: ReferenceContext
): LinkedEvidenceReference[] {
  const kept: LinkedEvidenceReference[] = [];
  for (const reference of references) {
    if (!context.sourceIds.has(reference.sourceId)) continue;
    const evidenceId = evidenceIdOf(reference.sourceId, reference.locator);
    if (kept.some((entry) => entry.evidenceId === evidenceId)) continue;
    kept.push({ sourceId: reference.sourceId, locator: reference.locator, evidenceId });
    if (context.evidence.some((entry) => entry.evidenceId === evidenceId)) continue;
    const text = context.units.get(`${reference.sourceId}|${reference.locator}`);
    // Evidence is never invented: without the original text there is nothing to record.
    if (text === undefined) continue;
    context.evidence.push({
      evidenceId,
      courseId: context.courseId,
      sourceId: reference.sourceId,
      locator: reference.locator,
      excerpt: excerptOf(text),
      capturedAt: context.now
    });
  }
  return kept;
}

const ASSESSMENT_KINDS = ["assignment", "project", "quiz_test", "exam", "other"] as const;

function kindOf(value: Record<string, unknown>): AssessmentRecord["kind"] {
  for (const key of ["kind", "type", "category"]) {
    const candidate = value[key];
    // v0.1 says "assessment", which is not a v0.2 kind: only an exact enum value carries over and
    // everything else stays the honest catch-all rather than being interpreted.
    if (
      typeof candidate === "string" &&
      (ASSESSMENT_KINDS as readonly string[]).includes(candidate)
    ) {
      return candidate as AssessmentRecord["kind"];
    }
  }
  return "other";
}

const CONFIRMED_STATUSES: readonly BriefItem["status"][] = [
  "Confirmed",
  "EditedConfirmed",
  "UserAddedConfirmed"
];

function isConfirmed(item: BriefItem): boolean {
  return CONFIRMED_STATUSES.includes(item.status);
}

function isRoot(item: BriefItem): boolean {
  return item.parentBriefItemId === undefined && item.parentSemanticKey === undefined;
}

const NAME_KEYS = ["title", "name", "label", "assessment", "identifier"];
const CONTENT_KEYS = ["rule", "content", "text", "requirement", "description", "note"];

// ---------------------------------------------------------------------------
// Course conversion
// ---------------------------------------------------------------------------

interface CourseWork {
  courseId: string;
  now: string;
  items: BriefItem[];
  context: Omit<ReferenceContext, "courseId" | "now">;
}

interface CourseConversion {
  assessments: AssessmentRecord[];
  constraints: ConstraintRecord[];
  facts: FactRecord[];
  evidence: EvidenceRecord[];
  reviewItems: ReviewItemRecord[];
}

function convertCourse(work: CourseWork): CourseConversion {
  const { courseId, now } = work;
  const context: ReferenceContext = { courseId, now, ...work.context };
  const items = work.items.filter(isConfirmed);
  const assessmentById = new Map<string, AssessmentRecord>();
  const assessmentByBriefItemId = new Map<string, AssessmentRecord>();
  const assessmentBySemanticKey = new Map<string, AssessmentRecord>();
  const constraints = new Map<string, ConstraintRecord>();
  const facts = new Map<string, FactRecord>();
  const reviewItems: ReviewItemRecord[] = [];

  const createAssessment = (item: BriefItem, parent?: AssessmentRecord): AssessmentRecord => {
    const assessment: AssessmentRecord = {
      assessmentId: legacyId("assessment", item.briefItemId),
      courseId,
      ...(parent ? { parentAssessmentId: parent.assessmentId } : {}),
      role: parent ? "component" : "assessment",
      kind: kindOf(item.currentValue),
      // The item's own reading is what the user confirmed; a missing name gets a neutral label.
      name: textOf(item.currentValue, NAME_KEYS) ?? readableLabel(item.semanticKey) ?? "Assessment",
      aliases: [],
      marks: item.status === "EditedConfirmed" ? ["Edited"] : [],
      createdBy: item.origin === "user_added" ? "user" : "migration",
      createdAt: item.updatedAt,
      updatedAt: item.updatedAt
    };
    assessmentById.set(assessment.assessmentId, assessment);
    assessmentByBriefItemId.set(item.briefItemId, assessment);
    if (item.semanticKey) assessmentBySemanticKey.set(item.semanticKey, assessment);
    // The assessment's own references support the object as a whole. They reach the user through
    // the facts it owns; when it owns none they stay as immutable lineage records.
    keepReferences(item.evidenceRefs, context);
    return assessment;
  };

  const addFact = (
    item: BriefItem,
    ownership: Ownership,
    field: string,
    value: FactRecord["value"],
    references: LinkedEvidenceReference[]
  ): void => {
    const key = `${ownerKey(courseId, ownership)}|${field}`;
    const existing = facts.get(key);
    if (existing) {
      // Two confirmed items that disagree are not a settled value: every competing value is kept
      // together instead of either one quietly winning.
      const first = structuredClone(existing.value.value ?? null);
      const second = structuredClone(value.value ?? null);
      if (sameValue(first, second) && existing.value.state === value.state) {
        for (const reference of references) {
          if (
            !existing.evidenceRefs.some(
              (entry) =>
                entry.sourceId === reference.sourceId && entry.locator === reference.locator
            )
          ) {
            existing.evidenceRefs.push(reference);
          }
        }
        return;
      }
      const competing = [
        ...(existing.value.competingValues ?? []),
        ...(value.competingValues ?? [])
      ];
      if (second !== null && !competing.some((entry) => sameValue(entry, second))) {
        competing.push(second);
      }
      existing.value = {
        state: "UNCERTAIN",
        ...(first !== null ? { value: first } : {}),
        ...(competing.length > 0 ? { competingValues: competing } : {})
      };
      return;
    }
    facts.set(key, {
      factId: legacyId("fact", `${item.briefItemId}:${field}`),
      courseId,
      ...(ownership === "course" ? {} : ownership),
      field,
      value,
      evidenceRefs: references,
      marks: item.status === "EditedConfirmed" ? ["Edited"] : [],
      ...(item.origin === "user_added" ? { userEdited: true } : {}),
      updatedAt: item.updatedAt
    });
  };

  const addFactsFrom = (item: BriefItem, ownership: Ownership, parent?: BriefItem): void => {
    const contextRefs = keepReferences(
      [...(parent?.evidenceRefs ?? []), ...item.evidenceRefs],
      context
    );
    // A rule's own reading becomes the Constraint content; repeating it as a fact adds nothing.
    const contentKey =
      typeof ownership === "object" && "constraintId" in ownership
        ? (CONTENT_KEYS.find((key) => readableLabel(item.currentValue[key])) ?? null)
        : null;
    for (const [field, raw] of Object.entries(item.currentValue)) {
      if (field === contentKey) continue;
      if (raw === null || raw === undefined || scalarOf(raw) === null) continue;
      addFact(item, ownership, field, factValueOf(raw, item.fieldStates[field]), contextRefs);
    }
    for (const [field, state] of Object.entries(item.fieldStates)) {
      if (field === contentKey || field in item.currentValue) continue;
      if (state.value === undefined && !state.candidateValues?.length) continue;
      addFact(item, ownership, field, factValueOf(undefined, state), contextRefs);
    }
  };

  // Pass 1: every root assessment, so children always have something real to attach to.
  for (const item of items) {
    if (item.kind === "assessment" && isRoot(item)) createAssessment(item);
  }

  // Pass 2: components and everything that hangs off another item.
  for (const item of items) {
    if (item.kind === "assessment" && isRoot(item)) continue;
    // The brief item id is the stronger link, so it decides before the semantic key does.
    const parentItem =
      (item.parentBriefItemId !== undefined
        ? items.find((candidate) => candidate.briefItemId === item.parentBriefItemId)
        : undefined) ??
      (item.parentSemanticKey !== undefined
        ? items.find((candidate) => candidate.semanticKey === item.parentSemanticKey)
        : undefined);
    const parent = parentItem ? assessmentByBriefItemId.get(parentItem.briefItemId) : undefined;

    if (item.kind === "assessment") {
      if (parent) createAssessment(item, parent);
      // A component whose owner is gone is never guessed into an assessment of its own.
      else reviewItems.push(migrationReviewItem(courseId, item));
      continue;
    }

    if (parent) {
      addFactsFrom(item, { assessmentId: parent.assessmentId }, parentItem);
      continue;
    }
    if (!isRoot(item)) {
      // The item names a parent that is not part of the confirmed state.
      reviewItems.push(migrationReviewItem(courseId, item));
      continue;
    }
    // v0.1 itself read a parentless item as course-scope, so doing the same is not a guess.
    if (item.kind === "important_rule") {
      const constraintId = legacyId("constraint", item.briefItemId);
      const content =
        textOf(item.currentValue, CONTENT_KEYS) ??
        textOf(item.currentValue, Object.keys(item.currentValue)) ??
        readableLabel(item.semanticKey);
      if (!content) continue;
      const references = keepReferences(item.evidenceRefs, context);
      constraints.set(constraintId, {
        constraintId,
        courseId,
        content,
        evidenceRefs: references,
        marks: item.status === "EditedConfirmed" ? ["Edited"] : [],
        createdBy: item.origin === "user_added" ? "user" : "migration",
        updatedAt: item.updatedAt
      });
      addFactsFrom(item, { constraintId });
      continue;
    }
    addFactsFrom(item, "course");
  }

  return {
    assessments: [...assessmentById.values()],
    constraints: [...constraints.values()],
    facts: [...facts.values()],
    evidence: context.evidence,
    reviewItems
  };
}

function migrationReviewItem(courseId: string, item: BriefItem): ReviewItemRecord {
  return {
    reviewItemId: legacyId("review", item.briefItemId),
    courseId,
    workflowId: legacyImportWorkflowId(courseId),
    kind: "identity",
    changeType: "IDENTITY_UNCERTAIN",
    targetId: courseId,
    // No v0.2 object is created for this item: the payload keeps exactly what v0.1 knew about it.
    payload: {
      migration: true,
      legacyCourseId: courseId,
      legacyBriefItemId: item.briefItemId,
      legacyKind: item.kind,
      ...(item.scope ? { legacyScope: item.scope } : {}),
      ...(item.parentBriefItemId ? { parentBriefItemId: item.parentBriefItemId } : {}),
      ...(item.parentSemanticKey ? { parentSemanticKey: item.parentSemanticKey } : {}),
      ...(item.semanticKey ? { semanticKey: item.semanticKey } : {}),
      sourceCandidateRefs: item.sourceCandidateRefs,
      evidenceRefs: item.evidenceRefs,
      currentValue: item.currentValue,
      fieldStates: item.fieldStates
    },
    createdAt: item.updatedAt,
    updatedAt: item.updatedAt
  };
}

// ---------------------------------------------------------------------------
// Legacy import workflows
// ---------------------------------------------------------------------------

function legacyImportWorkflowId(courseId: string): string {
  return legacyId("workflow", courseId);
}

function legacyWorkflow(
  course: Pick<CourseRecord, "courseId" | "currentRevision">,
  now: string,
  outcome: { state: "review" } | { state: "failed"; detail: string }
): WorkflowRecord {
  return {
    workflowId: legacyImportWorkflowId(course.courseId),
    courseId: course.courseId,
    kind: "initial",
    state: outcome.state === "review" ? "saved" : "failed",
    phase: "review",
    phaseCursor: LEGACY_IMPORT_CURSOR,
    attempt: 0,
    baseCourseRevision: course.currentRevision,
    ...(outcome.state === "review" ? { waitingReason: "review" as const } : {}),
    ...(outcome.state === "failed"
      ? { errorCode: "LEGACY_IMPORT_UNRESUMABLE", lastErrorDetail: outcome.detail }
      : {}),
    // Reopening a v0.1 review needs no paid call, and nothing may imply that it does.
    paidRetryAvailable: false,
    retryConsumesApi: false,
    createdAt: now,
    updatedAt: now
  };
}

function remainingCandidates(snapshot: LegacySnapshot, scanId: string): ReviewCandidate[] {
  return snapshot.candidates.filter(
    (candidate) =>
      candidate.scanId === scanId &&
      (candidate.status === "Detected" || candidate.status === "NeedsReview")
  );
}

// ---------------------------------------------------------------------------
// Plan and write
// ---------------------------------------------------------------------------

interface MigrationPlan {
  tables: Record<MigrationTable, Record<string, unknown>[]>;
  workflows: WorkflowRecord[];
  courseIds: string[];
  skippedCourseIds: string[];
}

type MigrationTable = Extract<
  DurableTable,
  | "semesters"
  | "courses"
  | "courseStates"
  | "assessments"
  | "constraints"
  | "facts"
  | "sources"
  | "evidence"
  | "reviewItems"
  | "history"
>;

const MIGRATION_TABLES: readonly MigrationTable[] = [
  "semesters",
  "courses",
  "courseStates",
  "assessments",
  "constraints",
  "facts",
  "sources",
  "evidence",
  "reviewItems",
  "history"
];

function legacySemester(now: string): SemesterRecord {
  return {
    semesterId: LEGACY_IMPORT_SEMESTER_ID,
    nativeSemesterId: LEGACY_IMPORT_SEMESTER_ID,
    label: "Imported from Syllab v0.1.0",
    // A historical semester: imported courses must not become the Current Semester that
    // Opportunity Checking is allowed to spend API calls on.
    status: "Historical",
    discoveredAt: now,
    updatedAt: now
  };
}

function plan(
  snapshot: LegacySnapshot,
  summaries: readonly LegacyCourseSummary[],
  semester: SemesterRecord,
  existingCourseIds: ReadonlySet<string>,
  now: string
): MigrationPlan {
  const tables = Object.fromEntries(
    MIGRATION_TABLES.map((table) => [table, []])
  ) as unknown as Record<MigrationTable, Record<string, unknown>[]>;
  const workflows: WorkflowRecord[] = [];
  const courseIds: string[] = [];
  const skippedCourseIds: string[] = [];

  const sources = new Map<string, SourceRecord>();
  const units = new Map<string, string>();
  const rememberSource = (row: {
    sourceId: string;
    courseId: string;
    title: string;
    sourceType: string;
  }): void => {
    if (sources.has(row.sourceId)) return;
    sources.set(row.sourceId, {
      sourceId: row.sourceId,
      courseId: row.courseId,
      nativeItemId: nativeItemIdOf(row.sourceId),
      kind: row.sourceType,
      title: sourceTitleOf(row.title, row.sourceType),
      updatedAt: now
    });
  };
  for (const unit of snapshot.normalizedUnits) {
    if (!units.has(`${unit.sourceId}|${unit.locator}`)) {
      units.set(`${unit.sourceId}|${unit.locator}`, unit.text);
    }
    rememberSource(unit);
  }
  for (const record of snapshot.parsedSources) rememberSource(record);

  tables.semesters.push(semester as unknown as Record<string, unknown>);

  for (const summary of summaries) {
    if (existingCourseIds.has(summary.courseId)) {
      skippedCourseIds.push(summary.courseId);
      continue;
    }
    const items = snapshot.briefItems.filter((item) => item.courseId === summary.courseId);
    const courseSources = [...sources.values()].filter(
      (source) => source.courseId === summary.courseId
    );
    const conversion = convertCourse({
      courseId: summary.courseId,
      now,
      items,
      context: {
        units,
        // A reference to a source that is not part of this course cannot be verified here.
        sourceIds: new Set(courseSources.map((source) => source.sourceId)),
        evidence: []
      }
    });
    const established = conversion.assessments.length > 0 || conversion.constraints.length > 0;
    const course: CourseRecord = {
      courseId: summary.courseId,
      semesterId: semester.semesterId,
      // E3: the user-visible code and name come from the summary labels and never from an
      // internal Blackboard identifier; a missing label falls back to a neutral name.
      courseCode: readableLabel(summary.courseCode) ?? "",
      courseName:
        readableLabel(summary.courseName) ??
        readableLabel(summary.courseCode) ??
        IMPORTED_COURSE_NAME,
      // v0.1 discovered courses from the dashboard list only.
      curriculum: true,
      established,
      currentRevision: established ? 1 : 0,
      consecutiveCheckFailures: 0,
      updatedAt: now
    };

    const scanIds = new Set(
      snapshot.candidates
        .filter((candidate) => candidate.courseId === summary.courseId)
        .map((candidate) => candidate.scanId)
    );
    const inFlight = snapshot.progress.find(
      (entry) => scanIds.has(entry.scanId) && !entry.complete
    );
    const reviewItems = conversion.reviewItems;
    const workflow = inFlight
      ? remainingCandidates(snapshot, inFlight.scanId).length > 0
        ? legacyWorkflow(course, now, { state: "review" })
        : legacyWorkflow(course, now, {
            state: "failed",
            detail: `scan ${inFlight.scanId} has no candidates left`
          })
      : reviewItems.length > 0
        ? legacyWorkflow(course, now, { state: "review" })
        : null;
    if (workflow) workflows.push(workflow);

    tables.courses.push(course as unknown as Record<string, unknown>);
    if (established) {
      const state: CourseStateRecord = {
        courseId: course.courseId,
        revision: course.currentRevision,
        updatedAt: now
      };
      tables.courseStates.push(state as unknown as Record<string, unknown>);
    }
    tables.assessments.push(...(conversion.assessments as unknown as Record<string, unknown>[]));
    tables.constraints.push(...(conversion.constraints as unknown as Record<string, unknown>[]));
    tables.facts.push(...(conversion.facts as unknown as Record<string, unknown>[]));
    tables.evidence.push(...(conversion.evidence as unknown as Record<string, unknown>[]));
    tables.reviewItems.push(...(reviewItems as unknown as Record<string, unknown>[]));
    tables.sources.push(...(courseSources as unknown as Record<string, unknown>[]));
    const history: HistoryRecord = {
      historyId: legacyId("history", course.courseId),
      courseId: course.courseId,
      revision: course.currentRevision,
      targetId: course.courseId,
      event: "MIGRATED",
      note: LEGACY_IMPORT_CURSOR,
      recordedAt: now
    };
    tables.history.push(history as unknown as Record<string, unknown>);
    courseIds.push(summary.courseId);
  }

  return { tables, workflows, courseIds, skippedCourseIds };
}

async function writePlan(
  database: LocalDatabase,
  migration: MigrationPlan,
  generation: string,
  marker: LegacyMigrationMarker
): Promise<void> {
  const connection = await database.open();
  const transaction = connection.transaction(
    [...MIGRATION_TABLES, "workflows", "appMetadata"],
    "readwrite"
  );
  try {
    for (const table of MIGRATION_TABLES) {
      const store = transaction.objectStore(table);
      for (const row of migration.tables[table]) {
        await requestResult(store.put({ ...row, [GENERATION_FIELD]: generation }));
      }
    }
    const workflowStore = transaction.objectStore("workflows");
    for (const workflow of migration.workflows) {
      await requestResult(workflowStore.put(workflow as unknown as Record<string, unknown>));
    }
    await requestResult(
      transaction.objectStore("appMetadata").put({ key: LEGACY_MIGRATION_KEY, value: marker })
    );
    await transactionComplete(transaction);
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may already have aborted; the original failure wins.
    }
    throw error;
  }
}

function countsOf(migration: MigrationPlan): LegacyMigrationCounts {
  return {
    semesters: migration.tables.semesters.length,
    courses: migration.tables.courses.length,
    courseStates: migration.tables.courseStates.length,
    assessments: migration.tables.assessments.length,
    constraints: migration.tables.constraints.length,
    facts: migration.tables.facts.length,
    sources: migration.tables.sources.length,
    evidence: migration.tables.evidence.length,
    reviewItems: migration.tables.reviewItems.length,
    history: migration.tables.history.length,
    workflows: migration.workflows.length
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Imports v0.1.0 data into the v0.2.0 model.
 *
 * A completed run records a marker and does nothing on the next call. A run over a database that
 * already holds some of the courses imports only the remaining ones, because a course row that
 * exists is never imported twice. A run with nothing to import records no marker at all, so a
 * later run with the real course index still migrates.
 */
export async function migrateLegacyDatabase(
  input: LegacyMigrationInput
): Promise<LegacyMigrationResult> {
  const now = input.now ?? new Date().toISOString();
  const semester = input.semester ?? legacySemester(now);
  const without = (status: LegacyMigrationResult["status"]): LegacyMigrationResult => ({
    status,
    migratedAt: now,
    semesterId: semester.semesterId,
    courseIds: [],
    skippedCourseIds: [],
    counts: {
      semesters: 0,
      courses: 0,
      courseStates: 0,
      assessments: 0,
      constraints: 0,
      facts: 0,
      sources: 0,
      evidence: 0,
      reviewItems: 0,
      history: 0,
      workflows: 0
    }
  });

  const marker = await readMarker(input.database);
  if (marker) {
    return {
      ...without("already-migrated"),
      migratedAt: marker.migratedAt,
      courseIds: marker.courseIds
    };
  }
  if (input.courseSummaries.length === 0) return without("nothing-to-migrate");

  const snapshot = await readLegacy(input.database);
  const generation = await input.database.ensureGeneration();
  const migration = plan(
    snapshot,
    input.courseSummaries,
    semester,
    await readExistingCourseIds(input.database),
    now
  );
  if (migration.courseIds.length === 0) {
    return { ...without("nothing-to-migrate"), skippedCourseIds: migration.skippedCourseIds };
  }

  await writePlan(input.database, migration, generation, {
    version: LEGACY_MIGRATION_VERSION,
    migratedAt: now,
    courseIds: migration.courseIds
  });

  return {
    status: "migrated",
    migratedAt: now,
    semesterId: semester.semesterId,
    courseIds: migration.courseIds,
    skippedCourseIds: migration.skippedCourseIds,
    counts: countsOf(migration)
  };
}
