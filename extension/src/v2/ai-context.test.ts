import { describe, expect, it } from "vitest";

import {
  TASK_A_MAX_TOKENS,
  TASK_B_MAX_TOKENS,
  TASK_C_MAX_TOKENS,
  buildTaskAConsolidationContext,
  buildTaskAContext,
  buildTaskBContext,
  buildTaskBExpansionContext,
  buildTaskCContext,
  type AiCallContext,
  type AiCourseIndexEntry,
  type AiEvidence,
  type AiSourceInput
} from "./ai-context";
import { planChunks, type Chunk } from "./chunking";
import { PROMPT_A_SYSTEM, PROMPT_B_SYSTEM, PROMPT_C_SYSTEM, PROMPT_VERSIONS } from "./prompts";

const COURSE = { courseId: "course-1", courseCode: "SYN101", courseName: "Synthetic Course" };

const SOURCE: AiSourceInput = {
  sourceId: "src-1",
  sourceType: "attachment",
  title: "Synthetic handout",
  text: `Page one synthetic text.\n\n${"padding ".repeat(500)}`,
  structure: ["Page one synthetic text.", "padding"],
  pageImages: [
    { locator: "Page one synthetic text.", dataUrl: "data:image/png;base64,AAAA" },
    { locator: "padding", dataUrl: "data:image/png;base64,BBBB" }
  ]
};

const EVIDENCE: AiEvidence[] = [
  {
    evidenceId: "ev-1",
    sourceId: "src-1",
    locator: "body",
    excerpt: "Synthetic excerpt.",
    objectId: "assessment-1"
  },
  {
    evidenceId: "ev-2",
    sourceId: "src-2",
    locator: "page 2",
    excerpt: "Another synthetic excerpt.",
    objectId: "assessment-2"
  },
  {
    evidenceId: "ev-3",
    sourceId: "src-3",
    locator: "notice",
    excerpt: "Draft-side synthetic excerpt."
  }
];

const INDEX: AiCourseIndexEntry[] = [
  {
    objectId: "assessment-1",
    kind: "assessment",
    name: "Group Project Report",
    type: "project",
    role: "assessment",
    aliases: ["Project"],
    fields: [{ fieldName: "weight", display: "30%" }],
    flags: []
  },
  {
    objectId: "assessment-2",
    kind: "assessment",
    name: "Weekly Quiz",
    type: "quiz_test",
    role: "series",
    parentObjectId: "assessment-1",
    aliases: [],
    fields: [{ fieldName: "weight", display: "10%" }],
    flags: ["identity unresolved"]
  },
  {
    objectId: "constraint-1",
    kind: "constraint",
    name: "Late submission rule",
    aliases: [],
    fields: [{ fieldName: "content", display: "48 hours" }],
    flags: []
  }
];

function payloadOf(context: AiCallContext): Record<string, unknown> {
  const parsed: unknown = JSON.parse(context.user);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("PAYLOAD_NOT_AN_OBJECT");
  }
  return parsed as Record<string, unknown>;
}

function chunkOf(source: AiSourceInput, index: number): Chunk {
  const chunks = planChunks({
    sourceId: source.sourceId,
    locator: source.title,
    text: source.text,
    structure: source.structure
  });
  const chunk = chunks[index];
  if (!chunk) throw new Error("CHUNK_MISSING");
  return chunk;
}

