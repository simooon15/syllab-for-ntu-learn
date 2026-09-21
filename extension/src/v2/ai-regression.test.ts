import { isRecord } from "@syllab/contracts";
import { describe, expect, it } from "vitest";

import {
  PROMPT_A_BASELINE,
  PROMPT_A_SYSTEM,
  PROMPT_B_BASELINE,
  PROMPT_B_SYSTEM,
  PROMPT_C_BASELINE,
  PROMPT_C_SYSTEM,
  PROMPT_OUTPUT_INSTRUCTIONS,
  PROMPT_VERSIONS
} from "./prompts";
import { canProposePossiblyRemoved, upsertLatestChange } from "./change-reducer";
import { stableDigest } from "./chunking";
import {
  acceptChange,
  keepCurrent,
  keepPossiblyRemoved,
  removeAssessment,
  resolveConflict,
  resolveIdentity,
  resolveReappearance,
  type CourseSnapshot
} from "./course-state";
import type { ChangeRecord, FactRecord, ReviewItemRecord } from "./domain";
import {
  assertNoProductInstructions,
  runTaskA,
  runTaskB,
  runTaskC,
  type AiCall,
  type AiCallOutcome,
  type AiGateway,
  type AiRunOutcome,
  type TaskAValue,
  type TaskBValue,
  type TaskCValue
} from "./ai-pipeline";
import {
  AI_FIXTURES,
  changeRecordFromFixture,
  chunksFor,
  fixtureById,
  type AiFixture,
  type FixtureSource,
  type HardCheck,
  type TaskAFixture,
  type TaskBFixture,
  type TaskCFixture
} from "./ai-fixtures";
import { makeSnapshot } from "./testing";

const API_KEY = "fixture-key";
const NOW = "2026-09-19T00:00:00.000Z";
const COURSE = { courseId: "course-1", courseCode: "SYN101", courseName: "Synthetic Course" };

/**
 * Replays recorded model responses in physical-call order. The last response repeats, so a
 * response that must be rejected is rejected on every repair and retry attempt too.
 */
class ReplayGateway implements AiGateway {
  readonly calls: AiCall[] = [];
  readonly apiKeys: string[] = [];
  private readonly responses: unknown[];

  constructor(responses: unknown[]) {
    this.responses = responses;
  }

  run(call: AiCall, apiKey: string): Promise<AiCallOutcome> {
    this.calls.push(call);
    this.apiKeys.push(apiKey);
    const index = Math.min(this.calls.length, this.responses.length) - 1;
    return Promise.resolve({ call, value: structuredClone(this.responses[index]) });
  }
}

type FixtureOutcome =
  | { task: "task-a"; run: AiRunOutcome<TaskAValue> }
  | { task: "task-b"; run: AiRunOutcome<TaskBValue> }
  | { task: "task-c"; run: AiRunOutcome<TaskCValue> };

interface FixtureRun {
  outcome: FixtureOutcome;
  calls: AiCall[];
  responses: unknown[];
}

function runTaskAFixture(
  fixture: TaskAFixture,
  gateway: ReplayGateway
): Promise<AiRunOutcome<TaskAValue>> {
  return runTaskA(
    { gateway, apiKey: API_KEY },
    { source: fixture.source, course: COURSE, chunks: chunksFor(fixture.source) }
  );
}

function runTaskBFixture(
  fixture: TaskBFixture,
  gateway: ReplayGateway
): Promise<AiRunOutcome<TaskBValue>> {
  return runTaskB(
    { gateway, apiKey: API_KEY },
    {
      drafts: fixture.drafts,
      constraintCandidates: fixture.constraintCandidates,
      courseIndex: fixture.courseIndex,
      evidence: fixture.evidence
    }
  );
}

function runTaskCFixture(
  fixture: TaskCFixture,
  gateway: ReplayGateway
): Promise<AiRunOutcome<TaskCValue>> {
  return runTaskC(
    { gateway, apiKey: API_KEY },
    {
      target: fixture.target,
      currentFacts: fixture.currentFacts,
      currentEvidence: fixture.currentEvidence,
      newEvidence: fixture.newEvidence,
      identity: fixture.identity ?? null,
      userState: fixture.userState ?? null,
      coverageFacts: fixture.coverageFacts,
      coverageSufficient: fixture.coverageSufficient,
      ...(fixture.history === undefined ? {} : { history: fixture.history })
    }
  );
}

