import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { coverageFromObservations } from "./materialize";
import type { CourseRecord, SourceObservationRecord, SourceRecord, WorkflowRecord } from "./domain";
import { LocalDatabase, DATABASE_NAME } from "./storage";
import { LocalStore } from "./store";
import {
  WorkflowEngine,
  retryDue,
  retryDueAt,
  type EngineOptions,
  type FetchedSource,
  type MachinePort
} from "./workflow";
import type { AiTaskName } from "./ai-pipeline";
import { acceptChange, keepCurrent } from "./course-state";
import { RebuildStagingStore } from "./staging";
import { sourceMachineRepresentation } from "./fingerprint";
import { ViewBuilder } from "./view";
import { ViewHandler } from "./handler";
import { V2_MESSAGE_CONTRACT } from "./contract";
import { DeepSeekFailure } from "./deepseek";

const NOW = new Date("2026-09-19T09:00:00.000Z");

class VirtualClock {
  private current = NOW.getTime();

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current += ms;
  }
}

interface SourceFixture {
  sourceId: string;
  title: string;
  kind: string;
  text: string;
}

/** Synthetic two-source Course: a project with a group component, and a quiz series. */
const INITIAL_SOURCES: SourceFixture[] = [
  {
    sourceId: "src-guide",
    title: "Course Guide",
    kind: "attachment",
    text: [
      "MA6081 Fundamentals of Project Management",
      "Individual Assignment 30% due 18 October",
      "Group Project 40% due 12 November. Written Report 25%, Presentation 15%.",
      "Final Exam 30%"
    ].join("\n")
  },
  {
    sourceId: "src-quizzes",
    title: "Quizzes",
    kind: "course-content-item",
    text: "Six quizzes across the term. Best four count. Quiz 1 on 12 September. Quiz 2 on 26 September."
  }
];

class FakeMachine implements MachinePort {
  sources = [...INITIAL_SOURCES];
  failNext = false;
  missingPermissionOrigins = (): Promise<string[]> => Promise.resolve([]);

  discover(): Promise<{
    sources: Array<{ sourceId: string; nativeItemId: string; title: string; kind: string }>;
  }> {
    return Promise.resolve({
      sources: this.sources.map((source) => ({
        sourceId: source.sourceId,
        nativeItemId: source.sourceId,
        title: source.title,
        kind: source.kind
      }))
    });
  }

  fetchAndParse(source: SourceRecord): Promise<FetchedSource> {
    const fixture = this.sources.find((item) => item.sourceId === source.sourceId);
    if (!fixture || this.failNext) {
      return Promise.resolve({
        sourceId: source.sourceId,
        nativeItemId: source.nativeItemId,
        kind: source.kind,
        title: source.title,
        text: "",
        structure: [],
        fetchStatus: "failed",
        parseStatus: "not-attempted",
        errorCode: "NETWORK_TRANSIENT"
      });
    }
    return Promise.resolve({
      sourceId: fixture.sourceId,
      nativeItemId: fixture.sourceId,
      kind: fixture.kind,
      title: fixture.title,
      text: fixture.text,
      structure: fixture.text
        .split("\n")
        .map((line, index) => `${String(index + 1)}. ${line.slice(0, 30)}`),
      fetchStatus: "ok",
      parseStatus: "ok"
    });
  }
}

interface TestCall {
  task: AiTaskName;
  schemaVersion: string;
  promptVersion: string;
  idempotencyKey: string;
  maxTokens: number;
  system: string;
  user: string;
}

/**
 * A scripted provider. Responses are keyed by task so a test can state the Course meaning once
 * and let the engine decide how many physical calls it needs.
 */
/**
 * A scripted provider. A handler sees the assembled call — which is what a real model sees — so a
 * test can state the Course meaning once and let the engine decide how many physical calls it
 * needs, rather than predicting workflow or chunk ids.
 */
class FakeAi {
  calls: Array<TestCall & { context: unknown }> = [];
  key: string | null = "test-key";
  privacy = true;
  usage = true;
  handler: (call: TestCall) => unknown = () => {
    throw new Error("NO_SCRIPTED_RESPONSE");
  };

  apiKey = (): Promise<string | null> => Promise.resolve(this.key);
  privacyAuthorized = (): Promise<boolean> => Promise.resolve(this.privacy);
  usageAuthorized = (): Promise<boolean> => Promise.resolve(this.usage);

  execute(
    call: TestCall,
    _apiKey: string,
    context: unknown
  ): Promise<{ call: TestCall; value: unknown }> {
    this.calls.push({ ...call, context });
    return Promise.resolve({ call, value: structuredClone(this.handler(call)) });
  }
}

/**
 * Answers a Task A call with the fixture whose Source text the call actually carries. The engine
 * decides which Source it is processing; the fixture never guesses from ids.
 */
function fixtureFor(
  taskAFixtures: Array<Record<string, unknown> & { sourceId: string }>,
  taskB: unknown
): (call: TestCall) => unknown {
  const byText: Array<{ needle: string; value: unknown }> = [
    { needle: "Six quizzes across the term", value: taskAFixtures[1] },
    { needle: "Individual Assignment 30% due 18 October", value: taskAFixtures[0] }
  ];
  return (call) => {
    if (call.task === "task-a") {
      const match = byText.find((entry) => call.user.includes(entry.needle));
      if (!match) throw new Error("NO_FIXTURE_FOR_SOURCE");
      return match.value;
    }
    if (call.task === "task-b") return taskB;
    throw new Error(`UNEXPECTED_CALL:${call.task}`);
  };
}

