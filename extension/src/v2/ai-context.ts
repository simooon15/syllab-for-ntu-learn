/**
 * Minimum-sufficient-context builders (PRODUCT_HANDOFF §6, Technical Design §8).
 *
 * Every builder is pure: it assembles the system prompt, one deterministic JSON user payload and
 * the output budget, and derives an idempotency key from that payload. Nothing here talks to a
 * provider, shortlists candidates by similarity, or interprets course meaning — the whole Task B
 * canonical index always goes to the model, and only the model's own named object ids decide what
 * the expansion round supplies.
 */

import { isRecord } from "@syllab/contracts";

import { type Chunk, stableDigest } from "./chunking";
import { stableStringify } from "./crypto";
import { computeOutputSafetyCeiling } from "./invocation-policy";
import { PROMPT_A_SYSTEM, PROMPT_B_SYSTEM, PROMPT_C_SYSTEM, PROMPT_VERSIONS } from "./prompts";

/**
 * Compatibility names retained for callers that import the old constants. They now represent the
 * approved provisional runaway guards; every actual call uses `computeOutputSafetyCeiling` with its
 * serialized request, so these are not fixed product capability limits.
 */
export const TASK_A_MAX_TOKENS = 96_000;
export const TASK_B_MAX_TOKENS = 192_000;
export const TASK_C_MAX_TOKENS = 96_000;

/** A rasterized Source page. The data URL is request payload only; it is never stored or logged. */
export interface AiVisualPart {
  locator: string;
  dataUrl: string;
}

/** What a call needs to name a Source, without requiring the full parsed text. */
export interface AiSourceIdentity {
  sourceId: string;
  sourceType?: string;
  title?: string;
  /** Native structure labels in document order, as discovered by the parser. */
  structure?: string[];
}

export interface AiSourceInput extends AiSourceIdentity {
  sourceType: string;
  title: string;
  structure: string[];
  text: string;
  /** Page images; each one is attached to the call whose chunk spans its locator. */
  pageImages?: AiVisualPart[];
}

export interface AiCourseInput {
  /** Absent when the caller only knows the Course as it is shown to the user. */
  courseId?: string;
  courseCode: string;
  courseName: string;
  semesterLabel?: string;
}

/** Original Evidence: a locator plus the verbatim excerpt it points at. */
export interface AiEvidence {
  evidenceId: string;
  sourceId: string;
  locator: string;
  excerpt: string;
  /** Canonical object the Evidence was captured for; drives Task B Evidence expansion. */
  objectId?: string;
}

/** One existing canonical object, projected for the complete concise index. */
export interface AiCourseIndexEntry {
  objectId: string;
  kind: "assessment" | "constraint";
  name: string;
  type?: string;
  role?: string;
  /** Component / series parent, when the object has one. */
  parentObjectId?: string;
  aliases: string[];
  fields: Array<{ fieldName: string; display: string }>;
  /** Unresolved flags carried by the canonical object, e.g. an open identity question. */
  flags: string[];
}

export interface AiCallContext {
  system: string;
  user: string;
  maxTokens: number;
  idempotencyKey: string;
  /** Page images this request must carry. The pipeline forwards them to the transport. */
  visualParts?: AiVisualPart[];
}

function idempotencyKey(
  task: string,
  promptVersion: string,
  scope: Array<string | number>,
  user: string
): string {
  return `${task}:${promptVersion}:${scope.join(":")}:${stableDigest(user)}`;
}

function coursePayload(course: AiCourseInput): Record<string, unknown> {
  return {
    ...(course.courseId === undefined ? {} : { courseId: course.courseId }),
    courseCode: course.courseCode,
    courseName: course.courseName,
    ...(course.semesterLabel === undefined ? {} : { semesterLabel: course.semesterLabel })
  };
}