async function runFixture(fixture: AiFixture): Promise<FixtureRun> {
  const gateway = new ReplayGateway(fixture.responses);
  let outcome: FixtureOutcome;
  if (fixture.task === "task-a") {
    outcome = { task: "task-a", run: await runTaskAFixture(fixture, gateway) };
  } else if (fixture.task === "task-b") {
    outcome = { task: "task-b", run: await runTaskBFixture(fixture, gateway) };
  } else {
    outcome = { task: "task-c", run: await runTaskCFixture(fixture, gateway) };
  }
  expect(gateway.apiKeys.length).toBe(gateway.calls.length);
  expect(gateway.apiKeys.every((key) => key === API_KEY)).toBe(true);
  return { outcome, calls: gateway.calls, responses: fixture.responses };
}

// ---------------------------------------------------------------------------
// Hard checks
// ---------------------------------------------------------------------------

function walk(value: unknown, visit: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (!isRecord(value)) return;
  visit(value);
  for (const item of Object.values(value)) walk(item, visit);
}

const SOURCE_RESULTS = [
  "RELEVANT_INFORMATION_FOUND",
  "NO_RELEVANT_INFORMATION",
  "PARTIALLY_UNDERSTOOD"
];
const RELATIONSHIPS = ["SAME_ASSESSMENT", "DIFFERENT_ASSESSMENT", "UNCERTAIN"];
const CHANGE_TYPES = [
  "NO_MEANINGFUL_CHANGE",
  "NEW",
  "CHANGED",
  "CONFLICT",
  "POSSIBLY_REMOVED",
  "IDENTITY_UNCERTAIN"
];
const ROLES = ["assessment", "component", "series", "series_instance"];
const KINDS = ["assignment", "project", "quiz_test", "exam", "other"];
const SCHEMAS = ["syllab.ai.task-a/1", "syllab.ai.task-b/1", "syllab.ai.task-c/1"];
const KNOWLEDGE_STATES = ["KNOWN", "EXPLICITLY_UNKNOWN", "UNCERTAIN"];

function suppliedSourceIds(fixture: AiFixture): Set<string> {
  if (fixture.task === "task-a") return new Set([fixture.source.sourceId]);
  if (fixture.task === "task-b") return new Set(fixture.evidence.map((item) => item.sourceId));
  return new Set([...fixture.currentEvidence, ...fixture.newEvidence].map((item) => item.sourceId));
}