/** Minimal stand-in for chrome.storage.local, which Rebuild staging is persisted in. */
function memoryStorage(): {
  get: (keys: string | string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
} {
  const map = new Map<string, unknown>();
  const list = (keys: string | string[]): string[] => (Array.isArray(keys) ? keys : [keys]);
  return {
    get: (keys) =>
      Promise.resolve(
        Object.fromEntries(list(keys).flatMap((key) => (map.has(key) ? [[key, map.get(key)]] : [])))
      ),
    set: (items) => {
      for (const [key, value] of Object.entries(items)) map.set(key, value);
      return Promise.resolve();
    },
    remove: (keys) => {
      for (const key of list(keys)) map.delete(key);
      return Promise.resolve();
    }
  };
}

function engineFor(options: {
  store: LocalStore;
  machine: FakeMachine;
  ai: FakeAi;
  clock: VirtualClock;
  staging: RebuildStagingStore;
  onStage?: (workflow: WorkflowRecord) => void;
  taskCInputs?: Array<Parameters<EngineOptions["buildTaskCCalls"]>[0]>;
}): WorkflowEngine {
  const engineOptions: EngineOptions = {
    store: options.store,
    machine: options.machine,
    ai: options.ai,
    staging: options.staging,
    clock: options.clock,
    buildTaskACalls: ({ source }) => [
      {
        task: "task-a",
        schemaVersion: "syllab.ai.task-a/1",
        promptVersion: "task-a/1",
        idempotencyKey: `a:${source.sourceId}`,
        maxTokens: 8000,
        system: "PROMPT_A",
        user: source.text
      }
    ],
    buildTaskAConsolidationCall: ({ source }) => ({
      task: "task-a-consolidate",
      schemaVersion: "syllab.ai.task-a/1",
      promptVersion: "task-a/1",
      idempotencyKey: `a-consolidate:${source.sourceId}`,
      maxTokens: 8000,
      system: "PROMPT_A",
      user: ""
    }),
    buildTaskBCalls: () => [
      {
        task: "task-b",
        schemaVersion: "syllab.ai.task-b/1",
        promptVersion: "task-b/1",
        idempotencyKey: "b",
        maxTokens: 16000,
        system: "PROMPT_B",
        user: ""
      }
    ],
    buildTaskBExpansionCall: ({ base }) => ({
      ...base,
      task: "task-b-expand",
      idempotencyKey: `${base.idempotencyKey}:expand`
    }),
    buildTaskCCalls: (input) => {
      options.taskCInputs?.push(input);
      return [
        {
          task: "task-c",
          schemaVersion: "syllab.ai.task-c/1",
          promptVersion: "task-c/1",
          idempotencyKey: `c:${input.target.objectId}`,
          maxTokens: 8000,
          system: "PROMPT_C",
          user: ""
        }
      ];
    },
    planChunks: ({ sourceId, text }) => [
      {
        chunkId: `${sourceId}:0`,
        chunkIndex: 0,
        chunkCount: 1,
        text,
        locator: "whole",
        locators: ["whole"],
        start: 0,
        end: text.length
      }
    ],
    ...(options.onStage ? { onStage: options.onStage } : {})
  };
  return new WorkflowEngine(engineOptions);
}

async function freshStore(): Promise<LocalStore> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.addEventListener("success", () => resolve());
    request.addEventListener("error", () => resolve());
    request.addEventListener("blocked", () => resolve());
  });
  const store = new LocalStore(new LocalDatabase());
  await store.initialize();
  return store;
}

function courseRecord(): CourseRecord {
  return {
    courseId: "course-1",
    semesterId: "semester-1",
    courseCode: "MA6081",
    courseName: "Fundamentals of Project Management",
    curriculum: true,
    established: false,
    currentRevision: 0,
    consecutiveCheckFailures: 0,
    updatedAt: NOW.toISOString()
  };
}

const TASK_B_MERGED = {
  schema: "syllab.ai.task-b/1",
  identityResolutions: [],
  canonicalAssessmentProposals: [],
  courseWideConstraintProposals: [],
  fieldConsolidationResults: [],
  structuralRelationships: [],
  unresolvedIssues: []
};

const TASK_A_GUIDE = {
  schema: "syllab.ai.task-a/1",
  sourceId: "src-guide",
  sourceResult: "RELEVANT_INFORMATION_FOUND",
  assessmentDrafts: [
    {
      draftId: "draft-individual",
      name: "Individual Assignment",
      type: "assignment",
      role: "assessment",
      fields: [
        {
          fieldName: "deadline",
          state: "KNOWN",
          value: "18 October",
          evidence: [
            {
              evidenceId: "ev-ia-deadline",
              sourceId: "src-guide",
              locator: "line 2",
              excerpt: "Individual Assignment 30% due 18 October"
            }
          ]
        }
      ],
      requirements: [],
      unresolvedIssues: []
    },
    {
      draftId: "draft-group",
      name: "Group Project",
      type: "project",
      role: "assessment",
      fields: [
        {
          fieldName: "weight",
          state: "KNOWN",
          value: "40%",
          evidence: [
            {
              evidenceId: "ev-gp-weight",
              sourceId: "src-guide",
              locator: "line 3",
              excerpt: "Group Project 40% due 12 November"
            }
          ]
        }
      ],
      requirements: [],
      unresolvedIssues: []
    }
  ],
  courseWideConstraintCandidates: [],
  unresolvedIssues: []
};

const TASK_A_QUIZZES = {
  schema: "syllab.ai.task-a/1",
  sourceId: "src-quizzes",
  sourceResult: "RELEVANT_INFORMATION_FOUND",
  assessmentDrafts: [
    {
      draftId: "draft-quizzes",
      name: "Quizzes",
      type: "quiz_test",
      role: "series",
      fields: [
        {
          fieldName: "weight",
          state: "KNOWN",
          value: "20%",
          evidence: [
            {
              evidenceId: "ev-q-weight",
              sourceId: "src-quizzes",
              locator: "line 1",
              excerpt: "Six quizzes across the term"
            }
          ]
        }
      ],
      requirements: [],
      unresolvedIssues: []
    }
  ],
  courseWideConstraintCandidates: [],
  unresolvedIssues: []
};

