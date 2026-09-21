import { isRecord } from "@syllab/contracts";

import {
  durableRow,
  DURABLE_TABLES,
  validateBackup,
  type BackupEnvelope,
  type DurableTable
} from "./backup";
import { randomId } from "./crypto";
import type {
  AssessmentRole,
  CurrentMark,
  FactValue,
  ReviewDecisionKind,
  TaskCChangeType,
  KnowledgeState,
  HistoryRecord
} from "./domain";
import { V2_STORES } from "./schema";
import type { LocalDatabase } from "./storage";

/**
 * Full Replace restore: a validated backup replaces the whole local Syllab state, or nothing
 * changes at all. Nothing here reads or writes the API key or the two authorization records —
 * those live in `chrome.storage.local` and are deliberately not part of a backup.
 */

/**
 * The three `BACKUP_*` codes are the ones the backup contract already defines, so a Settings
 * surface has one vocabulary for "this file cannot be used". The two storage codes say the file
 * was fine and the device failed instead. `detail` carries the specific reason.
 */
export type RestoreErrorCode =
  | "BACKUP_FORMAT_UNSUPPORTED"
  | "BACKUP_DIGEST_MISMATCH"
  | "BACKUP_INVALID"
  | "RESTORE_WRITE_FAILED"
  | "RESTORE_INTEGRITY";

export class RestoreError extends Error {
  constructor(
    readonly code: RestoreErrorCode,
    readonly detail?: string
  ) {
    super(code);
  }
}

export interface RestoreLimits {
  maxBytes: number;
  /** Nesting depth of the JSON document: a backup is a table set, never a deep tree. */
  maxDepth: number;
  maxRecords: number;
}

export const RESTORE_LIMITS: RestoreLimits = {
  maxBytes: 64 * 1024 * 1024,
  maxDepth: 32,
  maxRecords: 250_000
};

export interface RestoreSummary {
  /** Semester labels, Current first, as the Restore File Summary lists them. */
  semesters: string[];
  courseCount: number;
  /** Assessments the user sees, not the components and series instances nested inside them. */
  assessmentCount: number;
}

export interface PreparedRestore {
  summary: RestoreSummary;
  tables: Record<DurableTable, Record<string, unknown>[]>;
}