const HARD_CHECKS: Record<HardCheck, (fixture: AiFixture, run: FixtureRun) => void> = {
  evidence_traceable: (fixture, run) => {
    const known = suppliedSourceIds(fixture);
    for (const response of run.responses) {
      walk(response, (record) => {
        if (typeof record.evidenceId !== "string") return;
        expect(typeof record.sourceId).toBe("string");
        expect(known.has(record.sourceId as string)).toBe(true);
        expect(typeof record.excerpt).toBe("string");
        expect((record.excerpt as string).length).toBeGreaterThan(0);
      });
    }
  },
  enums_legal: (_fixture, run) => {
    for (const response of run.responses) {
      walk(response, (record) => {
        if (typeof record.sourceResult === "string")
          expect(SOURCE_RESULTS).toContain(record.sourceResult);
        if (typeof record.relationship === "string" && Array.isArray(record.involvedObjectIds)) {
          expect(RELATIONSHIPS).toContain(record.relationship);
        }
        if (typeof record.changeType === "string")
          expect(CHANGE_TYPES).toContain(record.changeType);
        if (typeof record.role === "string") expect(ROLES).toContain(record.role);
        if (typeof record.type === "string") expect(KINDS).toContain(record.type);
        if (typeof record.schema === "string") expect(SCHEMAS).toContain(record.schema);
        if (record.state !== undefined) {
          expect(typeof record.state).toBe("string");
          expect(KNOWLEDGE_STATES).toContain(record.state);
        }
      });
    }
  },
  no_product_instructions: (fixture, run) => {
    const rejectedForForbiddenKey = fixture.expectation.detailContains === "forbidden_key";
    for (const response of run.responses) {
      if (rejectedForForbiddenKey) {
        expect(() => {
          assertNoProductInstructions(response);
        }).toThrow(/forbidden_key/);
      } else {
        expect(() => {
          assertNoProductInstructions(response);
        }).not.toThrow();
      }
    }
  },
  competing_values_preserved: (_fixture, run) => {
    let seen = 0;
    for (const response of run.responses) {
      walk(response, (record) => {
        for (const key of ["competingValues", "competing_values"]) {
          const values = record[key];
          if (!Array.isArray(values)) continue;
          seen += 1;
          expect(values.length).toBeGreaterThanOrEqual(2);
          expect(new Set(values.map((item) => JSON.stringify(item))).size).toBeGreaterThan(1);
        }
      });
    }
    expect(seen).toBeGreaterThan(0);
  },
  uncertain_preserved: (_fixture, run) => {
    for (const response of run.responses) {
      walk(response, (record) => {
        for (const [key, value] of Object.entries(record)) {
          const normalized = key.toLowerCase().replace(/[_-]/g, "");
          if (normalized === "uncertain" || normalized === "isuncertain") {
            expect(typeof value).not.toBe("boolean");
          }
        }
        if (record.state === "UNCERTAIN") {
          expect(
            record.competingValues === undefined || Array.isArray(record.competingValues)
          ).toBe(true);
        }
      });
    }
  },
  removal_requires_coverage: (fixture, run) => {
    if (fixture.task !== "task-c") throw new Error("CHECK_NEEDS_TASK_C_FIXTURE");
    for (const response of run.responses) {
      walk(response, (record) => {
        if (record.changeType !== "POSSIBLY_REMOVED") return;
        if (fixture.coverageSufficient) return;
        expect(run.outcome.run.status).toBe("failed");
      });
    }
  },
  index_complete: (fixture, run) => {
    if (fixture.task !== "task-b") throw new Error("CHECK_NEEDS_TASK_B_FIXTURE");
    const first = run.calls[0];
    if (!first) throw new Error("CHECK_NEEDS_A_FIRST_CALL");
    const payload: unknown = JSON.parse(first.user);
    if (!isRecord(payload) || !Array.isArray(payload.existingObjects)) {
      throw new Error("CHECK_NEEDS_CONCISE_INDEX");
    }
    expect(payload.existingObjects).toHaveLength(fixture.courseIndex.length);
    const ids = payload.existingObjects
      .map((entry) => (isRecord(entry) ? entry.objectId : undefined))
      .filter((entry): entry is string => typeof entry === "string");
    expect(ids).toEqual(fixture.courseIndex.map((entry) => entry.objectId));
  },
  evidence_expansion_scope: (fixture, run) => {
    if (fixture.task !== "task-b") throw new Error("CHECK_NEEDS_TASK_B_FIXTURE");
    const pool = new Set(fixture.evidence.map((item) => item.evidenceId));
    for (const call of run.calls.filter((entry) => entry.task === "task-b-expand")) {
      const payload: unknown = JSON.parse(call.user);
      if (!isRecord(payload) || !Array.isArray(payload.requestedObjectIds)) {
        throw new Error("CHECK_NEEDS_EXPANSION_PAYLOAD");
      }
      const requested = payload.requestedObjectIds.filter(
        (entry): entry is string => typeof entry === "string"
      );
      expect(requested.length).toBeGreaterThan(0);
      const supplied = Array.isArray(payload.objectEvidence) ? payload.objectEvidence : [];
      for (const entry of supplied) {
        if (!isRecord(entry)) throw new Error("CHECK_NEEDS_EXPANSION_EVIDENCE");
        expect(requested).toContain(entry.objectId);
        expect(pool.has(entry.evidenceId as string)).toBe(true);
      }
    }
  }
};