describe("v0.2.0 core loop", () => {
  let store: LocalStore;
  let machine: FakeMachine;
  let ai: FakeAi;
  let clock: VirtualClock;
  let engine: WorkflowEngine;
  let staging: RebuildStagingStore;

  beforeEach(async () => {
    store = await freshStore();
    machine = new FakeMachine();
    machine.failNext = false;
    ai = new FakeAi();
    clock = new VirtualClock();
    staging = new RebuildStagingStore(memoryStorage());
    engine = engineFor({ store, machine, ai, clock, staging });
  });

  it("runs discovery through review in one start, without manual Continue", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);

    const workflow = await engine.start(course, "initial");
    const resolved = await engine.run(workflow.workflowId);

    expect({ state: resolved.state, detail: resolved.lastErrorDetail }).toEqual({
      state: "waiting",
      detail: undefined
    });
    expect(resolved.waitingReason).toBe("review");

    const snapshot = await store.readSnapshot(course.courseId);
    expect(snapshot?.reviewItems.length).toBeGreaterThan(0);
    expect(snapshot?.assessments.map((item) => item.name)).toContain("Individual Assignment");
    expect(snapshot?.course.established).toBe(false);

    // Task A ran once per Source before Task B, and never before a Source was read.
    const tasks = ai.calls.map((call) => call.task);
    expect(tasks.filter((task) => task === "task-a")).toHaveLength(2);
    expect(tasks.filter((task) => task === "task-b")).toHaveLength(1);
    expect(tasks.indexOf("task-b")).toBeGreaterThan(tasks.lastIndexOf("task-a"));
    // Evidence written for the first Assessment traces back to the Source it came from.
    const evidence = await store.readEvidence(["ev-ia-deadline"]);
    expect(evidence[0]?.sourceId).toBe("src-guide");
  });

  it("sends every successfully captured Source to Task A without a local semantic shortlist", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    machine.sources = [
      {
        sourceId: "src-opaque-native-item",
        title: "Part 1 Group Presentation - Final Submission",
        kind: "course-content-item",
        text: [
          "contentHandler: resource/x-bb-blti-link",
          "contentDetail.resource/x-bb-blti-link.title: Final Submission",
          "genericReadOnlyData.dueDate: 2026-10-21T23:59:00Z"
        ].join("\n")
      }
    ];
    ai.handler = (call) => {
      if (call.task !== "task-a") throw new Error(`UNEXPECTED_CALL:${call.task}`);
      return {
        schema: "syllab.ai.task-a/1",
        sourceId: "src-opaque-native-item",
        sourceResult: "NO_RELEVANT_INFORMATION",
        assessmentDrafts: [],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      };
    };

    const rebuild = await engine.start(course, "rebuild", { tabId: 42 });
    const result = await engine.run(rebuild.workflowId);

    expect(result).toMatchObject({ state: "waiting", waitingReason: "review" });
    expect(ai.calls).toHaveLength(1);
    expect(ai.calls[0]).toMatchObject({ task: "task-a" });
    expect(ai.calls[0]?.user).toContain("resource/x-bb-blti-link");
    expect(ai.calls[0]?.user).toContain("2026-10-21T23:59:00Z");
  });

  it("reports each user-facing stage while the run is still going", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);

    const stages: WorkflowRecord["phase"][] = [];
    const reporting = engineFor({
      store,
      machine,
      ai,
      clock,
      staging,
      onStage: (workflow) => {
        stages.push(workflow.phase);
      }
    });
    const workflow = await reporting.start(course, "initial");
    await reporting.run(workflow.workflowId);

    // §5.2 asks the Scan screen for the real current stage. A surface that hears about the run only
    // when it is over shows its first stage for the whole of it, which is minutes on a real Course.
    // (Gate 3 finding F27.)
    expect(stages.length).toBeGreaterThan(1);
    expect(new Set(stages).size).toBe(stages.length);
    expect(stages[stages.length - 1]).toBe("review");
  });

  it("does not call the provider again when a Source is machine-identical", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
    const first = await engine.start(course, "initial");
    await engine.run(first.workflowId);
    // The first run already persisted the machine representation it observed, which is exactly
    // the baseline a real maintenance check compares against.
    const { sources } = await store.readAllSourceStates(course.courseId);
    expect(sources.every((source) => source.machine !== undefined)).toBe(true);
    ai.calls.length = 0;

    const check = await engine.start({ ...course, established: true }, "check");
    const result = await engine.run(check.workflowId);

    expect({ state: result.state, detail: result.lastErrorDetail }).toEqual({
      state: "complete",
      detail: undefined
    });
    expect(ai.calls).toHaveLength(0);
  });

  it("does not let a cleared Rebuild review block the next Rebuild", async () => {
    const course = { ...courseRecord(), established: true };
    await store.upsertCourse(course);
    const previous: WorkflowRecord = {
      workflowId: "workflow-cleared-rebuild",
      courseId: course.courseId,
      kind: "rebuild",
      state: "waiting",
      phase: "review",
      phaseCursor: "start",
      waitingReason: "review",
      attempt: 0,
      baseCourseRevision: course.currentRevision,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString()
    };
    await store.saveWorkflow(previous);

    const next = await engine.start(course, "rebuild", { tabId: 42 });

    expect(next.workflowId).not.toBe(previous.workflowId);
    expect(next.state).toBe("queued");
    expect(next.returnContext).toEqual({ tabId: 42 });
    expect(await store.readWorkflow(previous.workflowId)).toMatchObject({
      state: "complete",
      phaseCursor: "complete"
    });
  });

  it("treats a failed Source as a Coverage Fact, never as removal", () => {
    const observations: SourceObservationRecord[] = [
      {
        observationId: "obs-1",
        workflowId: "wf-1",
        sourceId: "src-guide",
        courseId: "course-1",
        fetchStatus: "failed",
        parseStatus: "not-attempted",
        comparability: "incomparable",
        recordedAt: NOW.toISOString()
      }
    ];
    const coverage = coverageFromObservations(observations, ["src-guide", "src-quizzes"]);
    expect(coverage.partialCoverage).toBe(true);
    expect(coverage.scopeComplete).toBe(false);
    expect(coverage.failedSourceIds).toContain("src-guide");
    expect(coverage.missingAfterCoverageSourceIds).toHaveLength(0);
  });

  it("does not promote failed coverage with old parsed data and no baseline to new-source", async () => {
    const course: CourseRecord = { ...courseRecord(), established: true };
    await store.upsertCourse(course);
    await store.writeDraft({
      sources: [
        {
          sourceId: "src-guide",
          courseId: course.courseId,
          nativeItemId: "src-guide",
          kind: "attachment",
          title: "Course Guide",
          parsed: { text: "old parsed content", structure: ["old"] },
          updatedAt: NOW.toISOString()
        }
      ]
    });
    machine.sources = [INITIAL_SOURCES[0] as SourceFixture];
    machine.failNext = true;

    const check = await engine.start(course, "check", { tabId: 42 });
    await engine.run(check.workflowId);

    const { observations } = await store.readAllSourceStates(course.courseId);
    const current = observations.find((item) => item.workflowId === check.workflowId);
    expect(current).toMatchObject({ comparability: "incomparable", fetchStatus: "failed" });
    expect(current?.machineComparison).toBeUndefined();
    expect(ai.calls).toHaveLength(0);
  });

  it("refreshes a persisted legacy nativeItemId from the current discovery result", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    await store.writeDraft({
      sources: [
        {
          sourceId: "src-guide",
          courseId: course.courseId,
          nativeItemId: "content:src-guide",
          kind: "course-content-item",
          title: "Stale title",
          updatedAt: NOW.toISOString()
        }
      ]
    });
    machine.sources = [INITIAL_SOURCES[0] as SourceFixture];

    const rebuild = await engine.start(course, "rebuild", { tabId: 42 });
    await engine.step(rebuild);

    const { sources } = await store.readAllSourceStates(course.courseId);
    expect(sources).toContainEqual(
      expect.objectContaining({
        sourceId: "src-guide",
        nativeItemId: "src-guide",
        kind: "attachment",
        title: "Course Guide"
      })
    );
  });

  it("keeps Current State intact when a maintenance run fails", async () => {
    const course: CourseRecord = { ...courseRecord(), established: true, currentRevision: 3 };
    await store.upsertCourse(course);
    await store.writeDraft({
      assessments: [
        {
          assessmentId: "assessment_group",
          courseId: course.courseId,
          role: "assessment",
          kind: "project",
          name: "Group Project",
          aliases: [],
          marks: [],
          createdBy: "ai",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString()
        }
      ]
    });
    machine.failNext = true;

    const check = await engine.start(course, "check");
    await engine.run(check.workflowId);

    const snapshot = await store.readSnapshot(course.courseId);
    expect(snapshot?.assessments.map((item) => item.name)).toEqual(["Group Project"]);
    expect(snapshot?.course.currentRevision).toBe(3);
    expect(snapshot?.changes).toHaveLength(0);
  });

  it("keeps maintenance Task A/B provisional and publishes only a legal Change Review", async () => {
    const course: CourseRecord = { ...courseRecord(), established: true, currentRevision: 4 };
    const currentAssessment = {
      assessmentId: "assessment_live",
      courseId: course.courseId,
      role: "assessment" as const,
      kind: "project" as const,
      name: "Group Project",
      aliases: [],
      marks: [],
      createdBy: "user" as const,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString()
    };
    const oldMachine = await sourceMachineRepresentation({
      sourceId: "src-guide",
      title: "Course Guide",
      sourceType: "attachment",
      text: "old course guide",
      structure: ["old"]
    });
    await store.upsertCourse(course);
    await store.writeDraft({
      assessments: [currentAssessment],
      sources: [
        {
          sourceId: "src-guide",
          courseId: course.courseId,
          nativeItemId: "src-guide",
          kind: "attachment",
          title: "Course Guide",
          machine: oldMachine,
          parsed: { text: "old course guide", structure: ["old"] },
          updatedAt: NOW.toISOString()
        }
      ]
    });
    machine.sources = [INITIAL_SOURCES[0] as SourceFixture];
    ai.handler = (call) => {
      if (call.task === "task-a") return TASK_A_GUIDE;
      if (call.task === "task-b") return TASK_B_MERGED;
      if (call.task === "task-c") {
        const targetObjectId = call.idempotencyKey.split(":").at(-1) ?? "";
        return {
          schema: "syllab.ai.task-c/1",
          changeResults:
            targetObjectId === currentAssessment.assessmentId
              ? [
                  {
                    changeType: "CHANGED",
                    targetObjectId,
                    affectedFieldOrRequirement: "deadline",
                    currentEvidence: [],
                    newEvidence: [],
                    judgmentBasis: "The new source explicitly replaces the deadline."
                  }
                ]
              : [],
          unresolvedIssues: []
        };
      }
      throw new Error(`UNEXPECTED_CALL:${call.task}`);
    };

    const before = await store.readSnapshot(course.courseId);
    const check = await engine.start(course, "check", { tabId: 42 });
    const result = await engine.run(check.workflowId);
    const after = await store.readSnapshot(course.courseId);

    expect(result.state).toBe("waiting");
    expect(after?.assessments).toEqual(before?.assessments);
    expect(after?.facts).toEqual(before?.facts);
    expect(after?.constraints).toEqual(before?.constraints);
    expect(after?.reviewItems).toHaveLength(1);
    expect(after?.reviewItems[0]).toMatchObject({ kind: "change", changeType: "CHANGED" });
    expect(after?.reviewItems.some((item) => item.kind === "initial")).toBe(false);
  });

  it("gives Task C trusted facts, both evidence sets, Task B identity, user state and coverage", async () => {
    const course: CourseRecord = { ...courseRecord(), established: true, currentRevision: 4 };
    const currentAssessment = {
      assessmentId: "assessment_live",
      courseId: course.courseId,
      role: "assessment" as const,
      kind: "project" as const,
      name: "Group Project",
      aliases: [],
      marks: ["Edited" as const],
      createdBy: "user" as const,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString()
    };
    const pendingAssessment = {
      ...currentAssessment,
      assessmentId: "assessment_pending_initial",
      name: "Pending Initial Draft",
      createdBy: "ai" as const
    };
    const excludedAssessment = {
      ...currentAssessment,
      assessmentId: "assessment_excluded_initial",
      name: "Excluded Initial Draft",
      createdBy: "ai" as const
    };
    const oldMachine = await sourceMachineRepresentation({
      sourceId: "src-guide",
      title: "Course Guide",
      sourceType: "attachment",
      text: "old course guide",
      structure: ["old"]
    });
    await store.upsertCourse(course);
    await store.writeDraft({
      assessments: [currentAssessment, pendingAssessment, excludedAssessment],
      facts: [
        {
          factId: "fact-current",
          courseId: course.courseId,
          assessmentId: currentAssessment.assessmentId,
          field: "deadline",
          value: { state: "KNOWN", value: "10 Oct" },
          evidenceRefs: [{ sourceId: "src-guide", locator: "old", evidenceId: "ev-current" }],
          marks: [],
          updatedAt: NOW.toISOString()
        },
        {
          factId: "fact-pending-initial",
          courseId: course.courseId,
          assessmentId: pendingAssessment.assessmentId,
          field: "deadline",
          value: { state: "KNOWN", value: "21 Oct" },
          evidenceRefs: [
            { sourceId: "src-guide", locator: "pending", evidenceId: "ev-pending-initial" }
          ],
          marks: [],
          updatedAt: NOW.toISOString()
        },
        {
          factId: "fact-excluded-initial",
          courseId: course.courseId,
          assessmentId: excludedAssessment.assessmentId,
          field: "deadline",
          value: { state: "KNOWN", value: "22 Oct" },
          evidenceRefs: [
            {
              sourceId: "src-guide",
              locator: "excluded",
              evidenceId: "ev-excluded-initial"
            }
          ],
          marks: [],
          updatedAt: NOW.toISOString()
        }
      ],
      evidence: [
        {
          evidenceId: "ev-current",
          courseId: course.courseId,
          sourceId: "src-guide",
          locator: "old",
          excerpt: "Due 10 Oct",
          capturedAt: NOW.toISOString()
        },
        {
          evidenceId: "ev-pending-initial",
          courseId: course.courseId,
          sourceId: "src-guide",
          locator: "pending",
          excerpt: "Pending draft due 21 Oct",
          capturedAt: NOW.toISOString()
        },
        {
          evidenceId: "ev-excluded-initial",
          courseId: course.courseId,
          sourceId: "src-guide",
          locator: "excluded",
          excerpt: "Excluded draft due 22 Oct",
          capturedAt: NOW.toISOString()
        }
      ],
      reviewItems: [
        {
          reviewItemId: "review-pending-initial",
          courseId: course.courseId,
          workflowId: "workflow-initial",
          kind: "initial",
          targetId: pendingAssessment.assessmentId,
          payload: { assessment: pendingAssessment },
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString()
        }
      ],
      sources: [
        {
          sourceId: "src-guide",
          courseId: course.courseId,
          nativeItemId: "src-guide",
          kind: "attachment",
          title: "Course Guide",
          machine: oldMachine,
          parsed: { text: "old course guide", structure: ["old"] },
          updatedAt: NOW.toISOString()
        }
      ]
    });
    const seeded = await store.readSnapshot(course.courseId);
    if (!seeded) throw new Error("missing seeded course snapshot");
    await store.commitMutation(course.courseId, {
      snapshot: seeded,
      decisions: [
        {
          decisionId: "decision-excluded-initial",
          courseId: course.courseId,
          reviewItemId: "review-excluded-initial",
          kind: "Exclude",
          targetId: excludedAssessment.assessmentId,
          decidedAt: NOW.toISOString()
        }
      ],
      history: []
    });
    machine.sources = [INITIAL_SOURCES[0] as SourceFixture];
    const taskB = {
      ...TASK_B_MERGED,
      identityResolutions: [
        {
          involvedObjectIds: [currentAssessment.assessmentId],
          relationship: "SAME_ASSESSMENT",
          supportingEvidence: [
            {
              evidenceId: "ev-latest",
              sourceId: "src-guide",
              locator: "line 3",
              excerpt: "Group Project 40% due 12 November"
            }
          ],
          contradictoryEvidence: [],
          judgmentBasis: "The source explicitly names the same project."
        }
      ],
      canonicalAssessmentProposals: [
        {
          proposalId: currentAssessment.assessmentId,
          canonicalName: currentAssessment.name,
          type: "project",
          role: "assessment",
          aliases: [],
          consolidatedFields: [
            {
              fieldName: "deadline",
              state: "KNOWN",
              value: "12 Nov",
              evidence: [
                {
                  evidenceId: "ev-latest",
                  sourceId: "src-guide",
                  locator: "line 3",
                  excerpt: "Group Project 40% due 12 November"
                }
              ]
            }
          ],
          requirements: [],
          supportingEvidence: [],
          unresolvedIssues: []
        }
      ],
      structuralRelationships: [{ child: "presentation", parent: currentAssessment.assessmentId }]
    };
    ai.handler = (call) => {
      if (call.task === "task-a") return TASK_A_GUIDE;
      if (call.task === "task-b") return taskB;
      if (call.task === "task-c") {
        return {
          schema: "syllab.ai.task-c/1",
          changeResults: [],
          unresolvedIssues: []
        };
      }
      throw new Error(`UNEXPECTED_CALL:${call.task}`);
    };
    const taskCInputs: Array<Parameters<EngineOptions["buildTaskCCalls"]>[0]> = [];
    const reporting = engineFor({ store, machine, ai, clock, staging, taskCInputs });

    const check = await reporting.start(course, "check", { tabId: 42 });
    await reporting.run(check.workflowId);

    const input = taskCInputs.find(
      (item) => item.target.objectId === currentAssessment.assessmentId
    );
    expect(input?.currentFacts).toEqual([
      { field: "deadline", value: { state: "KNOWN", value: "10 Oct" } }
    ]);
    expect(JSON.stringify(input?.currentFacts)).not.toContain("12 Nov");
    expect(input?.currentEvidence).toMatchObject([
      { evidenceId: "ev-current", excerpt: "Due 10 Oct" }
    ]);
    expect(input?.newEvidence).toMatchObject([
      { evidenceId: "ev-latest", excerpt: "Group Project 40% due 12 November" }
    ]);
    expect(input?.identity).toMatchObject({
      resolutions: [{ relationship: "SAME_ASSESSMENT" }],
      structuralRelationships: [{ child: "presentation" }]
    });
    expect(input?.userState).toMatchObject({ marks: ["Edited"] });
    expect(input?.coverageFacts).toMatchObject({
      checkedSourceIds: ["src-guide"],
      succeededSourceIds: ["src-guide"],
      partialCoverage: false,
      scopeComplete: true
    });
    expect(
      taskCInputs.some(
        (item) =>
          item.target.objectId === pendingAssessment.assessmentId ||
          item.target.objectId === excludedAssessment.assessmentId
      )
    ).toBe(false);
    expect(JSON.stringify(taskCInputs)).not.toContain("ev-pending-initial");
    expect(JSON.stringify(taskCInputs)).not.toContain("ev-excluded-initial");
  });

  it("keeps NEW assessments provisional through CRV-02 and commits only the confirmed one", async () => {
    const course: CourseRecord = { ...courseRecord(), established: true, currentRevision: 4 };
    const currentAssessment = {
      assessmentId: "assessment_live",
      courseId: course.courseId,
      role: "assessment" as const,
      kind: "project" as const,
      name: "Existing Project",
      aliases: [],
      marks: [],
      createdBy: "user" as const,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString()
    };
    const oldMachine = await sourceMachineRepresentation({
      sourceId: "src-guide",
      title: "Course Guide",
      sourceType: "attachment",
      text: "old course guide",
      structure: ["old"]
    });
    await store.upsertCourse(course);
    await store.saveSemester({
      semesterId: course.semesterId,
      nativeSemesterId: course.semesterId,
      label: "AY2026 Semester 1",
      status: "Current",
      discoveredAt: NOW.toISOString(),
      updatedAt: NOW.toISOString()
    });
    await store.writeDraft({
      assessments: [currentAssessment],
      sources: [
        {
          sourceId: "src-guide",
          courseId: course.courseId,
          nativeItemId: "src-guide",
          kind: "attachment",
          title: "Course Guide",
          machine: oldMachine,
          parsed: { text: "old course guide", structure: ["old"] },
          updatedAt: NOW.toISOString()
        }
      ]
    });
    machine.sources = [INITIAL_SOURCES[0] as SourceFixture];
    const taskA = {
      schema: "syllab.ai.task-a/1",
      sourceId: "src-guide",
      sourceResult: "RELEVANT_INFORMATION_FOUND",
      assessmentDrafts: [
        {
          draftId: "new-a",
          name: "New Essay",
          type: "assignment",
          role: "assessment",
          fields: [
            {
              fieldName: "deadline",
              state: "KNOWN",
              value: "20 November",
              evidence: [
                {
                  evidenceId: "ev-new-a",
                  sourceId: "src-guide",
                  locator: "line 2",
                  excerpt: "New Essay due 20 November"
                }
              ]
            }
          ],
          requirements: [],
          unresolvedIssues: []
        },
        {
          draftId: "new-b",
          name: "New Presentation",
          type: "project",
          role: "assessment",
          fields: [
            {
              fieldName: "weight",
              state: "KNOWN",
              value: "10%",
              evidence: [
                {
                  evidenceId: "ev-new-b",
                  sourceId: "src-guide",
                  locator: "line 3",
                  excerpt: "New Presentation 10%"
                }
              ]
            }
          ],
          requirements: [],
          unresolvedIssues: []
        }
      ],
      courseWideConstraintCandidates: [],
      unresolvedIssues: []
    };
    const taskB = {
      ...TASK_B_MERGED,
      canonicalAssessmentProposals: taskA.assessmentDrafts.map((draft) => ({
        proposalId: draft.draftId,
        canonicalName: draft.name,
        type: draft.type,
        role: draft.role,
        aliases: [],
        consolidatedFields: draft.fields,
        requirements: [],
        supportingEvidence: [],
        unresolvedIssues: []
      })),
      identityResolutions: taskA.assessmentDrafts.map((draft) => ({
        involvedObjectIds: [draft.draftId],
        relationship: "DIFFERENT_ASSESSMENT",
        supportingEvidence: draft.fields[0]?.evidence ?? [],
        contradictoryEvidence: [],
        judgmentBasis: "The source names a distinct assessment."
      }))
    };
    ai.handler = (call) => {
      if (call.task === "task-a") return taskA;
      if (call.task === "task-b") return taskB;
      if (call.task === "task-c") {
        const targetObjectId = call.idempotencyKey.split(":").at(-1) ?? "";
        const evidence =
          targetObjectId === "assessment_new-a"
            ? (taskA.assessmentDrafts[0]?.fields[0]?.evidence ?? [])
            : targetObjectId === "assessment_new-b"
              ? (taskA.assessmentDrafts[1]?.fields[0]?.evidence ?? [])
              : [];
        return {
          schema: "syllab.ai.task-c/1",
          changeResults: targetObjectId.startsWith("assessment_new-")
            ? [
                {
                  changeType: "NEW",
                  targetObjectId,
                  affectedFieldOrRequirement: "assessment",
                  currentEvidence: [],
                  newEvidence: evidence,
                  judgmentBasis: "This is a new assessment."
                }
              ]
            : [],
          unresolvedIssues: []
        };
      }
      throw new Error(`UNEXPECTED_CALL:${call.task}`);
    };

    const check = await engine.start(course, "check", { tabId: 42 });
    expect((await engine.run(check.workflowId)).state).toBe("waiting");

    const views = new ViewBuilder({
      store,
      productVersion: "0.2.0",
      now: () => NOW,
      settings: () =>
        Promise.resolve({
          apiKey: { state: "valid" },
          privacy: true,
          apiUsage: true,
          version: "0.2.0"
        })
    });
    const beforeCourse = await views.build({
      surface: "full-page",
      screen: "CRS-01",
      courseId: course.courseId
    });
    expect(beforeCourse.course?.assessments.map((item) => item.name)).toEqual([
      currentAssessment.name
    ]);
    expect(JSON.stringify(beforeCourse.semester?.courses ?? [])).not.toContain("New Essay");
    expect(JSON.stringify(beforeCourse.semester?.courses ?? [])).not.toContain("New Presentation");

    const pending = await store.readSnapshot(course.courseId);
    const newItems = pending?.reviewItems.filter((item) => item.changeType === "NEW") ?? [];
    expect(newItems).toHaveLength(2);
    for (const item of newItems) {
      expect(item.payload).toMatchObject({
        assessment: { assessmentId: item.targetId },
        facts: [{ assessmentId: item.targetId }],
        evidence: [{ sourceId: "src-guide" }]
      });
    }
    const crv = await views.build({
      surface: "full-page",
      screen: "CRV-02",
      courseId: course.courseId
    });
    expect(crv.review?.title).toMatch(/New (Essay|Presentation)/);
    expect(crv.review?.latest?.values[0]?.evidence).toHaveLength(1);

    const handler = new ViewHandler({
      store,
      database: new LocalDatabase(),
      staging,
      session: { get: () => Promise.resolve(undefined), set: () => Promise.resolve() },
      views,
      engine,
      surfaceRoutes: new Map(),
      now: () => NOW,
      driveWorkflow: () => undefined,
      resolveScanTab: () => Promise.resolve(42),
      exportBackup: () => Promise.resolve(),
      exportCalendar: () => Promise.resolve(),
      setApiKey: () => Promise.resolve(),
      validateApiKey: () => Promise.resolve("valid"),
      setAuthorization: () => Promise.resolve(),
      productVersion: "0.2.0"
    });
    const essay = newItems.find((item) => item.targetId === "assessment_new-a");
    const presentation = newItems.find((item) => item.targetId === "assessment_new-b");
    expect(essay).toBeDefined();
    expect(presentation).toBeDefined();
    if (!essay || !presentation) {
      throw new Error("missing NEW review fixtures");
    }
    const confirmed = await handler.handle({
      contract: V2_MESSAGE_CONTRACT,
      type: "MUTATE",
      surface: "full-page",
      courseId: course.courseId,
      expectedRevision: 4,
      mutation: { kind: "ConfirmReviewItem", reviewItemId: essay.reviewItemId }
    });
    expect(confirmed.ok).toBe(true);
    const excluded = await handler.handle({
      contract: V2_MESSAGE_CONTRACT,
      type: "MUTATE",
      surface: "full-page",
      courseId: course.courseId,
      expectedRevision: 5,
      mutation: { kind: "ExcludeReviewItem", reviewItemId: presentation.reviewItemId }
    });
    expect(excluded.ok).toBe(true);

    const trusted = await store.readTrustedSnapshot(course.courseId);
    expect(trusted?.assessments.map((item) => item.name)).toEqual([
      currentAssessment.name,
      "New Essay"
    ]);
    expect(trusted?.facts).toMatchObject([
      { assessmentId: "assessment_new-a", value: { value: "20 November" } }
    ]);
    expect(await store.readEvidence(["ev-new-a"])).toMatchObject([
      { excerpt: "New Essay due 20 November" }
    ]);
    expect(trusted?.changes).toHaveLength(0);
    expect(trusted?.reviewItems).toHaveLength(0);
    const decisions = await store.readDecisions(course.courseId);
    expect(decisions).toHaveLength(2);
    expect(decisions.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["Confirm", "Exclude"])
    );
    expect(await store.readExclusionMemory(course.courseId)).toHaveLength(1);
  });

  it("keeps Rebuild and maintenance staging isolated by workflow", async () => {
    const course: CourseRecord = { ...courseRecord(), established: true };
    await store.upsertCourse(course);
    const rebuild = await engine.start(course, "rebuild", { tabId: 42 });
    await staging.write({
      courseId: course.courseId,
      workflowId: rebuild.workflowId,
      stagedAt: NOW.toISOString(),
      assessments: [
        {
          assessmentId: "assessment_rebuild_only",
          courseId: course.courseId,
          role: "assessment",
          kind: "exam",
          name: "Rebuild Preview Exam",
          aliases: [],
          marks: [],
          createdBy: "ai",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString()
        }
      ],
      constraints: [],
      facts: [],
      evidence: [],
      reviewItems: [],
      changes: []
    });
    machine.sources = [];
    const check = await engine.start(course, "check", { tabId: 42 });
    await engine.run(check.workflowId);

    expect(await staging.read(course.courseId, check.workflowId)).toBeNull();
    expect(await staging.read(course.courseId, rebuild.workflowId)).toMatchObject({
      assessments: [{ assessmentId: "assessment_rebuild_only" }]
    });
  });

  it("stages a Rebuild without touching Current State until it is adopted", async () => {
    const course: CourseRecord = { ...courseRecord(), established: true, currentRevision: 7 };
    await store.upsertCourse(course);
    await store.writeDraft({
      assessments: [
        {
          assessmentId: "assessment_live",
          courseId: course.courseId,
          role: "assessment",
          kind: "project",
          name: "Group Project",
          aliases: [],
          marks: [],
          createdBy: "ai",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString()
        }
      ]
    });
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);

    const rebuild = await engine.start(course, "rebuild");
    await engine.run(rebuild.workflowId);

    // The rebuilt objects exist, but only in staging: Current State is byte-identical.
    const staged = await staging.read(course.courseId, rebuild.workflowId);
    expect(staged?.workflowId).toBe(rebuild.workflowId);
    expect(staged?.assessments.length).toBeGreaterThan(0);

    const live = await store.readSnapshot(course.courseId);
    expect(live?.assessments.map((item) => item.name)).toEqual(["Group Project"]);
    expect(live?.course.currentRevision).toBe(7);
    expect(staged?.taskACoverage?.failedSources).toEqual([]);
    expect(staged?.taskACoverage?.relevantSourceIds).toEqual(
      expect.arrayContaining(["src-guide", "src-quizzes"])
    );
  });

  it("continues a Rebuild with successful Sources after one Source terminally fails Task A", async () => {
    const course: CourseRecord = { ...courseRecord(), established: true, currentRevision: 7 };
    await store.upsertCourse(course);
    await store.writeDraft({
      assessments: [
        {
          assessmentId: "assessment_live",
          courseId: course.courseId,
          role: "assessment",
          kind: "project",
          name: "Trusted Current Project",
          aliases: [],
          marks: [],
          createdBy: "user",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString()
        }
      ]
    });
    ai.handler = (call) => {
      if (call.task === "task-a" && call.user.includes("Six quizzes across the term")) {
        throw new DeepSeekFailure("AI_CONTRACT", true, "truncated");
      }
      if (call.task === "task-a") return TASK_A_GUIDE;
      if (call.task === "task-b") return TASK_B_MERGED;
      throw new Error(`UNEXPECTED_CALL:${call.task}`);
    };

    const rebuild = await engine.start(course, "rebuild", { tabId: 42 });
    const preview = await engine.run(rebuild.workflowId);

    expect(preview).toMatchObject({ state: "waiting", waitingReason: "review" });
    const staged = await staging.read(course.courseId, rebuild.workflowId);
    expect(staged?.taskACoverage).toEqual({
      succeededSourceIds: ["src-guide"],
      relevantSourceIds: ["src-guide"],
      failedSources: [{ sourceId: "src-quizzes", errorCode: "AI_CONTRACT" }]
    });
    expect(staged?.assessments.length).toBeGreaterThan(0);
    expect(staged?.facts.length).toBeGreaterThan(0);
    expect(
      staged?.facts.every((fact) =>
        fact.evidenceRefs.every((reference) => reference.sourceId !== "src-quizzes")
      )
    ).toBe(true);
    expect(staged?.evidence.every((item) => item.sourceId !== "src-quizzes")).toBe(true);
    expect(
      (await store.readSnapshot(course.courseId))?.assessments.map((item) => item.name)
    ).toEqual(["Trusted Current Project"]);
    expect(
      await store.findAiRun(`task-a-terminal:${rebuild.workflowId}:src-quizzes`)
    ).toMatchObject({ status: "failed", sourceId: "src-quizzes", errorCode: "AI_CONTRACT" });
  });

  it("recovers terminal Task A units once after the normal source pass", async () => {
    const course: CourseRecord = { ...courseRecord(), established: true, currentRevision: 7 };
    await store.upsertCourse(course);
    let quizInitialAttempts = 0;
    ai.handler = (call) => {
      if (
        call.task === "task-a" &&
        call.user.includes("Six quizzes across the term") &&
        !call.idempotencyKey.startsWith("task-a-recovery:")
      ) {
        quizInitialAttempts += 1;
        throw new DeepSeekFailure("AI_CONTRACT", true, "schema mismatch");
      }
      if (call.task === "task-a") {
        return call.user.includes("Six quizzes across the term") ? TASK_A_QUIZZES : TASK_A_GUIDE;
      }
      if (call.task === "task-b") return TASK_B_MERGED;
      throw new Error(`UNEXPECTED_CALL:${call.task}`);
    };

    const rebuild = await engine.start(course, "rebuild", { tabId: 42 });
    const preview = await engine.run(rebuild.workflowId);

    expect(preview).toMatchObject({ state: "waiting", waitingReason: "review" });
    expect(quizInitialAttempts).toBe(1);
    expect(
      ai.calls
        .filter((call) => call.idempotencyKey.startsWith("task-a-recovery:"))
        .map((call) => call.task)
    ).toEqual(["task-a"]);
    const staged = await staging.read(course.courseId, rebuild.workflowId);
    expect(staged?.taskACoverage?.failedSources).toEqual([]);
    expect(staged?.taskACoverage?.succeededSourceIds).toEqual(
      expect.arrayContaining(["src-guide", "src-quizzes"])
    );
    expect(
      await store.findAiRun(`task-a-terminal:${rebuild.workflowId}:src-quizzes`)
    ).toMatchObject({ status: "failed", sourceId: "src-quizzes" });
  });

  it("keeps a Rebuild failed when every relevant Source terminally fails Task A", async () => {
    const course: CourseRecord = { ...courseRecord(), established: true, currentRevision: 7 };
    await store.upsertCourse(course);
    ai.handler = (call) => {
      if (call.task === "task-a") {
        throw new DeepSeekFailure("AI_CONTRACT", true, "truncated");
      }
      throw new Error(`UNEXPECTED_CALL:${call.task}`);
    };

    const rebuild = await engine.start(course, "rebuild", { tabId: 42 });
    const failed = await engine.run(rebuild.workflowId);

    expect(failed).toMatchObject({ state: "failed", errorCode: "AI_CONTRACT", attempt: 1 });
    const staged = await staging.read(course.courseId, rebuild.workflowId);
    expect(staged?.assessments).toEqual([]);
    expect(staged?.facts).toEqual([]);
    expect(staged?.evidence).toEqual([]);
    expect(staged?.taskACoverage?.relevantSourceIds).toEqual([]);
    expect(staged?.taskACoverage?.failedSources.map((item) => item.sourceId)).toEqual([
      "src-guide",
      "src-quizzes"
    ]);
  });

  it("discards a late AI completion after the workflow lease is superseded", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    machine.sources = [INITIAL_SOURCES[0] as SourceFixture];
    let release: ((result: { call: TestCall; value: unknown }) => void) | undefined;
    ai.execute = (call, _apiKey, context) => {
      ai.calls.push({ ...call, context });
      return new Promise((resolve) => {
        release = resolve;
      });
    };

    const rebuild = await engine.start(course, "rebuild", { tabId: 42 });
    const running = engine.run(rebuild.workflowId);
    await vi.waitFor(() => expect(ai.calls).toHaveLength(1));
    const claimed = await store.readWorkflow(rebuild.workflowId);
    if (!claimed) throw new Error("WORKFLOW_MISSING");
    await store.saveWorkflow({
      ...claimed,
      state: "waiting",
      waitingReason: "review"
    });
    release?.({ call: ai.calls[0] as TestCall, value: TASK_A_GUIDE });

    const result = await running;
    expect(result.state).toBe("waiting");
    expect(await store.findAiRun(ai.calls[0]?.idempotencyKey ?? "missing")).toBeNull();
    expect(await staging.read(course.courseId, rebuild.workflowId)).toBeNull();
  });

  it("accepts a long AI completion after the recovery lease timestamp when ownership is unchanged", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    machine.sources = [INITIAL_SOURCES[0] as SourceFixture];
    let release: ((result: { call: TestCall; value: unknown }) => void) | undefined;
    let delayFirst = true;
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
    ai.execute = (call, _apiKey, context) => {
      ai.calls.push({ ...call, context });
      if (delayFirst) {
        return new Promise((resolve) => {
          release = resolve;
        });
      }
      return Promise.resolve({ call, value: structuredClone(ai.handler(call)) });
    };

    const rebuild = await engine.start(course, "rebuild", { tabId: 42 });
    const running = engine.run(rebuild.workflowId);
    await vi.waitFor(() => expect(ai.calls).toHaveLength(1));
    // The recovery timestamp is not a deadline for work that still owns the same generation.
    clock.advance(11 * 60_000);
    delayFirst = false;
    release?.({ call: ai.calls[0] as TestCall, value: TASK_A_GUIDE });

    const result = await running;
    expect(result.state).toBe("waiting");
    expect(await store.findAiRun(ai.calls[0]?.idempotencyKey ?? "missing")).toMatchObject({
      status: "succeeded"
    });
    expect((await staging.read(course.courseId, rebuild.workflowId))?.assessments).toHaveLength(2);
  });

  it("supersedes a pending change instead of stacking two", async () => {
    const snapshot = {
      course: { ...courseRecord(), established: true, currentRevision: 1 },
      assessments: [],
      constraints: [],
      facts: [
        {
          factId: "fact-deadline",
          courseId: "course-1",
          assessmentId: "assessment_group",
          field: "deadline",
          value: { state: "KNOWN" as const, value: "10 Oct" },
          evidenceRefs: [],
          marks: [],
          updatedAt: NOW.toISOString()
        }
      ],
      changes: [
        {
          changeId: "change-1",
          courseId: "course-1",
          workflowId: "wf-1",
          targetId: "assessment_group",
          field: "deadline",
          changeType: "CHANGED" as const,
          currentValue: { state: "KNOWN" as const, value: "10 Oct" },
          latestValue: { state: "KNOWN" as const, value: "15 Oct" },
          currentEvidenceIds: [],
          newEvidenceIds: [],
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString()
        }
      ],
      reviewItems: [],
      history: []
    };
    const { mergePendingChanges } = await import("./workflow");
    const merged = mergePendingChanges(
      snapshot.changes,
      [
        {
          changeId: "change-2",
          courseId: "course-1",
          workflowId: "wf-1",
          targetId: "assessment_group",
          field: "deadline",
          changeType: "CHANGED",
          currentValue: { state: "KNOWN", value: "10 Oct" },
          latestValue: { state: "KNOWN", value: "18 Oct" },
          currentEvidenceIds: [],
          newEvidenceIds: [],
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString()
        }
      ],
      NOW.toISOString()
    );
    expect(merged.changes).toHaveLength(1);
    expect(merged.changes[0]?.latestValue?.value).toBe("18 Oct");
    expect(merged.changes[0]?.currentValue?.value).toBe("10 Oct");
  });

  it("protects trusted state when a decision arrives with a stale revision", () => {
    const snapshot = {
      course: { ...courseRecord(), established: true, currentRevision: 5 },
      assessments: [],
      constraints: [],
      facts: [],
      changes: [],
      reviewItems: [],
      history: []
    };
    expect(() =>
      acceptChange(snapshot, { changeId: "change-1", expectedRevision: 4, now: NOW.toISOString() })
    ).toThrow();
    expect(() =>
      keepCurrent(snapshot, { changeId: "change-1", expectedRevision: 4, now: NOW.toISOString() })
    ).toThrow();
  });
});