export interface RestoreResult {
  generation: string;
  summary: RestoreSummary;
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

/** Nesting depth counted outside strings, so a brace inside a value cannot hide the real depth. */
function textDepth(text: string): number {
  let depth = 0;
  let deepest = 0;
  let inString = false;
  let escaped = false;
  for (const character of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{" || character === "[") {
      depth += 1;
      if (depth > deepest) deepest = depth;
    } else if (character === "}" || character === "]") depth -= 1;
  }
  return deepest;
}

/** Reads backup text under the size and depth limits. Parsing is the only step that sees bytes. */
export function parseBackup(text: string, limits: RestoreLimits = RESTORE_LIMITS): unknown {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > limits.maxBytes) {
    throw new RestoreError("BACKUP_INVALID", `bytes:${String(bytes)}`);
  }
  const depth = textDepth(text);
  if (depth > limits.maxDepth) throw new RestoreError("BACKUP_INVALID", `depth:${String(depth)}`);
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch {
    throw new RestoreError("BACKUP_INVALID", "parse");
  }
}

// ---------------------------------------------------------------------------
// Row validation
// ---------------------------------------------------------------------------

const SEMESTER_STATUS: readonly ("Current" | "Historical")[] = ["Current", "Historical"];
const ASSESSMENT_ROLES: readonly AssessmentRole[] = [
  "assessment",
  "component",
  "series",
  "series_instance"
];
const ASSESSMENT_KINDS: readonly ("assignment" | "project" | "quiz_test" | "exam" | "other")[] = [
  "assignment",
  "project",
  "quiz_test",
  "exam",
  "other"
];
const CREATORS: readonly ("ai" | "user" | "migration")[] = ["ai", "user", "migration"];
const MARKS: readonly CurrentMark[] = ["Edited", "Changed", "PossiblyRemoved"];
const KNOWLEDGE_STATES: readonly KnowledgeState[] = ["KNOWN", "EXPLICITLY_UNKNOWN", "UNCERTAIN"];
const REVIEW_ITEM_KINDS: readonly ("initial" | "change" | "rebuild" | "identity")[] = [
  "initial",
  "change",
  "rebuild",
  "identity"
];
const CHANGE_TYPES: readonly TaskCChangeType[] = [
  "NO_MEANINGFUL_CHANGE",
  "NEW",
  "CHANGED",
  "CONFLICT",
  "POSSIBLY_REMOVED",
  "IDENTITY_UNCERTAIN"
];
const REVIEW_DECISION_KINDS: readonly ReviewDecisionKind[] = [
  "Confirm",
  "Edit",
  "Exclude",
  "Merge",
  "Split",
  "Defer",
  "AcceptChange",
  "KeepCurrent",
  "Remove",
  "KeepPossiblyRemoved",
  "ResolveConflict",
  "KeepIdentity",
  "DifferentIdentity",
  "UseRebuilt",
  "KeepCurrentCourse",
  "ManualAdd"
];
const HISTORY_EVENTS: readonly HistoryRecord["event"][] = [
  "PENDING_SUPERSEDED",
  "CHANGE_ACCEPTED",
  "CHANGE_KEPT_CURRENT",
  "FIELD_EDITED",
  "ASSESSMENT_CONFIRMED",
  "ASSESSMENT_EXCLUDED",
  "ASSESSMENT_MERGED",
  "ASSESSMENT_SPLIT",
  "ASSESSMENT_ADDED",
  "ASSESSMENT_REMOVED",
  "POSSIBLY_REMOVED_KEPT",
  "POSSIBLY_REMOVED_RESOLVED",
  "CONFLICT_RESOLVED",
  "REBUILT_STATE_USED",
  "STATE_RESTORED",
  "MIGRATED"
];

function invalid(detail: string): RestoreError {
  return new RestoreError("BACKUP_INVALID", detail);
}

function text(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || value.length === 0) throw invalid(field);
  return value;
}

function optionalText(row: Record<string, unknown>, field: string): void {
  const value = row[field];
  if (value !== undefined && typeof value !== "string") throw invalid(field);
}

function optionalNumber(row: Record<string, unknown>, field: string): void {
  const value = row[field];
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
    throw invalid(field);
  }
}

function number(row: Record<string, unknown>, field: string): void {
  const value = row[field];
  if (typeof value !== "number" || !Number.isFinite(value)) throw invalid(field);
}

function optionalBoolean(row: Record<string, unknown>, field: string): void {
  const value = row[field];
  if (value !== undefined && typeof value !== "boolean") throw invalid(field);
}

function enumeration<T extends string>(
  row: Record<string, unknown>,
  field: string,
  allowed: readonly T[]
): T {
  const value = row[field];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw invalid(field);
  }
  return value as T;
}

function optionalEnumeration(
  row: Record<string, unknown>,
  field: string,
  allowed: readonly string[]
): void {
  if (row[field] !== undefined) enumeration(row, field, allowed);
}

function enumerationList(
  row: Record<string, unknown>,
  field: string,
  allowed: readonly string[]
): void {
  const value = row[field];
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string" && allowed.includes(item))
  ) {
    throw invalid(field);
  }
}

function textList(row: Record<string, unknown>, field: string): string[] {
  const value = row[field];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw invalid(field);
  }
  return value;
}