describe("AI regression fixtures", () => {
  it("covers at least 20 cases across the required families", () => {
    const ids = new Set(AI_FIXTURES.map((fixture) => fixture.caseId));
    expect(AI_FIXTURES.length).toBeGreaterThanOrEqual(20);
    expect(ids.size).toBe(AI_FIXTURES.length);
    for (const family of ["A1", "A2", "A4", "B3", "B4", "B5", "C1", "C4", "C6"]) {
      expect(ids.has(family)).toBe(true);
    }
  });

  for (const fixture of AI_FIXTURES) {
    it(`${fixture.caseId} — ${fixture.title}`, async () => {
      const run = await runFixture(fixture);
      const { outcome } = run;
      if (fixture.expectation.outcome === "succeeded") {
        expect(outcome.run.status).toBe("succeeded");
        if (outcome.run.status !== "succeeded") return;
        if (outcome.task === "task-a" && fixture.expectation.sourceResult !== undefined) {
          expect(outcome.run.value.sourceResult).toBe(fixture.expectation.sourceResult);
        }
        if (outcome.task === "task-b") {
          if (fixture.expectation.relationships !== undefined) {
            expect(
              outcome.run.value.result.identityResolutions.map((item) => item.relationship)
            ).toEqual(fixture.expectation.relationships);
          }
          if (fixture.expectation.expansionRounds !== undefined) {
            expect(outcome.run.value.expansionRounds).toBe(fixture.expectation.expansionRounds);
          }
        }
        if (outcome.task === "task-c" && fixture.expectation.changeTypes !== undefined) {
          expect(outcome.run.value.result.changeResults.map((item) => item.changeType)).toEqual(
            fixture.expectation.changeTypes
          );
        }
        for (const record of outcome.run.calls) {
          expect(record.status).toBe("succeeded");
          expect(record.idempotencyKey.length).toBeGreaterThan(0);
          expect(record.promptVersion.length).toBeGreaterThan(0);
        }
      } else {
        expect(outcome.run.status).toBe("failed");
        if (outcome.run.status === "failed") {
          expect(outcome.run.failure.detail ?? "").toContain(
            fixture.expectation.detailContains ?? ""
          );
          expect(outcome.run.failure.consumesApi).toBe(true);
        }
      }
      if (fixture.expectation.calls !== undefined) {
        expect(run.calls.length).toBe(fixture.expectation.calls);
      }
      for (const check of fixture.hardChecks) HARD_CHECKS[check](fixture, run);
    });
  }
});

// ---------------------------------------------------------------------------
// Accepted prompt baseline
// ---------------------------------------------------------------------------

describe("accepted prompt baseline", () => {
  const baselines = [
    {
      name: "A",
      baseline: PROMPT_A_BASELINE,
      system: PROMPT_A_SYSTEM,
      block: PROMPT_OUTPUT_INSTRUCTIONS.a,
      digest: "85a02cbe1c708073"
    },
    {
      name: "B",
      baseline: PROMPT_B_BASELINE,
      system: PROMPT_B_SYSTEM,
      block: PROMPT_OUTPUT_INSTRUCTIONS.b,
      digest: "b190b497e3974933"
    },
    {
      name: "C",
      baseline: PROMPT_C_BASELINE,
      system: PROMPT_C_SYSTEM,
      block: PROMPT_OUTPUT_INSTRUCTIONS.c,
      digest: "b61b97d70d8febeb"
    }
  ];

  for (const entry of baselines) {
    it(`Task ${entry.name} keeps the locked baseline verbatim and appends only the envelope`, () => {
      expect(entry.system).toBe(`${entry.baseline}\n\n${entry.block}`);
      expect(entry.system.startsWith(entry.baseline)).toBe(true);
      expect(entry.baseline).toContain("ROLE");
      expect(entry.baseline).toContain("PROHIBITED BEHAVIORS");
      expect(entry.baseline).toContain("FINAL CHECK");
      expect(stableDigest(entry.baseline)).toBe(entry.digest);
    });
  }

  it("locks the prompt versions", () => {
    expect(PROMPT_VERSIONS).toEqual({ a: "task-a/1", b: "task-b/1", c: "task-c/1" });
  });
});

// ---------------------------------------------------------------------------
// Reducers over recorded responses
// ---------------------------------------------------------------------------

function factRecord(change: ChangeRecord, field: string, value: FactRecord["value"]): FactRecord {
  return {
    factId: `fact-${field}`,
    courseId: "course-1",
    assessmentId: change.targetId,
    field,
    value,
    evidenceRefs: [],
    marks: [],
    updatedAt: NOW
  };
}

function reviewItemFor(change: ChangeRecord): ReviewItemRecord {
  return {
    reviewItemId: `change_${change.changeId}`,
    courseId: "course-1",
    workflowId: "workflow-1",
    kind: change.changeType === "IDENTITY_UNCERTAIN" ? "identity" : "change",
    changeType: change.changeType,
    targetId: change.targetId,
    payload: { changeId: change.changeId },
    createdAt: NOW,
    updatedAt: NOW
  };
}