describe("Task A context", () => {
  it("carries one Source, its metadata, structure and text under the Task A prompt", () => {
    const context = buildTaskAContext({ source: SOURCE, course: COURSE });
    expect(context.system).toBe(PROMPT_A_SYSTEM);
    expect(context.maxTokens).toBe(TASK_A_MAX_TOKENS);
    const payload = payloadOf(context);
    expect(payload.course).toEqual(COURSE);
    expect(payload.source).toMatchObject({
      sourceId: "src-1",
      sourceType: "attachment",
      title: "Synthetic handout"
    });
    expect(payload.content).toBe(SOURCE.text);
    expect(payload.chunk).toBeUndefined();
  });

  it("scopes a chunk call to that chunk and keeps offsets, labels and count", () => {
    const chunk = chunkOf(SOURCE, 0);
    const context = buildTaskAContext({ source: SOURCE, course: COURSE, chunk });
    const payload = payloadOf(context);
    expect(payload.content).toBe(chunk.text);
    expect(payload.chunk).toMatchObject({
      chunkIndex: chunk.chunkIndex,
      chunkCount: chunk.chunkCount,
      locators: chunk.locators,
      start: chunk.start,
      end: chunk.end
    });
  });

  it("attaches page images to the chunk that spans their locator", () => {
    const withImage = { ...SOURCE, text: "First page image only.", structure: ["Page 1 image"] };
    const source: AiSourceInput = {
      ...withImage,
      pageImages: [{ locator: "Page 1 image", dataUrl: "data:image/png;base64,AAAA" }]
    };
    const context = buildTaskAContext({ source, course: COURSE });
    expect(context.visualParts).toEqual(source.pageImages);
    const chunkContext = buildTaskAContext({
      source,
      course: COURSE,
      chunk: {
        chunkId: "chunk-test",
        chunkIndex: 0,
        chunkCount: 1,
        text: source.text,
        locator: "Page 1 image",
        locators: ["Page 1 image"],
        start: 0,
        end: source.text.length
      }
    });
    expect(chunkContext.visualParts).toHaveLength(1);
    const detached: AiCallContext = buildTaskAContext({
      source,
      course: COURSE,
      chunk: {
        chunkId: "chunk-other",
        chunkIndex: 1,
        chunkCount: 2,
        text: source.text,
        locator: "Page 9 image",
        locators: ["Page 9 image"],
        start: 0,
        end: source.text.length
      }
    });
    expect(detached.visualParts).toBeUndefined();
  });

  it("consolidation keeps the chunk results and needs no Course identity", () => {
    const context = buildTaskAConsolidationContext({
      source: { sourceId: "src-1" },
      chunkValues: [{ sourceResult: "RELEVANT_INFORMATION_FOUND" }]
    });
    const payload = payloadOf(context);
    expect(context.system).toBe(PROMPT_A_SYSTEM);
    expect(payload.course).toBeUndefined();
    expect(payload.source).toEqual({ sourceId: "src-1" });
    expect(payload.chunkResults).toHaveLength(1);
    const withCourse = buildTaskAConsolidationContext({
      source: { sourceId: "src-1", sourceType: "attachment", title: "Synthetic handout" },
      course: COURSE,
      chunkValues: []
    });
    expect(payloadOf(withCourse).course).toEqual(COURSE);
  });

  it("keys chunk calls by source and chunk index", () => {
    const first = buildTaskAContext({ source: SOURCE, course: COURSE, chunk: chunkOf(SOURCE, 0) });
    const again = buildTaskAContext({ source: SOURCE, course: COURSE, chunk: chunkOf(SOURCE, 0) });
    expect(again).toEqual(first);
    expect(first.idempotencyKey.startsWith(`task-a:${PROMPT_VERSIONS.a}:src-1:0:`)).toBe(true);
    const second: Chunk = {
      chunkId: "chunk-second",
      chunkIndex: 1,
      chunkCount: 2,
      text: SOURCE.text,
      locator: SOURCE.title,
      locators: [],
      start: 0,
      end: SOURCE.text.length
    };
    const other = buildTaskAContext({ source: SOURCE, course: COURSE, chunk: second });
    expect(other.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(other.idempotencyKey.startsWith(`task-a:${PROMPT_VERSIONS.a}:src-1:1:`)).toBe(true);
  });
});

describe("Task B context", () => {
  it("sends the complete concise index without shortlisting", () => {
    const context = buildTaskBContext({
      drafts: [{ draftId: "draft-1" }],
      constraintCandidates: [{ candidateId: "cand-1" }],
      courseIndex: INDEX,
      evidence: EVIDENCE
    });
    expect(context.system).toBe(PROMPT_B_SYSTEM);
    expect(context.maxTokens).toBe(TASK_B_MAX_TOKENS);
    const payload = payloadOf(context);
    const objects = payload.existingObjects as Array<Record<string, unknown>>;
    expect(objects.map((entry) => entry.objectId)).toEqual([
      "assessment-1",
      "assessment-2",
      "constraint-1"
    ]);
    expect(objects[1]).toMatchObject({ kind: "assessment", flags: ["identity unresolved"] });
    expect(payload.drafts).toEqual([{ draftId: "draft-1" }]);
    expect(payload.constraintCandidates).toEqual([{ candidateId: "cand-1" }]);
    expect(payload.evidence).toEqual([
      {
        evidenceId: "ev-1",
        sourceId: "src-1",
        locator: "body",
        excerpt: "Synthetic excerpt.",
        objectId: "assessment-1"
      },
      {
        evidenceId: "ev-2",
        sourceId: "src-2",
        locator: "page 2",
        excerpt: "Another synthetic excerpt.",
        objectId: "assessment-2"
      },
      {
        evidenceId: "ev-3",
        sourceId: "src-3",
        locator: "notice",
        excerpt: "Draft-side synthetic excerpt."
      }
    ]);
  });

  it("expands with original Evidence for exactly the requested objects", () => {
    const base = buildTaskBContext({
      drafts: [{ draftId: "draft-1" }],
      constraintCandidates: [],
      courseIndex: INDEX,
      evidence: [EVIDENCE[2] as AiEvidence]
    });
    const expansion = buildTaskBExpansionContext({
      baseUser: base.user,
      requestedObjectIds: ["assessment-2", "assessment-1", "assessment-2"],
      evidence: EVIDENCE
    });
    expect(expansion.system).toBe(PROMPT_B_SYSTEM);
    const payload = payloadOf(expansion);
    expect(payload.requestedObjectIds).toEqual(["assessment-2", "assessment-1"]);
    const objectEvidence = payload.objectEvidence as Array<Record<string, unknown>>;
    expect(objectEvidence.map((entry) => entry.evidenceId)).toEqual(["ev-1", "ev-2"]);
    // The first round's payload is preserved, including the draft-side Evidence.
    expect(payload.drafts).toEqual([{ draftId: "draft-1" }]);
    expect(payload.existingObjects).toHaveLength(INDEX.length);
    expect(expansion.idempotencyKey).not.toBe(base.idempotencyKey);
  });

  it("rejects a base payload that is not an object", () => {
    expect(() =>
      buildTaskBExpansionContext({
        baseUser: "[]",
        requestedObjectIds: ["assessment-1"],
        evidence: []
      })
    ).toThrow("AI_CONTEXT:task_b_base_payload");
  });
});

describe("Task C context", () => {
  it("sends only the affected object plus deterministic coverage facts", () => {
    const context = buildTaskCContext({
      target: INDEX[0] as AiCourseIndexEntry,
      currentFacts: [{ field: "weight", state: "KNOWN", value: "30%" }],
      currentEvidence: [EVIDENCE[0] as AiEvidence],
      newEvidence: [EVIDENCE[2] as AiEvidence],
      identity: { relationship: "SAME_ASSESSMENT" },
      userState: { marks: ["Edited"] },
      coverageFacts: { checked: 4, succeeded: 4, failed: 0, partialCoverage: false }
    });
    expect(context.system).toBe(PROMPT_C_SYSTEM);
    expect(context.maxTokens).toBe(TASK_C_MAX_TOKENS);
    const payload = payloadOf(context);
    expect(payload.target).toMatchObject({ objectId: "assessment-1", kind: "assessment" });
    expect(payload.currentFacts).toHaveLength(1);
    expect(payload.currentEvidence).toHaveLength(1);
    expect(payload.newEvidence).toHaveLength(1);
    expect(payload.coverageFacts).toEqual({
      checked: 4,
      succeeded: 4,
      failed: 0,
      partialCoverage: false
    });
    expect(payload.existingObjects).toBeUndefined();
    expect(payload.history).toBeUndefined();
    expect(context.idempotencyKey.startsWith(`task-c:${PROMPT_VERSIONS.c}:assessment-1:`)).toBe(
      true
    );
  });

  it("includes History only when it is supplied and is stable for the same target", () => {
    const base = buildTaskCContext({
      target: INDEX[0] as AiCourseIndexEntry,
      currentFacts: [],
      currentEvidence: [],
      newEvidence: [],
      identity: null,
      userState: null,
      coverageFacts: null
    });
    const withHistory = buildTaskCContext({
      target: INDEX[0] as AiCourseIndexEntry,
      currentFacts: [],
      currentEvidence: [],
      newEvidence: [],
      identity: null,
      userState: null,
      coverageFacts: null,
      history: [{ event: "CHANGE_KEPT_CURRENT" }]
    });
    expect(payloadOf(withHistory).history).toEqual([{ event: "CHANGE_KEPT_CURRENT" }]);
    expect(base.idempotencyKey).not.toBe(withHistory.idempotencyKey);
    const repeat = buildTaskCContext({
      target: INDEX[0] as AiCourseIndexEntry,
      currentFacts: [],
      currentEvidence: [],
      newEvidence: [],
      identity: null,
      userState: null,
      coverageFacts: null
    });
    expect(repeat.user).toBe(base.user);
    expect(repeat.idempotencyKey).toBe(base.idempotencyKey);
  });
});

describe("context determinism", () => {
  it("writes the payload with stable key ordering", () => {
    const context = buildTaskBContext({
      drafts: [],
      constraintCandidates: [],
      courseIndex: INDEX,
      evidence: EVIDENCE
    });
    const payload = payloadOf(context);
    const keys = Object.keys(payload);
    expect(keys).toEqual([...keys].sort());
  });

  it("produces the same payload and key for the same input", () => {
    const build = () =>
      buildTaskAContext({ source: SOURCE, course: COURSE, chunk: chunkOf(SOURCE, 0) });
    expect(build().user).toBe(build().user);
    expect(build().idempotencyKey).toBe(build().idempotencyKey);
  });
});