function isScalar(value: unknown): value is string | number | boolean | string[] {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function factValue(value: unknown, field: string): FactValue {
  if (!isRecord(value)) throw invalid(field);
  const state = enumeration(value, "state", KNOWLEDGE_STATES);
  const parsed: FactValue = { state };
  if (value.value !== undefined) {
    if (!isScalar(value.value)) throw invalid(`${field}.value`);
    parsed.value = value.value;
  }
  if (value.competingValues !== undefined) {
    if (!Array.isArray(value.competingValues) || !value.competingValues.every(isScalar)) {
      throw invalid(`${field}.competingValues`);
    }
    parsed.competingValues = value.competingValues;
  }
  return parsed;
}

function optionalFactValue(row: Record<string, unknown>, field: string): void {
  if (row[field] !== undefined) factValue(row[field], field);
}

/** An evidence reference is the immutable link back to a source excerpt; all three parts matter. */
function evidenceReferences(row: Record<string, unknown>, field: string): void {
  const value = row[field];
  if (!Array.isArray(value)) throw invalid(field);
  for (const entry of value) {
    if (!isRecord(entry)) throw invalid(field);
    text(entry, "sourceId");
    text(entry, "locator");
    optionalText(entry, "evidenceId");
  }
}

type RowValidator = (row: Record<string, unknown>) => void;

const VALIDATORS: Record<DurableTable, RowValidator> = {
  semesters: (row) => {
    text(row, "semesterId");
    text(row, "nativeSemesterId");
    text(row, "label");
    enumeration(row, "status", SEMESTER_STATUS);
    text(row, "discoveredAt");
    text(row, "updatedAt");
  },
  courses: (row) => {
    text(row, "courseId");
    text(row, "semesterId");
    text(row, "courseCode");
    text(row, "courseName");
    optionalBoolean(row, "curriculum");
    optionalBoolean(row, "established");
    number(row, "currentRevision");
    number(row, "consecutiveCheckFailures");
    optionalText(row, "lastSuccessfulCheckAt");
    optionalText(row, "lastCheckAttemptAt");
    optionalText(row, "nextCheckAt");
    text(row, "updatedAt");
  },
  courseStates: (row) => {
    text(row, "courseId");
    number(row, "revision");
    text(row, "updatedAt");
  },
  assessments: (row) => {
    text(row, "assessmentId");
    text(row, "courseId");
    optionalText(row, "parentAssessmentId");
    enumeration(row, "role", ASSESSMENT_ROLES);
    enumeration(row, "kind", ASSESSMENT_KINDS);
    text(row, "name");
    textList(row, "aliases");
    enumerationList(row, "marks", MARKS);
    enumeration(row, "createdBy", CREATORS);
    optionalText(row, "supersededBy");
    text(row, "createdAt");
    text(row, "updatedAt");
  },
  constraints: (row) => {
    text(row, "constraintId");
    text(row, "courseId");
    text(row, "content");
    evidenceReferences(row, "evidenceRefs");
    optionalText(row, "scopeNote");
    enumerationList(row, "marks", MARKS);
    optionalBoolean(row, "superseded");
    enumeration(row, "createdBy", CREATORS);
    text(row, "updatedAt");
  },
  facts: (row) => {
    text(row, "factId");
    text(row, "courseId");
    optionalText(row, "assessmentId");
    optionalText(row, "constraintId");
    text(row, "field");
    factValue(row["value"], "value");
    evidenceReferences(row, "evidenceRefs");
    enumerationList(row, "marks", MARKS);
    optionalBoolean(row, "userEdited");
    optionalBoolean(row, "superseded");
    text(row, "updatedAt");
  },
  sources: (row) => {
    text(row, "sourceId");
    text(row, "courseId");
    text(row, "nativeItemId");
    optionalText(row, "parentSourceId");
    text(row, "kind");
    text(row, "title");
    optionalText(row, "lastFetchedAt");
    optionalText(row, "lastParsedAt");
    optionalBoolean(row, "removedFromNative");
    text(row, "updatedAt");
  },
  evidence: (row) => {
    text(row, "evidenceId");
    text(row, "courseId");
    text(row, "sourceId");
    text(row, "locator");
    optionalNumber(row, "page");
    text(row, "excerpt");
    text(row, "capturedAt");
  },
  reviewItems: (row) => {
    text(row, "reviewItemId");
    text(row, "courseId");
    text(row, "workflowId");
    enumeration(row, "kind", REVIEW_ITEM_KINDS);
    optionalEnumeration(row, "changeType", CHANGE_TYPES);
    text(row, "targetId");
    if (!isRecord(row["payload"])) throw invalid("payload");
    text(row, "createdAt");
    text(row, "updatedAt");
  },
  reviewDecisions: (row) => {
    text(row, "decisionId");
    text(row, "courseId");
    text(row, "reviewItemId");
    enumeration(row, "kind", REVIEW_DECISION_KINDS);
    optionalText(row, "targetId");
    text(row, "decidedAt");
  },
  exclusionMemory: (row) => {
    text(row, "memoryId");
    text(row, "courseId");
    text(row, "proposalKey");
    text(row, "evidenceFingerprint");
    text(row, "createdAt");
  },
  changes: (row) => {
    text(row, "changeId");
    text(row, "courseId");
    text(row, "workflowId");
    text(row, "targetId");
    optionalText(row, "field");
    enumeration(row, "changeType", CHANGE_TYPES);
    optionalFactValue(row, "currentValue");
    optionalFactValue(row, "latestValue");
    textList(row, "currentEvidenceIds");
    textList(row, "newEvidenceIds");
    optionalText(row, "judgmentBasis");
    optionalText(row, "relevantUserState");
    text(row, "createdAt");
    text(row, "updatedAt");
  },
  history: (row) => {
    text(row, "historyId");
    text(row, "courseId");
    number(row, "revision");
    text(row, "targetId");
    optionalText(row, "field");
    enumeration(row, "event", HISTORY_EVENTS);
    optionalFactValue(row, "fromValue");
    optionalFactValue(row, "toValue");
    optionalText(row, "note");
    text(row, "recordedAt");
  }
};

function keysOf(
  tables: Record<DurableTable, Record<string, unknown>[]>,
  table: DurableTable
): Set<string> {
  const key = V2_STORES[table];
  return new Set(tables[table].map((row) => text(row, key)));
}

function resolves(known: ReadonlySet<string>, value: unknown, where: string): void {
  if (typeof value !== "string" || !known.has(value)) {
    throw new RestoreError("BACKUP_INVALID", `${where} → ${String(value)}`);
  }
}

function resolvesAny(sets: ReadonlySet<string>[], value: unknown, where: string): void {
  if (typeof value === "string" && sets.some((set) => set.has(value))) return;
  throw new RestoreError("BACKUP_INVALID", `${where} → ${String(value)}`);
}

function resolveEvidenceRefs(
  row: Record<string, unknown>,
  sources: ReadonlySet<string>,
  where: string
): void {
  for (const entry of row["evidenceRefs"] as Record<string, unknown>[]) {
    resolves(sources, entry["sourceId"], where);
  }
}

/** Every id a row points at must exist in the payload it arrived in. Nothing is created on the fly. */
function validateReferences(tables: Record<DurableTable, Record<string, unknown>[]>): void {
  const semesters = keysOf(tables, "semesters");
  const courses = keysOf(tables, "courses");
  const assessments = keysOf(tables, "assessments");
  const constraints = keysOf(tables, "constraints");
  const facts = keysOf(tables, "facts");
  const sources = keysOf(tables, "sources");
  const evidence = keysOf(tables, "evidence");
  const reviewItems = keysOf(tables, "reviewItems");
  // `targetId` names whatever the workflow was working on. A review item is deleted the moment
  // its decision is recorded, so a target may legitimately name an object that is already gone.
  const targets = [assessments, constraints, facts, reviewItems, courses];

  tables.courses.forEach((row) => resolves(semesters, row["semesterId"], "courses.semesterId"));
  tables.courseStates.forEach((row) => resolves(courses, row["courseId"], "courseStates.courseId"));
  tables.assessments.forEach((row) => {
    resolves(courses, row["courseId"], "assessments.courseId");
    if (row["parentAssessmentId"] !== undefined) {
      resolves(assessments, row["parentAssessmentId"], "assessments.parentAssessmentId");
    }
    // "removed" is the sentinel a removal writes; every other value names a live assessment.
    const supersededBy = row["supersededBy"];
    if (supersededBy !== undefined && supersededBy !== "removed") {
      resolves(assessments, supersededBy, "assessments.supersededBy");
    }
  });
  tables.constraints.forEach((row) => {
    resolves(courses, row["courseId"], "constraints.courseId");
    resolveEvidenceRefs(row, sources, "constraints.evidenceRefs.sourceId");
  });
  tables.facts.forEach((row) => {
    resolves(courses, row["courseId"], "facts.courseId");
    if (row["assessmentId"] !== undefined) {
      resolves(assessments, row["assessmentId"], "facts.assessmentId");
    }
    if (row["constraintId"] !== undefined) {
      resolves(constraints, row["constraintId"], "facts.constraintId");
    }
    resolveEvidenceRefs(row, sources, "facts.evidenceRefs.sourceId");
  });
  tables.sources.forEach((row) => {
    resolves(courses, row["courseId"], "sources.courseId");
    if (row["parentSourceId"] !== undefined) {
      resolves(sources, row["parentSourceId"], "sources.parentSourceId");
    }
  });
  tables.evidence.forEach((row) => {
    resolves(courses, row["courseId"], "evidence.courseId");
    resolves(sources, row["sourceId"], "evidence.sourceId");
  });
  tables.reviewItems.forEach((row) => {
    resolves(courses, row["courseId"], "reviewItems.courseId");
    resolvesAny(targets, row["targetId"], "reviewItems.targetId");
  });
  tables.reviewDecisions.forEach((row) => {
    resolves(courses, row["courseId"], "reviewDecisions.courseId");
    if (row["targetId"] !== undefined) {
      resolvesAny(targets, row["targetId"], "reviewDecisions.targetId");
    }
  });
  tables.exclusionMemory.forEach((row) =>
    resolves(courses, row["courseId"], "exclusionMemory.courseId")
  );
  tables.changes.forEach((row) => {
    resolves(courses, row["courseId"], "changes.courseId");
    resolvesAny(targets, row["targetId"], "changes.targetId");
    for (const id of [...textList(row, "currentEvidenceIds"), ...textList(row, "newEvidenceIds")]) {
      resolves(evidence, id, "changes.evidenceIds");
    }
  });
  tables.history.forEach((row) => {
    resolves(courses, row["courseId"], "history.courseId");
    resolvesAny(targets, row["targetId"], "history.targetId");
  });
}

function validateRows(tables: Record<DurableTable, Record<string, unknown>[]>): void {
  for (const table of DURABLE_TABLES) {
    const validate = VALIDATORS[table];
    for (const [index, row] of tables[table].entries()) {
      try {
        validate(row);
      } catch (error) {
        const detail = error instanceof RestoreError ? (error.detail ?? "") : "";
        throw new RestoreError("BACKUP_INVALID", `${table}[${String(index)}].${detail}`);
      }
    }
  }
  validateReferences(tables);
}

// ---------------------------------------------------------------------------
// Preparation
// ---------------------------------------------------------------------------

function backupErrorCode(error: unknown): RestoreErrorCode {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("BACKUP_FORMAT_UNSUPPORTED")) return "BACKUP_FORMAT_UNSUPPORTED";
  if (message.startsWith("BACKUP_DIGEST_MISMATCH")) return "BACKUP_DIGEST_MISMATCH";
  return "BACKUP_INVALID";
}