/**
 * The retry schedule a parked run is on.
 *
 * A step that fails recoverably parks as `saved`, which renders as `Progress saved.` — a screen
 * with no action on it. The schedule was counted but never kept: nothing was awake at the moment it
 * elapsed, so the run waited for the next browser start. Naming the moment is what lets an alarm be
 * booked for it. (Gate 3 finding F31.)
 */
describe("the retry schedule", () => {
  const parked = (overrides: Partial<WorkflowRecord>): WorkflowRecord => ({
    workflowId: "wf-1",
    courseId: "course-1",
    kind: "initial",
    state: "saved",
    phase: "task-a",
    phaseCursor: "start",
    attempt: 1,
    baseCourseRevision: 0,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides
  });

  it("names the moment a parked run becomes due", () => {
    expect(retryDueAt(parked({ attempt: 1 }))).toBe(NOW.getTime() + 5 * 60_000);
    expect(retryDueAt(parked({ attempt: 2 }))).toBe(NOW.getTime() + 30 * 60_000);
    expect(retryDueAt(parked({ attempt: 3 }))).toBe(NOW.getTime() + 2 * 60 * 60_000);
  });

  it("schedules an owned run at its recovery timestamp and an unclaimed run immediately", () => {
    expect(
      retryDueAt(
        parked({
          state: "working",
          lease: { token: "lease-1", expiresAt: new Date(NOW.getTime() + 10_000).toISOString() }
        })
      )
    ).toBe(NOW.getTime() + 10_000);
    expect(retryDueAt(parked({ state: "working" }))).toBe(0);
    expect(retryDueAt(parked({ state: "queued" }))).toBe(0);
  });

  it("has nothing to schedule for a run that is not parked on a delay", () => {
    expect(retryDueAt(parked({ state: "failed" }))).toBeNull();
    expect(retryDueAt(parked({ state: "waiting", waitingReason: "review" }))).toBeNull();
  });

  it("agrees with itself about whether that moment has arrived", () => {
    const record = parked({ attempt: 1 });
    expect(retryDue(record, new Date(NOW.getTime() + 5 * 60_000 - 1))).toBe(false);
    expect(retryDue(record, new Date(NOW.getTime() + 5 * 60_000))).toBe(true);
  });
});