function snapshotFor(
  change: ChangeRecord,
  overrides: Partial<CourseSnapshot> = {}
): CourseSnapshot {
  return makeSnapshot({
    assessments: [
      {
        assessmentId: change.targetId,
        courseId: "course-1",
        role: "assessment",
        kind: "project",
        name: "Group Project Report",
        aliases: [],
        marks: [],
        createdBy: "ai",
        createdAt: NOW,
        updatedAt: NOW
      }
    ],
    facts: [factRecord(change, change.field ?? "deadline", { state: "KNOWN", value: "12 Oct" })],
    changes: [change],
    reviewItems: [reviewItemFor(change)],
    ...overrides
  });
}

describe("Current vs Latest through the real reducers", () => {
  it("keeps one pending 12 Oct → 26 Oct item and histories the intermediate 19 Oct", () => {
    const fixture = fixtureById("C3");
    if (fixture.task !== "task-c") throw new Error("FIXTURE_NOT_TASK_C");
    const first = changeRecordFromFixture(fixture, 0);
    const second = changeRecordFromFixture(fixture, 0, {
      latestValue: { state: "KNOWN", value: "26 Oct" }
    });
    const result = upsertLatestChange(first, second, "2026-09-20T00:00:00.000Z");
    expect(result.pending.changeId).toBe(first.changeId);
    expect(result.pending.currentValue?.value).toBe("12 Oct");
    expect(result.pending.latestValue?.value).toBe("26 Oct");
    expect(result.history?.event).toBe("PENDING_SUPERSEDED");
    expect(result.history?.value?.value).toBe("19 Oct");
    expect(result.history?.field).toBe("deadline");
  });

  it("protects removal behind successful complete coverage", () => {
    const sufficient = fixtureById("C5");
    const partial = fixtureById("C6");
    expect(
      canProposePossiblyRemoved({
        allRelevantSourcesFetched: true,
        allRelevantSourcesParsed: true,
        permissionDenied: false,
        partialCoverage: false,
        aiJudgment: "POSSIBLY_REMOVED"
      })
    ).toBe(true);
    expect(sufficient.task).toBe("task-c");
    expect(partial.task).toBe("task-c");
    expect(
      canProposePossiblyRemoved({
        allRelevantSourcesFetched: true,
        allRelevantSourcesParsed: true,
        permissionDenied: false,
        partialCoverage: true,
        aiJudgment: "POSSIBLY_REMOVED"
      })
    ).toBe(false);
  });

  it("keeps a kept Possibly Removed object current until it is reliably seen again", () => {
    const fixture = fixtureById("C5");
    if (fixture.task !== "task-c") throw new Error("FIXTURE_NOT_TASK_C");
    const change = changeRecordFromFixture(fixture, 0);
    const kept = keepPossiblyRemoved(snapshotFor(change), {
      changeId: change.changeId,
      expectedRevision: 0,
      now: NOW
    });
    const assessment = kept.snapshot.assessments[0];
    expect(assessment?.marks).toContain("PossiblyRemoved");
    expect(assessment?.supersededBy).toBeUndefined();
    expect(kept.snapshot.changes).toHaveLength(0);
    expect(kept.history[0]?.event).toBe("POSSIBLY_REMOVED_KEPT");

    const reappeared = resolveReappearance(kept.snapshot, {
      assessmentId: change.targetId,
      expectedRevision: kept.snapshot.course.currentRevision,
      now: "2026-09-21T00:00:00.000Z"
    });
    expect(reappeared?.snapshot.assessments[0]?.marks).not.toContain("PossiblyRemoved");
    expect(reappeared?.history[0]?.event).toBe("POSSIBLY_REMOVED_RESOLVED");
    expect(reappeared?.snapshot.reviewItems).toHaveLength(1);
  });

  it("removes only after the user accepts the removal", () => {
    const fixture = fixtureById("C5");
    if (fixture.task !== "task-c") throw new Error("FIXTURE_NOT_TASK_C");
    const change = changeRecordFromFixture(fixture, 0);
    const removed = removeAssessment(snapshotFor(change), {
      changeId: change.changeId,
      expectedRevision: 0,
      now: NOW
    });
    expect(removed.snapshot.assessments[0]?.supersededBy).toBe("removed");
    expect(removed.snapshot.facts[0]?.superseded).toBe(true);
    expect(removed.history[0]?.event).toBe("ASSESSMENT_REMOVED");
  });

  it("applies an accepted CHANGED value and clears the pending change", () => {
    const fixture = fixtureById("C3");
    if (fixture.task !== "task-c") throw new Error("FIXTURE_NOT_TASK_C");
    const change = changeRecordFromFixture(fixture, 0);
    const accepted = acceptChange(snapshotFor(change), {
      changeId: change.changeId,
      expectedRevision: 0,
      now: NOW
    });
    expect(accepted.snapshot.facts[0]?.value.value).toBe("19 Oct");
    expect(accepted.snapshot.facts[0]?.marks).toContain("Changed");
    expect(accepted.snapshot.changes).toHaveLength(0);
    expect(accepted.history[0]?.event).toBe("CHANGE_ACCEPTED");
  });

  it("keeps the current value when the user chooses Keep Current", () => {
    const fixture = fixtureById("C3");
    if (fixture.task !== "task-c") throw new Error("FIXTURE_NOT_TASK_C");
    const change = changeRecordFromFixture(fixture, 0);
    const kept = keepCurrent(snapshotFor(change), {
      changeId: change.changeId,
      expectedRevision: 0,
      now: NOW
    });
    expect(kept.snapshot.facts[0]?.value.value).toBe("12 Oct");
    expect(kept.history[0]?.event).toBe("CHANGE_KEPT_CURRENT");
    expect(kept.history[0]?.note).toBe("discrepancy");
    expect(kept.decisions[0]?.kind).toBe("KeepCurrent");
  });

  it("resolves a conflict only with an explicit user value", () => {
    const fixture = fixtureById("C4");
    if (fixture.task !== "task-c") throw new Error("FIXTURE_NOT_TASK_C");
    const change = changeRecordFromFixture(fixture, 0);
    expect(change.competingValues?.map((entry) => entry.value)).toEqual(["12 Oct", "19 Oct"]);
    const resolved = resolveConflict(snapshotFor(change), {
      changeId: change.changeId,
      resolution: { state: "KNOWN", value: "19 Oct" },
      expectedRevision: 0,
      now: NOW
    });
    expect(resolved.snapshot.facts[0]?.value).toEqual({ state: "KNOWN", value: "19 Oct" });
    expect(resolved.history[0]?.event).toBe("CONFLICT_RESOLVED");
    expect(resolved.decisions[0]?.kind).toBe("ResolveConflict");
  });

  it("leaves identity uncertainty to the user and never applies it automatically", () => {
    const fixture = fixtureById("C7");
    if (fixture.task !== "task-c") throw new Error("FIXTURE_NOT_TASK_C");
    const change = changeRecordFromFixture(fixture, 0);
    const snapshot = snapshotFor(change);
    expect(() =>
      acceptChange(snapshot, { changeId: change.changeId, expectedRevision: 0, now: NOW })
    ).toThrow("CHANGE_NOT_APPLICABLE");
    const resolved = resolveIdentity(snapshot, {
      changeId: change.changeId,
      relationship: "SAME_ASSESSMENT",
      expectedRevision: 0,
      now: NOW
    });
    expect(resolved.snapshot.changes).toHaveLength(0);
    expect(resolved.decisions[0]?.kind).toBe("KeepIdentity");
    expect(resolved.snapshot.assessments[0]?.name).toBe("Group Project Report");
  });

  it("rejects a stale writer when the course revision moved on", () => {
    const fixture = fixtureById("C3");
    if (fixture.task !== "task-c") throw new Error("FIXTURE_NOT_TASK_C");
    const change = changeRecordFromFixture(fixture, 0);
    expect(() =>
      acceptChange(snapshotFor(change), {
        changeId: change.changeId,
        expectedRevision: 7,
        now: NOW
      })
    ).toThrow("COURSE_REVISION_CONFLICT");
  });
});

// ---------------------------------------------------------------------------
// Fixture shape guards
// ---------------------------------------------------------------------------

describe("fixture shape", () => {
  it("produces two chunks for the long synthetic Source", () => {
    const fixture = fixtureById("A7");
    if (fixture.task !== "task-a") throw new Error("FIXTURE_NOT_TASK_A");
    const source: FixtureSource = fixture.source;
    const chunks = chunksFor(source);
    expect(chunks).toHaveLength(2);
    expect(source.text.length).toBeGreaterThan(0);
  });

  it("supplies expansion Evidence only for indexed objects", () => {
    const fixture = fixtureById("B7");
    if (fixture.task !== "task-b") throw new Error("FIXTURE_NOT_TASK_B");
    const tagged = fixture.evidence.filter((item) => item.objectId !== undefined);
    expect(tagged.length).toBeGreaterThan(0);
    expect(fixture.evidence.length).toBeGreaterThan(tagged.length);
  });
});