function normalizeTables(
  payload: Record<DurableTable, unknown[]>
): Record<DurableTable, Record<string, unknown>[]> {
  const tables = {} as Record<DurableTable, Record<string, unknown>[]>;
  for (const table of DURABLE_TABLES) {
    tables[table] = payload[table].map((row, index) => {
      if (!isRecord(row)) {
        throw new RestoreError("BACKUP_INVALID", `${table}[${String(index)}]`);
      }
      return durableRow(table, row);
    });
  }
  return tables;
}

function summarize(tables: Record<DurableTable, Record<string, unknown>[]>): RestoreSummary {
  const semesters = tables.semesters
    .map((row) => ({ label: text(row, "label"), status: String(row["status"]) }))
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "Current" ? -1 : 1;
      return left.label.localeCompare(right.label);
    });
  return {
    semesters: semesters.map((entry) => entry.label),
    courseCount: tables.courses.length,
    assessmentCount: tables.assessments.filter(
      (row) => row["role"] === "assessment" && row["supersededBy"] === undefined
    ).length
  };
}

/**
 * Parses and validates a backup entirely in memory. Nothing reaches the database here, so a
 * failure at this stage cannot leave a half-restored state: the caller simply never restores.
 */
export async function prepareRestore(
  value: unknown,
  limits: RestoreLimits = RESTORE_LIMITS
): Promise<PreparedRestore> {
  let envelope: BackupEnvelope;
  try {
    envelope = await validateBackup(value);
  } catch (error) {
    throw new RestoreError(backupErrorCode(error));
  }
  const tables = normalizeTables(envelope.payload);
  const total = DURABLE_TABLES.reduce((sum, table) => sum + tables[table].length, 0);
  if (total > limits.maxRecords)
    throw new RestoreError("BACKUP_INVALID", `records:${String(total)}`);
  validateRows(tables);
  return { summary: summarize(tables), tables };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/** Reads the whole new generation back and checks it against what was just written. */
async function revalidate(
  database: LocalDatabase,
  expected: Record<DurableTable, Record<string, unknown>[]>
): Promise<void> {
  const rows = {} as Record<DurableTable, Record<string, unknown>[]>;
  await database.read([...DURABLE_TABLES], async (transaction) => {
    for (const table of DURABLE_TABLES) {
      rows[table] = await transaction.getAll<Record<string, unknown>>(table);
    }
  });
  try {
    for (const table of DURABLE_TABLES) {
      if (rows[table].length !== expected[table].length) {
        throw new RestoreError("RESTORE_INTEGRITY", `count:${table}`);
      }
    }
    validateRows(rows);
  } catch (error) {
    throw new RestoreError(
      "RESTORE_INTEGRITY",
      error instanceof RestoreError ? error.detail : undefined
    );
  }
}

/**
 * Writes the prepared tables into a brand new restore generation. The import, the runtime-store
 * clear and the active-generation pointer move in one transaction: an error anywhere in it aborts
 * the whole transaction and the previous state stays exactly as it was.
 */
export async function applyRestore(
  database: LocalDatabase,
  prepared: PreparedRestore
): Promise<RestoreResult> {
  const generation = randomId("gen");
  try {
    await database.replaceGeneration(prepared.tables, generation);
  } catch (error) {
    throw new RestoreError(
      "RESTORE_WRITE_FAILED",
      error instanceof Error ? error.message : undefined
    );
  }
  await revalidate(database, prepared.tables);
  return { generation, summary: prepared.summary };
}

export interface RestoreRequest {
  database: LocalDatabase;
  /** Raw backup text, or an already-parsed backup document. */
  backup: unknown;
  limits?: RestoreLimits;
}

export async function restoreBackup(input: RestoreRequest): Promise<RestoreResult> {
  const limits = input.limits ?? RESTORE_LIMITS;
  const value = typeof input.backup === "string" ? parseBackup(input.backup, limits) : input.backup;
  return applyRestore(input.database, await prepareRestore(value, limits));
}