function sourceIdentityPayload(source: AiSourceIdentity): Record<string, unknown> {
  return {
    sourceId: source.sourceId,
    ...(source.sourceType === undefined ? {} : { sourceType: source.sourceType }),
    ...(source.title === undefined ? {} : { title: source.title }),
    ...(source.structure === undefined ? {} : { structure: source.structure })
  };
}

function evidencePayload(evidence: AiEvidence[]): Array<Record<string, unknown>> {
  return evidence.map((item) => ({
    evidenceId: item.evidenceId,
    sourceId: item.sourceId,
    locator: item.locator,
    excerpt: item.excerpt,
    ...(item.objectId === undefined ? {} : { objectId: item.objectId })
  }));
}

/**
 * Task A context for one Source, or for one chunk of a long Source. Page images are attached when
 * the call spans their locator, so a page is never silently dropped from the call that reads it.
 */
export function buildTaskAContext(input: {
  source: AiSourceInput;
  course: AiCourseInput;
  chunk?: Chunk;
}): AiCallContext {
  const { source, course, chunk } = input;
  const pageImages = source.pageImages ?? [];
  const attached =
    chunk === undefined
      ? pageImages
      : pageImages.filter((image) => chunk.locators.includes(image.locator));
  const payload = {
    course: coursePayload(course),
    source: {
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      title: source.title,
      structure: source.structure,
      ...(attached.length === 0 ? {} : { pageImages: attached.map((image) => image.locator) })
    },
    ...(chunk === undefined
      ? {}
      : {
          chunk: {
            chunkIndex: chunk.chunkIndex,
            chunkCount: chunk.chunkCount,
            locator: chunk.locator,
            locators: chunk.locators,
            start: chunk.start,
            end: chunk.end
          }
        }),
    content: chunk === undefined ? source.text : chunk.text
  };
  const user = stableStringify(payload);
  return {
    system: PROMPT_A_SYSTEM,
    user,
    maxTokens: computeOutputSafetyCeiling("task-a", PROMPT_A_SYSTEM, user),
    idempotencyKey: idempotencyKey(
      "task-a",
      PROMPT_VERSIONS.a,
      [source.sourceId, chunk?.chunkIndex ?? 0],
      user
    ),
    ...(attached.length === 0 ? {} : { visualParts: attached })
  };
}

/**
 * Consolidation stays inside one Source, so the accepted Task A baseline is the right prompt:
 * the model is given the chunk-level results of that Source and returns one Source-level result.
 * It may only reorganize what the chunk results already contain.
 */
export function buildTaskAConsolidationContext(input: {
  source: AiSourceIdentity;
  chunkValues: unknown[];
  course?: AiCourseInput;
}): AiCallContext {
  const payload = {
    ...(input.course === undefined ? {} : { course: coursePayload(input.course) }),
    source: sourceIdentityPayload(input.source),
    chunkResults: input.chunkValues
  };
  const user = stableStringify(payload);
  return {
    system: PROMPT_A_SYSTEM,
    user,
    maxTokens: computeOutputSafetyCeiling("task-a-consolidate", PROMPT_A_SYSTEM, user),
    idempotencyKey: idempotencyKey(
      "task-a-consolidate",
      PROMPT_VERSIONS.a,
      [input.source.sourceId],
      user
    )
  };
}

/**
 * Task B context. The complete concise index is sent unfiltered: local code must not shortlist
 * "likely" objects by name similarity, weight, recency or any other proxy for identity.
 */
export function buildTaskBContext(input: {
  drafts: unknown[];
  constraintCandidates: unknown[];
  courseIndex: AiCourseIndexEntry[];
  evidence: AiEvidence[];
  course?: AiCourseInput;
}): AiCallContext {
  const payload = {
    ...(input.course === undefined ? {} : { course: coursePayload(input.course) }),
    drafts: input.drafts,
    constraintCandidates: input.constraintCandidates,
    existingObjects: input.courseIndex.map((entry) => ({
      objectId: entry.objectId,
      kind: entry.kind,
      name: entry.name,
      ...(entry.type === undefined ? {} : { type: entry.type }),
      ...(entry.role === undefined ? {} : { role: entry.role }),
      ...(entry.parentObjectId === undefined ? {} : { parentObjectId: entry.parentObjectId }),
      aliases: entry.aliases,
      fields: entry.fields.map((field) => ({ fieldName: field.fieldName, display: field.display })),
      flags: entry.flags
    })),
    evidence: evidencePayload(input.evidence)
  };
  const user = stableStringify(payload);
  const scope = input.courseIndex.map((entry) => entry.objectId);
  return {
    system: PROMPT_B_SYSTEM,
    user,
    maxTokens: computeOutputSafetyCeiling("task-b", PROMPT_B_SYSTEM, user),
    idempotencyKey: idempotencyKey(
      "task-b",
      PROMPT_VERSIONS.b,
      [scope.length, scope.join(",")],
      user
    )
  };
}

/**
 * Second Task B round: the same call, with original Evidence for exactly the objects the model
 * named. Supplied Evidence is the pool; entries whose object was not requested stay out.
 */
export function buildTaskBExpansionContext(input: {
  baseUser: string;
  requestedObjectIds: string[];
  evidence: AiEvidence[];
}): AiCallContext {
  const parsed: unknown = JSON.parse(input.baseUser);
  if (!isRecord(parsed)) {
    throw new Error("AI_CONTEXT:task_b_base_payload");
  }
  const requested = [...new Set(input.requestedObjectIds)];
  const wanted = new Set(requested);
  const objectEvidence = input.evidence.filter(
    (item) => item.objectId !== undefined && wanted.has(item.objectId)
  );
  const user = stableStringify({
    ...parsed,
    requestedObjectIds: requested,
    objectEvidence: evidencePayload(objectEvidence)
  });
  return {
    system: PROMPT_B_SYSTEM,
    user,
    maxTokens: computeOutputSafetyCeiling("task-b-expand", PROMPT_B_SYSTEM, user),
    idempotencyKey: idempotencyKey("task-b-expand", PROMPT_VERSIONS.b, [requested.join(",")], user)
  };
}

/**
 * Task C context: only the affected object, its current facts and Evidence, the new Evidence, the
 * Task B identity result, the user state that protects Current State, directly relevant History
 * and the deterministic Coverage Facts. Never the whole Course.
 */
export function buildTaskCContext(input: {
  target: AiCourseIndexEntry;
  currentFacts: unknown[];
  currentEvidence: AiEvidence[];
  newEvidence: AiEvidence[];
  identity: unknown;
  userState: unknown;
  coverageFacts: unknown;
  history?: unknown[];
}): AiCallContext {
  const target = input.target;
  const payload = {
    target: {
      objectId: target.objectId,
      kind: target.kind,
      name: target.name,
      ...(target.type === undefined ? {} : { type: target.type }),
      ...(target.role === undefined ? {} : { role: target.role }),
      ...(target.parentObjectId === undefined ? {} : { parentObjectId: target.parentObjectId }),
      aliases: target.aliases,
      fields: target.fields.map((field) => ({
        fieldName: field.fieldName,
        display: field.display
      })),
      flags: target.flags
    },
    currentFacts: input.currentFacts,
    currentEvidence: evidencePayload(input.currentEvidence),
    newEvidence: evidencePayload(input.newEvidence),
    identity: input.identity,
    userState: input.userState,
    ...(input.history === undefined ? {} : { history: input.history }),
    coverageFacts: input.coverageFacts
  };
  const user = stableStringify(payload);
  return {
    system: PROMPT_C_SYSTEM,
    user,
    maxTokens: computeOutputSafetyCeiling("task-c", PROMPT_C_SYSTEM, user),
    idempotencyKey: idempotencyKey("task-c", PROMPT_VERSIONS.c, [target.objectId], user)
  };
}
