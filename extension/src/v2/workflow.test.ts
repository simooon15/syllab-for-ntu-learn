import { DEFERRAL_SCHEMA, type TeachingInput, type TeachingResult } from "./teaching-deferral";
import {
  ROUTING_SCHEMA,
  type RoutingInput,
  type ExhaustiveRoutingResult
} from "./exhaustive-routing";
import { AUDIT_SCHEMA, type CoverageAuditInput } from "./coverage-audit";
import { stableDigest } from "./chunking";
import type { CourseContentIndex, NativeExpansion, PlannerResult } from "./retrieval-planner";
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
import { AiUnitFailure } from "./deepseek-complete";
import type { FactRecord } from "./schema";
import { SELECTIVE_COURSE_SCHEMA, type Clause } from "./selective-course";

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
  requestVisualInFixtures = false;
  key: string | null = "test-key";
  privacy = true;
  usage = true;
  plannerHandler: (call: TestCall) => PlannerResult = (call) => {
    const { index, expanded } = JSON.parse(call.user) as {
      index: CourseContentIndex;
      expanded: NativeExpansion[];
    };
    const refs = [
      ...index.units.map((u) => u[0]),
      ...index.sources
        .filter((row) => !row.unitCount && row.nativeCharacters > 0)
        .map((row) => row.ref)
    ];
    const read = new Set(expanded.map((row) => row.ref));
    const pending = refs.filter((ref) => !read.has(ref));
    const visual = index.units.filter((unit) => unit[7].length && read.has(unit[0]));
    return {
      schema: call.schemaVersion as PlannerResult["schema"],
      status: pending.length ? "CONTINUE" : "COMPLETE",
      requestRefs: pending,
      selectedEvidenceRefs: pending.length ? [] : refs,
      removedSelectedRefs: [],
      visualRequestRefs: pending.length ? [] : visual.map((u) => u[0]),
      uncertainRefs: []
    };
  };
  auditHandler = (call: TestCall) => {
    const input = JSON.parse(call.user) as CoverageAuditInput;
    return {
      schema: AUDIT_SCHEMA,
      status: "COVERAGE_COMPLETE",
      requestRefs: [],
      uncertainRefs: [],
      coveredWithoutExpansion: input.unreadRefs.length
        ? [
            {
              refs: input.unreadRefs,
              reason: "Synthetic fixture has no additional product evidence"
            }
          ]
        : []
    };
  };
  routingHandler: (call: TestCall) => ExhaustiveRoutingResult = (call) => {
    const { index, entryRefs } = JSON.parse(call.user) as RoutingInput;
    return {
      schema: ROUTING_SCHEMA,
      decisions: entryRefs.map((ref) => [
        ref,
        index.units.some((u) => u[0] === ref) ||
        index.sources.some((row) => row.ref === ref && row.nativeCharacters > 0)
          ? "EXPAND"
          : "SKIP"
      ])
    };
  };
  teachingHandler: (call: TestCall) => TeachingResult = (call) => ({
    schema: DEFERRAL_SCHEMA,
    sources: (JSON.parse(call.user) as TeachingInput).profiles.map((p) => ({
      sourceId: p.sourceId,
      classification: "PROCESS",
      evidenceUsed: ["synthetic profile"],
      rationale: "synthetic management fixture"
    }))
  });
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
    return Promise.resolve({
      call,
      value: structuredClone(
        this.requestVisualInFixtures &&
          call.task.startsWith("task-a") &&
          (context as { allowedVisualRequestRefs?: Set<string> }).allowedVisualRequestRefs?.size
          ? {
              ...(this.handler(call) as Record<string, unknown>),
              visualRequestRefs: [
                ...(context as { allowedVisualRequestRefs: Set<string> }).allowedVisualRequestRefs
              ]
            }
          : call.task === "teaching-classification"
            ? this.teachingHandler(call)
            : call.task === "exhaustive-routing"
              ? this.routingHandler(call)
              : call.task === "retrieval-planner"
                ? this.plannerHandler(call)
                : call.task === "coverage-audit"
                  ? this.auditHandler(call)
                  : this.handler(call)
      )
    });
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
  machine: MachinePort;
  ai: FakeAi;
  clock: VirtualClock;
  staging: RebuildStagingStore;
  newArchitecture?: boolean;
  directCourse?: boolean;
  selectiveCourse?: boolean;
  projectedCourse?: boolean;
  allowQaAcceptance?: boolean;
  qaValidateRouting?: EngineOptions["qaValidateRouting"];
  onStage?: (workflow: WorkflowRecord) => void;
  onTaskBInput?: (input: Parameters<EngineOptions["buildTaskBCalls"]>[0]) => void;
  taskCInputs?: Array<Parameters<EngineOptions["buildTaskCCalls"]>[0]>;
}): WorkflowEngine {
  const engineOptions: EngineOptions = {
    ...(options.newArchitecture ? { newArchitecture: true } : {}),
    ...(options.directCourse ? { directCourse: true } : {}),
    ...(options.selectiveCourse ? { selectiveCourse: true } : {}),
    ...(options.projectedCourse ? { projectedCourse: true } : {}),
    ...(options.qaValidateRouting ? { qaValidateRouting: options.qaValidateRouting } : {}),
    ...(options.allowQaAcceptance !== undefined
      ? { allowQaAcceptance: options.allowQaAcceptance }
      : {}),
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
    buildTaskBCalls: (input) => {
      options.onTaskBInput?.(input);
      return [
        {
          task: "task-b",
          schemaVersion: "syllab.ai.task-b/1",
          promptVersion: "task-b/1",
          idempotencyKey: "b",
          maxTokens: 16000,
          system: "PROMPT_B",
          user: ""
        }
      ];
    },
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
          user: options.newArchitecture ? JSON.stringify(input) : ""
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

  it("retries only a permission-denied Source after restart without losing completed observations", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    const fetch = machine.fetchAndParse.bind(machine);
    let granted = false;
    let blocked = false;
    const reads: string[] = [];
    machine.missingPermissionOrigins = () =>
      Promise.resolve(blocked && !granted ? ["https://files.example.test"] : []);
    machine.fetchAndParse = async (source) => {
      reads.push(source.sourceId);
      const result = await fetch(source);
      if (source.sourceId === "src-quizzes" && !granted) {
        blocked = true;
        return {
          ...result,
          text: "",
          structure: [],
          fetchStatus: "permission-denied",
          parseStatus: "not-attempted",
          errorCode: "HOST_PERMISSION_REQUIRED"
        };
      }
      return result;
    };
    const started = await engine.start(course, "initial");
    await engine.run(started.workflowId);
    const before = await store.readAllSourceStates(course.courseId);
    const completed = before.observations.find((row) => row.sourceId === "src-guide");
    expect(completed?.fetchStatus).toBe("ok");
    expect(before.observations.find((row) => row.sourceId === "src-quizzes")?.fetchStatus).toBe(
      "permission-denied"
    );
    expect(ai.calls).toHaveLength(0);
    granted = true;
    const saved = await store.readWorkflow(started.workflowId);
    if (!saved) throw new Error("WORKFLOW_MISSING");
    const { waitingReason: _waitingReason, ...carried } = saved;
    await store.saveWorkflow({
      ...carried,
      state: "saved",
      userRetryAuthorized: true
    });
    engine = engineFor({ store, machine, ai, clock, staging });
    const resumed = await store.readWorkflow(started.workflowId);
    if (!resumed) throw new Error("WORKFLOW_MISSING");
    await engine.step(resumed);
    const after = await store.readAllSourceStates(course.courseId);
    expect(reads).toEqual(["src-guide", "src-quizzes", "src-quizzes"]);
    expect(after.observations.find((row) => row.sourceId === "src-guide")).toEqual(completed);
    expect(after.observations.find((row) => row.sourceId === "src-quizzes")?.fetchStatus).toBe(
      "ok"
    );
    expect(after.observations).toHaveLength(2);
    expect(ai.calls).toHaveLength(0);
  });

  it("keeps AI-excluded inventory and skips its rendering / Task A", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    let bInput: Parameters<EngineOptions["buildTaskBCalls"]>[0] | undefined;
    engine = engineFor({
      store,
      machine,
      ai,
      clock,
      staging,
      onTaskBInput: (input) => {
        bInput = input;
      }
    });
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
    const base = ai.teachingHandler;
    ai.teachingHandler = (call) => {
      const response = base(call);
      response.sources = response.sources.map((row) =>
        row.sourceId === "src-guide"
          ? { ...row, classification: "TEACHING_MATERIAL_DEFERRED" }
          : row
      );
      return response;
    };
    const fetchAndParse = machine.fetchAndParse.bind(machine);
    machine.fetchAndParse = async (source) => {
      const fetched = await fetchAndParse(source);
      return source.sourceId === "src-guide"
        ? {
            ...fetched,
            units: [
              {
                locator: "page:1",
                text: fetched.text,
                partial: true,
                visualGaps: ["unrepresented-image-region"]
              }
            ]
          }
        : fetched;
    };
    const renderer = vi.fn();
    (machine as MachinePort).visualParts = renderer;
    const run = await engine.start(course, "initial");
    await engine.run(run.workflowId);
    expect(renderer).not.toHaveBeenCalled();
    expect(bInput?.availableEvidenceRefs?.some((ref) => ref.sourceId === "src-guide")).toBe(false);
    expect(ai.calls.filter((call) => call.task === "task-a")).toHaveLength(1);
    expect(ai.calls.find((call) => call.task === "task-a")?.user).toContain("Six quizzes");
    const { sources } = await store.readAllSourceStates(course.courseId);
    expect(sources).toHaveLength(2);
    expect(sources.every((source) => source.machine && source.parsed)).toBe(true);
    expect(
      sources.find((source) => source.sourceId === "src-guide")?.teaching?.result.classification
    ).toBe("TEACHING_MATERIAL_DEFERRED");
    expect(
      sources.find((source) => source.sourceId === "src-guide")?.parsed?.units?.[0]?.partial
    ).toBe(true);
    expect(ai.calls.some((call) => call.task === "exhaustive-routing")).toBe(false);
  });

  it("replans unchanged Check after policy change and shares validated scope with Rebuild", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
    const initial = await engine.start(course, "initial");
    await engine.run(initial.workflowId);
    const { sources } = await store.readAllSourceStates(course.courseId);
    const source = sources[0];
    if (!source?.teaching) throw new Error("ROUTING_MISSING");
    source.teaching.policyVersion = "old-policy";
    await store.writeDraft({ sources: [source] });
    ai.calls.length = 0;
    const check = await engine.start({ ...course, established: true }, "check");
    await engine.run(check.workflowId);
    expect(ai.calls.filter((call) => call.task === "teaching-classification")).toHaveLength(1);
    ai.calls.length = 0;
    const rebuild = await engine.start(course, "rebuild");
    await engine.run(rebuild.workflowId);
    expect(ai.calls.filter((call) => call.task === "retrieval-planner")).toHaveLength(0);
    expect(ai.calls.filter((call) => call.task === "task-a")).toHaveLength(2);
  });

  it("blocks a failed fresh Discovery from falling back to historical inventory and paid processing", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
    const initial = await engine.start(course, "initial");
    await engine.run(initial.workflowId);
    const before = await store.readAllSourceStates(course.courseId);
    ai.calls.length = 0;
    const guarded = engineFor({
      store,
      machine: {
        discover: () =>
          Promise.resolve({
            sources: [],
            coverage: {
              status: "Failed" as const,
              pagesProcessed: 0,
              issueCodes: ["API_REQUEST_FAILED"]
            }
          }),
        fetchAndParse: machine.fetchAndParse.bind(machine),
        missingPermissionOrigins: machine.missingPermissionOrigins.bind(machine)
      },
      ai,
      clock,
      staging,
      allowQaAcceptance: true
    });
    const fresh = await guarded.start(course, "rebuild", { qaSemanticClean: true });
    const outcome = await guarded.run(fresh.workflowId);
    expect(outcome).toMatchObject({
      state: "failed",
      phase: "discover",
      errorCode: "DISCOVERY_INCOMPLETE"
    });
    expect(ai.calls).toHaveLength(0);
    expect(await store.readAllSourceStates(course.courseId)).toEqual(before);
    expect(await store.readMetadataValue(`discovery-coverage:${fresh.workflowId}`)).toMatchObject({
      status: "Failed",
      sourceCount: 0
    });
  });

  it("permits isolated QA clean Initial only for new policy and an unestablished Course", async () => {
    const course = { ...courseRecord(), established: false };
    await store.upsertCourse(course);
    const allowed = engineFor({
      store,
      machine,
      ai,
      clock,
      staging,
      allowQaAcceptance: true,
      newArchitecture: true
    });
    const created = await allowed.start(course, "initial", { qaSemanticClean: true });
    expect(created.qaSemanticClean).toBe(true);
    expect(created.architecturePolicy).toBe("source_registry_group/1");
    expect(ai.calls).toHaveLength(0);
    await expect(
      allowed.start({ ...course, established: true }, "initial", { qaSemanticClean: true })
    ).rejects.toThrow("QA_ACCEPTANCE_UNAVAILABLE");
    await expect(allowed.start(course, "check", { qaSemanticClean: true })).rejects.toThrow(
      "QA_ACCEPTANCE_UNAVAILABLE"
    );
  });

  it("isolates QA clean Rebuild from historical semantics and preserves trusted state and history", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
    const initial = await engine.start(course, "initial");
    await engine.run(initial.workflowId);
    const oldWorkflow = await store.readWorkflow(initial.workflowId);
    const trusted = await store.readSnapshot(course.courseId);
    await expect(engine.start(course, "rebuild", { qaSemanticClean: true })).rejects.toThrow(
      "QA_ACCEPTANCE_UNAVAILABLE"
    );
    // An explicitly authorized clean identity preserves parked Review rather than reusing it.
    const allowed = engineFor({ store, machine, ai, clock, staging, allowQaAcceptance: true });
    if (!oldWorkflow) throw new Error("WORKFLOW_MISSING");
    const historical = await store.readWorkflow(initial.workflowId);
    await store.saveWorkflow({ ...oldWorkflow, state: "working" });
    await expect(allowed.start(course, "rebuild", { qaSemanticClean: true })).rejects.toThrow(
      "QA_ACCEPTANCE_ACTIVE_WORKFLOW"
    );
    await store.saveWorkflow(oldWorkflow);
    ai.calls.length = 0;
    const fresh = await allowed.start(course, "rebuild", { qaSemanticClean: true });
    const result = await allowed.run(fresh.workflowId);
    expect(result).toMatchObject({ state: "waiting", phase: "review", qaSemanticClean: true });
    expect(fresh.workflowId).not.toBe(initial.workflowId);
    expect(ai.calls.filter((c) => c.task === "teaching-classification")).toHaveLength(1);
    expect(ai.calls.filter((c) => c.task === "task-a")).toHaveLength(2);
    expect(ai.calls.filter((c) => c.task === "task-b")).toHaveLength(1);
    expect(ai.calls.some((c) => c.task === "task-c")).toBe(false);
    expect(await store.readWorkflow(initial.workflowId)).toEqual(historical);
    expect(await store.readSnapshot(course.courseId)).toEqual(trusted);
  });

  it.each([false, true])(
    "preserves historical coverage and respects fresh parser baseline in clean=%s",
    async (clean) => {
      ai.requestVisualInFixtures = true;
      const course = courseRecord();
      await store.upsertCourse(course);
      const source: SourceRecord = {
        sourceId: "src-guide",
        nativeItemId: "src-guide",
        courseId: course.courseId,
        title: "Guide",
        kind: "attachment",
        updatedAt: "before",
        parsed: {
          text: "Historical",
          structure: [],
          contentHash: "same",
          visualCoverageHash: "same"
        }
      };
      await store.writeDraft({ sources: [source] });
      const fetch = machine.fetchAndParse.bind(machine);
      machine.fetchAndParse = async (row) =>
        row.sourceId === source.sourceId
          ? {
              ...(await fetch(row)),
              parseStatus: "partial",
              contentHash: "same",
              units: [
                {
                  locator: "page:1",
                  text: INITIAL_SOURCES[0]?.text ?? "",
                  partial: true,
                  visualGaps: ["image"]
                }
              ]
            }
          : fetch(row);
      const allowed = engineFor({ store, machine, ai, clock, staging, allowQaAcceptance: true });
      const workflow = await allowed.start(
        course,
        "rebuild",
        clean ? { qaSemanticClean: true } : {}
      );
      // Ingest only, so historical completion cannot be confused with current visual completion.
      let current = workflow;
      while (current.phase !== "task-a") {
        const step = await allowed.step(current);
        current = step.workflow;
      }
      const state = await store.readAllSourceStates(course.courseId);
      const fresh = state.sources.find((row) => row.sourceId === source.sourceId);
      const observation = state.observations.find(
        (row) => row.workflowId === workflow.workflowId && row.sourceId === source.sourceId
      );
      expect(observation?.parseStatus).toBe(clean ? "partial" : "ok");
      expect(fresh?.parsed?.visualCoverageHash).toBe(clean ? undefined : "same");
      expect(fresh?.parsed?.units?.[0]?.partial).toBe(true);
      if (clean)
        expect(
          (await store.readMetadata())[
            `qa.coverage-history:${workflow.workflowId}:${stableDigest(source.sourceId)}`
          ]
        ).toMatchObject({ historicalParsed: source.parsed });
      expect(
        state.observations.find(
          (row) => row.workflowId === workflow.workflowId && row.sourceId === "src-quizzes"
        )?.parseStatus
      ).toBe("ok");
      if (clean) {
        (machine as MachinePort).visualParts = () =>
          Promise.resolve({
            parts: [{ locator: "page:1", dataUrl: "data:image/png;base64,AAAA" }],
            unresolved: []
          });
        ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
        await allowed.run(workflow.workflowId);
        const completed = await store.readAllSourceStates(course.courseId);
        expect(
          completed.observations.find(
            (row) => row.workflowId === workflow.workflowId && row.sourceId === source.sourceId
          )?.parseStatus
        ).toBe("ok");
        expect(
          completed.sources.find((row) => row.sourceId === source.sourceId)?.parsed
            ?.visualCoverageHash
        ).toBe("same");
      }
    }
  );

  it("stops invalid Source classification before Task A or visual dispatch", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    ai.teachingHandler = () => ({ schema: DEFERRAL_SCHEMA, sources: [] });
    const workflow = await engine.start(course, "initial");
    const result = await engine.run(workflow.workflowId);
    expect(result).toMatchObject({ state: "failed", errorCode: "AI_CONTRACT" });
    expect(
      ai.calls.filter((call) => call.task.startsWith("task-a") || call.task === "task-b")
    ).toEqual([]);
    expect(ai.calls.filter((call) => call.task === "teaching-classification")).toHaveLength(1);
  });

  it("reuses successful classification after checkpoint persistence interruption without another model call", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
    const write = store.writeDraft.bind(store);
    let interrupted = false;
    store.writeDraft = async (bundle) => {
      if (
        !interrupted &&
        bundle.sources?.some((source) => source.sourceId === "src-guide" && source.teaching)
      ) {
        interrupted = true;
        throw new Error("SYNTHETIC_CHECKPOINT_INTERRUPTION");
      }
      await write(bundle);
    };
    const workflow = await engine.start(course, "initial");
    await engine.run(workflow.workflowId);
    clock.advance(6 * 60_000);
    const failed = await store.readWorkflow(workflow.workflowId);
    if (!failed) throw new Error("fixture missing");
    await store.saveWorkflow({ ...failed, state: "saved", userRetryAuthorized: true });
    await engine.run(workflow.workflowId);
    expect(ai.calls.filter((call) => call.task === "teaching-classification")).toHaveLength(1);
    const { sources } = await store.readAllSourceStates(course.courseId);
    expect(
      sources.filter((source) => source.kind === "attachment").every((source) => source.teaching)
    ).toBe(true);
  });

  it("passes file-level context and uncertainty from A to B without raw A conversation", async () => {
    let bInput: Parameters<EngineOptions["buildTaskBCalls"]>[0] | undefined;
    engine = engineFor({
      store,
      machine,
      ai,
      clock,
      staging,
      onTaskBInput: (input) => {
        bInput = input;
      }
    });
    const guide = {
      ...TASK_A_GUIDE,
      fileContext: "Assessment definitions in the course guide",
      identityContext: "Written report and presentation are project components",
      unresolvedIssues: ["Presentation date not specified"]
    };
    ai.handler = fixtureFor([guide, TASK_A_QUIZZES], TASK_B_MERGED);
    const course = courseRecord();
    await store.upsertCourse(course);
    const workflow = await engine.start(course, "initial");
    await engine.run(workflow.workflowId);
    expect(bInput?.sharedWorkingContexts).toContainEqual(
      expect.objectContaining({
        sourceId: "src-guide",
        fileContext: guide.fileContext,
        identityContext: guide.identityContext,
        unresolvedIssues: guide.unresolvedIssues
      })
    );
    expect(JSON.stringify(bInput?.sharedWorkingContexts)).not.toContain(INITIAL_SOURCES[0]?.text);
  });

  it("overlaps model calls for multi-page visual files with rendering released before provider completion", async () => {
    machine.sources = machine.sources.map((source) => ({ ...source, kind: "attachment" }));
    const fetch = machine.fetchAndParse.bind(machine);
    let renders = 0,
      renderPeak = 0,
      calls = 0,
      callPeak = 0;
    let releaseRenders!: () => void;
    let releaseCalls!: () => void;
    const renderBarrier = new Promise<void>((resolve) => {
      releaseRenders = resolve;
    });
    const callBarrier = new Promise<void>((resolve) => {
      releaseCalls = resolve;
    });
    const expectedSources = machine.sources.length;
    const visualMachine: MachinePort = {
      discover: machine.discover.bind(machine),
      missingPermissionOrigins: machine.missingPermissionOrigins,
      fetchAndParse: async (source) => ({
        ...(await fetch(source)),
        parseStatus: "partial",
        contentHash: "synthetic-hash",
        units: [1, 2, 3].map((n) => ({
          locator: `page:${String(n)}`,
          text:
            source.sourceId === "src-guide"
              ? (INITIAL_SOURCES[0]?.text ?? "")
              : (INITIAL_SOURCES[1]?.text ?? ""),
          partial: true,
          visualGaps: ["image"]
        }))
      }),
      visualParts: async () => {
        renderPeak = Math.max(renderPeak, ++renders);
        if (renders === expectedSources) releaseRenders();
        await renderBarrier;
        renders--;
        return {
          parts: [1, 2, 3].map((n) => ({
            locator: `page:${String(n)}`,
            dataUrl: "data:image/png;base64,synthetic"
          })),
          unresolved: []
        };
      }
    };
    const execute = ai.execute.bind(ai);
    ai.execute = async (call, key, context) => {
      if (call.task !== "task-a") return execute(call, key, context);
      callPeak = Math.max(callPeak, ++calls);
      try {
        if (calls === expectedSources) releaseCalls();
        await callBarrier;
        return await execute(call, key, context);
      } finally {
        calls--;
      }
    };
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
    engine = engineFor({ store, machine: visualMachine, ai, clock, staging });
    ai.requestVisualInFixtures = true;
    const course = courseRecord();
    await store.upsertCourse(course);
    const workflow = await engine.start(course, "initial");
    await engine.run(workflow.workflowId);
    expect(renderPeak).toBe(2);
    expect(callPeak).toBe(2);
    expect(calls).toBe(0);
    expect(ai.calls.some((call) => call.task === "task-b")).toBe(true);
  });

  it("reconciles an abandoned paid session to user Retry without dispatch, regardless of expired TTL", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    const workflow = await engine.start(course, "initial");
    await store.saveWorkflow({
      ...workflow,
      state: "working",
      phase: "task-a",
      lease: { token: "old", sessionId: "ended", expiresAt: "2000-01-01T00:00:00Z" }
    });
    await engine.reconcileSession();
    const reconciled = await store.readWorkflow(workflow.workflowId);
    expect(reconciled).toMatchObject({
      state: "failed",
      paidRetryAvailable: true,
      errorCode: "AI_INTERRUPTED"
    });
    await engine.run(workflow.workflowId);
    expect(ai.calls).toHaveLength(0);
  });
  it("atomically admits only one concurrent owner and rejects a stale draft write", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    const expected = await engine.start(course, "initial");
    const claims = await Promise.all(
      ["one", "two"].map((token) =>
        store.replaceWorkflow(expected, {
          ...expected,
          state: "working",
          lease: { token, sessionId: "session" }
        })
      )
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
    await expect(
      store.writeDraft({ sources: [] }, { ...expected, lease: { token: "stale" } })
    ).rejects.toThrow("STALE_WORKFLOW_WRITE");
    await expect(
      store.saveWorkflow(
        { ...expected, state: "failed" },
        { ...expected, lease: { token: "stale" } }
      )
    ).rejects.toThrow("STALE_WORKFLOW_WRITE");
  });
  it("does not dispatch a legacy saved paid failure on startup", async () => {
    const course = courseRecord();
    await store.upsertCourse(course);
    const workflow = await engine.start(course, "initial");
    await store.saveWorkflow({ ...workflow, state: "saved", phase: "task-a" });
    await engine.reconcileSession();
    expect(await store.readWorkflow(workflow.workflowId)).toMatchObject({
      state: "failed",
      paidRetryAvailable: true
    });
    expect(ai.calls).toHaveLength(0);
  });

  it("parks on a network outage without trying every remaining Source", async () => {
    machine.sources = Array.from({ length: 30 }, (_, i) => ({
      sourceId: `src-${String(i)}`,
      title: `Synthetic ${String(i)}`,
      kind: "attachment",
      text: `Synthetic material ${String(i)}`
    }));
    ai.handler = () => {
      throw new DeepSeekFailure("NETWORK_TRANSIENT", true, "DeepSeek could not be reached");
    };
    const course = courseRecord();
    await store.upsertCourse(course);
    const workflow = await engine.start(course, "initial");
    await engine.run(workflow.workflowId);
    expect(ai.calls.filter((call) => call.task === "task-a").length).toBeLessThanOrEqual(10);
    expect(ai.calls.length).toBeGreaterThan(0);
    expect(await store.readWorkflow(workflow.workflowId)).toMatchObject({
      state: "failed",
      phase: "task-a",
      attempt: 1,
      errorCode: "NETWORK_TRANSIENT"
    });
  });

  it.each([false, true])(
    "reuses completed Task A results after network recovery (QA clean=%s)",
    async (clean) => {
      ai.requestVisualInFixtures = true;
      machine.sources = machine.sources.map((source) => ({ ...source, kind: "attachment" }));
      const renders = new Map<string, number>();
      const fetch = machine.fetchAndParse.bind(machine);
      const visualMachine: MachinePort = {
        discover: machine.discover.bind(machine),
        missingPermissionOrigins: machine.missingPermissionOrigins,
        fetchAndParse: async (source) => ({
          ...(await fetch(source)),
          parseStatus: "partial",
          units: [
            {
              locator: "page:1",
              text:
                source.sourceId === "src-guide"
                  ? (INITIAL_SOURCES[0]?.text ?? "")
                  : (INITIAL_SOURCES[1]?.text ?? ""),
              partial: true,
              visualGaps: ["image"]
            }
          ]
        }),
        visualParts: (source) => {
          renders.set(source.sourceId, (renders.get(source.sourceId) ?? 0) + 1);
          return Promise.resolve({
            parts: [{ locator: "page:1", dataUrl: "data:image/png;base64,AAAA" }],
            unresolved: []
          });
        }
      };
      engine = engineFor({
        store,
        machine: visualMachine,
        ai,
        clock,
        staging,
        allowQaAcceptance: clean
      });
      const response = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
      let online = false;
      ai.handler = (call) => {
        if (call.task === "task-a" && call.user.includes("Six quizzes") && !online)
          throw new DeepSeekFailure("NETWORK_TRANSIENT", true, "Synthetic network outage");
        return response(call);
      };
      const course = courseRecord();
      await store.upsertCourse(course);
      const workflow = await engine.start(
        course,
        clean ? "rebuild" : "initial",
        clean ? { qaSemanticClean: true } : {}
      );
      await engine.run(workflow.workflowId);
      expect(await store.readWorkflow(workflow.workflowId)).toMatchObject({
        state: "failed",
        phase: "task-a"
      });
      online = true;
      const failed = await store.readWorkflow(workflow.workflowId);
      if (!failed) throw new Error("fixture missing");
      await store.saveWorkflow({ ...failed, state: "saved", userRetryAuthorized: true });
      clock.advance(5 * 60_000);
      const recovered = await engine.run(workflow.workflowId);
      expect({ state: recovered.state, detail: recovered.lastErrorDetail }).toEqual({
        state: "waiting",
        detail: undefined
      });
      expect(renders.get("src-guide")).toBe(1);
      expect(renders.get("src-quizzes")).toBe(1);
      expect(
        ai.calls.filter(
          (call) => call.task === "task-a" && call.user.includes("Individual Assignment 30%")
        )
      ).toHaveLength(2);
      expect(
        ai.calls.filter((call) => call.task === "task-a" && call.user.includes("Six quizzes"))
      ).toHaveLength(3);
    }
  );

  it("cannot certify Partial coverage from an empty renderer success", async () => {
    const fetch = machine.fetchAndParse.bind(machine);
    const visualMachine: MachinePort = {
      discover: machine.discover.bind(machine),
      missingPermissionOrigins: machine.missingPermissionOrigins,
      fetchAndParse: async (source) => ({
        ...(await fetch(source)),
        parseStatus: "partial",
        contentHash: "synthetic",
        units: [
          {
            locator: "page:1",
            text:
              source.sourceId === "src-guide"
                ? (INITIAL_SOURCES[0]?.text ?? "")
                : (INITIAL_SOURCES[1]?.text ?? ""),
            partial: true,
            visualGaps: ["image"]
          }
        ]
      }),
      visualParts: () => Promise.resolve({ parts: [], unresolved: [] })
    };
    engine = engineFor({ store, machine: visualMachine, ai, clock, staging });
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
    const course = courseRecord();
    await store.upsertCourse(course);
    const workflow = await engine.start(course, "initial");
    await engine.run(workflow.workflowId);
    const { observations } = await store.readAllSourceStates(course.courseId);
    expect(
      observations
        .filter((item) => item.workflowId === workflow.workflowId)
        .every((item) => item.parseStatus === "partial" && item.understandingStatus === "partial")
    ).toBe(true);
  });

  it("keeps unresolved visual input Partial even when Task A returns semantic success", async () => {
    const fetch = machine.fetchAndParse.bind(machine);
    machine.fetchAndParse = async (source) => {
      const result = await fetch(source);
      return source.sourceId === "src-guide"
        ? {
            ...result,
            parseStatus: "partial",
            contentHash: "original-hash",
            units: [{ locator: "page:1", text: result.text, partial: true, visualGaps: ["image"] }]
          }
        : result;
    };
    const course = courseRecord();
    await store.upsertCourse(course);
    ai.handler = fixtureFor([TASK_A_GUIDE, TASK_A_QUIZZES], TASK_B_MERGED);
    const workflow = await engine.start(course, "initial");
    await engine.run(workflow.workflowId);
    const { observations } = await store.readAllSourceStates(course.courseId);
    expect(
      observations.find(
        (item) => item.workflowId === workflow.workflowId && item.sourceId === "src-guide"
      )
    ).toMatchObject({ parseStatus: "partial", understandingStatus: "partial" });
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
    const projected = await store.readSnapshot(course.courseId);
    const evidence = await store.readEvidence(
      (projected?.facts ?? []).flatMap((f) =>
        f.evidenceRefs
          .filter((r) => r.sourceId === "src-guide")
          .map((r) => r.evidenceId)
          .filter((id): id is string => typeof id === "string")
      )
    );
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
    const extraction = ai.calls.filter((call) => call.task === "task-a");
    expect(extraction).toHaveLength(1);
    expect(extraction[0]?.user).toContain("resource/x-bb-blti-link");
    expect(extraction[0]?.user).toContain("2026-10-21T23:59:00Z");
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
    expect(input?.newEvidence).toMatchObject([{ excerpt: "Group Project 40% due 12 November" }]);
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
    expect(
      await store.readEvidence(
        (trusted?.facts ?? [])
          .flatMap((f) => f.evidenceRefs.map((r) => r.evidenceId))
          .filter((id): id is string => typeof id === "string")
      )
    ).toMatchObject([{ excerpt: "New Essay due 20 November" }]);
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

    expect(preview).toMatchObject({ state: "failed", paidRetryAvailable: true });
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

  it("does not run an extra paid Source recovery after the normal pass", async () => {
    const course = { ...courseRecord(), established: true, currentRevision: 7 };
    await store.upsertCourse(course);
    ai.handler = (call) => {
      if (call.task === "task-a" && call.user.includes("Six quizzes"))
        throw new DeepSeekFailure("AI_CONTRACT", true, "invalid contract");
      return TASK_A_GUIDE;
    };
    const rebuild = await engine.start(course, "rebuild");
    expect(await engine.run(rebuild.workflowId)).toMatchObject({
      state: "failed",
      paidRetryAvailable: true
    });
    expect(ai.calls.filter((c) => c.idempotencyKey.startsWith("task-a-recovery:"))).toHaveLength(0);
    expect(
      ai.calls.filter((c) => c.task === "task-a" && c.user.includes("Six quizzes"))
    ).toHaveLength(1);
    const before = ai.calls.length;
    await engine.run(rebuild.workflowId);
    expect(ai.calls).toHaveLength(before);
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
    release?.({
      call: ai.calls[0] as TestCall,
      value:
        ai.calls[0]?.task === "teaching-classification"
          ? ai.teachingHandler(ai.calls[0])
          : TASK_A_GUIDE
    });

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
      return Promise.resolve({
        call,
        value: structuredClone(
          call.task === "teaching-classification"
            ? ai.teachingHandler(call)
            : call.task === "exhaustive-routing"
              ? ai.routingHandler(call)
              : call.task === "retrieval-planner"
                ? ai.plannerHandler(call)
                : call.task === "coverage-audit"
                  ? ai.auditHandler(call)
                  : ai.handler(call)
        )
      });
    };

    const rebuild = await engine.start(course, "rebuild", { tabId: 42 });
    const running = engine.run(rebuild.workflowId);
    await vi.waitFor(() => expect(ai.calls).toHaveLength(1));
    // The recovery timestamp is not a deadline for work that still owns the same generation.
    clock.advance(11 * 60_000);
    delayFirst = false;
    release?.({
      call: ai.calls[0] as TestCall,
      value:
        ai.calls[0]?.task === "teaching-classification"
          ? ai.teachingHandler(ai.calls[0])
          : TASK_A_GUIDE
    });

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
    userRetryAuthorized: true,
    phase: "task-a",
    phaseCursor: "start",
    attempt: 1,
    baseCourseRevision: 0,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides
  });

  it("names the moment a parked run becomes due", () => {
    expect(retryDueAt(parked({ attempt: 1 }))).toBe(0);
    expect(retryDueAt(parked({ attempt: 2 }))).toBe(0);
    expect(retryDueAt(parked({ attempt: 3 }))).toBe(0);
  });

  it("schedules an owned run at its recovery timestamp and an unclaimed run immediately", () => {
    expect(
      retryDueAt(
        parked({
          state: "working",
          lease: { token: "lease-1", expiresAt: new Date(NOW.getTime() + 10_000).toISOString() }
        })
      )
    ).toBeNull();
    expect(retryDueAt(parked({ state: "working" }))).toBeNull();
    expect(retryDueAt(parked({ state: "queued" }))).toBe(0);
  });

  it("has nothing to schedule for a run that is not parked on a delay", () => {
    expect(retryDueAt(parked({ state: "failed" }))).toBeNull();
    expect(retryDueAt(parked({ state: "waiting", waitingReason: "review" }))).toBeNull();
  });

  it("agrees with itself about whether that moment has arrived", () => {
    const record = parked({ attempt: 1 });
    expect(retryDue(record, new Date(NOW.getTime() + 5 * 60_000 - 1))).toBe(true);
    expect(retryDue(record, new Date(NOW.getTime() + 5 * 60_000))).toBe(true);
  });
});

describe("source Registry Group policy integration", () => {
  it.each([
    "initial",
    "rebuild",
    "one-group-fails",
    "check-change",
    "coverage3",
    "coverage3-check",
    "coverage4",
    "coverage4-check",
    "coverage4-gaps",
    "coverage4-gaps-check",
    "coverage4-native-discovery",
    "coverage4-native-discovery-check"
  ])("runs isolated new policy (%s)", async (scenario) => {
    const coveragePolicy = scenario.startsWith("coverage");
    const facetPolicy = scenario.startsWith("coverage4");
    const facetGaps = scenario.includes("gaps");
    const checkScenario = scenario === "check-change" || scenario.endsWith("-check");
    const version = facetPolicy ? "8" : coveragePolicy ? "7" : "6";
    const cReceiptTargets: string[] = [];
    const store = await freshStore();
    const machine = new FakeMachine();
    const ai = new FakeAi();
    const staging = new RebuildStagingStore(memoryStorage());
    const course = courseRecord();
    await store.upsertCourse(course);
    await store.writeDraft({
      assessments: [
        {
          assessmentId: "trusted-user",
          courseId: course.courseId,
          role: "assessment",
          kind: "other",
          name: "User object",
          aliases: [],
          marks: ["Edited"],
          createdBy: "user",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString()
        }
      ]
    });
    const drafts = [TASK_A_GUIDE, TASK_A_QUIZZES].map(
      (value) =>
        JSON.parse(
          JSON.stringify(value)
            .replaceAll('"line 2"', '"native-text"')
            .replaceAll('"line 3"', '"native-text"')
            .replaceAll('"line 1"', '"native-text"')
        ) as typeof TASK_A_GUIDE
    );
    ai.handler = (call) => {
      expect(call.schemaVersion).toBe("syllab.ai/session/1");
      const delivery = JSON.parse(call.user) as {
        roundId: string;
        segmentId: string;
        delivery: string;
      };
      const input = JSON.parse(delivery.delivery) as Record<string, unknown>;
      let output: unknown;
      if (call.promptVersion === `a-session/${version}`) {
        const index = input.index as { sourceId: string };
        const draft = drafts.find((d) => d.sourceId === index.sourceId);
        if (!draft) throw Error("SYNTHETIC_SOURCE_MISSING");
        output = {
          ...draft,
          fileContext: "Synthetic current course instructions",
          identityContext: "Synthetic standalone tasks and quiz series",
          assessmentDrafts: draft.assessmentDrafts.map((d) => ({
            ...d,
            aliases: [],
            fields: d.fields.map((f) => ({ ...f, competingValues: [] }))
          }))
        };
      } else if (call.promptVersion === `b1-session/${version}`) {
        const admitted = input.drafts as Array<{ id: string; payload: { role: string } }>;
        output = {
          operations: admitted.flatMap((d, i) => [
            {
              id: `group-op-${String(i)}`,
              recordId: `g-${String(i)}`,
              expectedRevision: 0,
              kind: "put",
              record: {
                id: `g-${String(i)}`,
                revision: 1,
                kind: "group",
                payload: {
                  memberDraftIds: [d.id],
                  role: d.payload.role,
                  parentGroupId: null,
                  trustedObjectId: null,
                  relevance: {
                    status: "UNCERTAIN",
                    basis: "Synthetic incomplete assignment context",
                    supportingEvidence: [],
                    contradictoryEvidence: []
                  }
                }
              }
            },
            {
              id: `disposition-op-${String(i)}`,
              recordId: `disposition-${String(i)}`,
              expectedRevision: 0,
              kind: "put",
              record: {
                id: `disposition-${String(i)}`,
                revision: 1,
                kind: "draft-disposition",
                payload: { inputId: d.id, disposition: "standalone", targetId: `g-${String(i)}` }
              }
            }
          ])
        };
      } else if (call.promptVersion === `c-session/${version}`) {
        const target = input.target as { objectId: string };
        expect(input.current).not.toHaveProperty("assessments");
        expect(input.latest).not.toHaveProperty("assessments");
        output = {
          schema: "syllab.ai.task-c/1",
          changeResults: [
            {
              targetObjectId: target.objectId,
              changeType: target.objectId === "trusted-user" ? "NO_MEANINGFUL_CHANGE" : "NEW",
              currentEvidence: [],
              newEvidence: [],
              judgmentBasis: "Synthetic declared comparison"
            }
          ],
          unresolvedIssues: []
        };
      } else {
        expect(call.promptVersion).toBe(`b2-session/${version}`);
        const group = input.group as {
          id: string;
          revision: number;
          payload: { memberDraftIds: string[] };
        };
        const members = input.members as Array<{ payload: Record<string, unknown> }>;
        expect(members).toHaveLength(1);
        output = {
          ...TASK_B_MERGED,
          upstream: {
            groupId: group.id,
            revision: group.revision,
            memberDraftIds: group.payload.memberDraftIds
          },
          canonicalAssessmentProposals: [
            {
              ...(members[0] as { payload: Record<string, unknown> }).payload,
              canonicalName:
                scenario === "one-group-fails" && group.id === "g-1"
                  ? ""
                  : (members[0] as { payload: Record<string, unknown> }).payload.name,
              consolidatedFields: (members[0] as { payload: Record<string, unknown> }).payload
                .fields,
              supportingEvidence: (
                members[0] as { payload: { fields: Array<{ evidence: unknown[] }> } }
              ).payload.fields.flatMap((f) => f.evidence),
              proposalId: group.id
            }
          ]
        };
      }
      if (coveragePolicy && call.promptVersion === `a-session/${version}`) {
        const authored = output as typeof TASK_A_GUIDE;
        const inventory = authored.assessmentDrafts.flatMap((d) =>
          d.fields.map((f) => ({
            unitId: `${d.draftId}:${f.fieldName}`,
            sourceId: authored.sourceId,
            kind: "fact",
            content: `Synthetic ${f.fieldName}`,
            evidence: f.evidence,
            ownerDraftId: d.draftId,
            nodeName: f.fieldName
          }))
        );
        output = {
          ...authored,
          semanticInventory: inventory,
          sourceCoverage: [
            {
              locator: "native-text",
              status: "EXAMINED",
              reason: "Synthetic bounded examination",
              evidence: inventory[0]?.evidence
            }
          ],
          assessmentDrafts: authored.assessmentDrafts.map((d) => ({
            ...d,
            fields: d.fields.map((f) => ({
              ...f,
              coverageUnitIds: [`${d.draftId}:${f.fieldName}`]
            }))
          }))
        };
      }
      if (coveragePolicy && call.promptVersion === `b1-session/${version}`) {
        const authored = output as { operations: unknown[] };
        const admitted = input.drafts as Array<{ id: string; payload: { draftId: string } }>;
        const units = input.semanticInventory as Array<{
          unitId: string;
          ownerDraftId: string;
          evidence: unknown[];
        }>;
        authored.operations.push(
          ...units.map((u, i) => ({
            id: `coverage-op-${String(i)}`,
            recordId: `coverage-${String(i)}`,
            expectedRevision: 0,
            kind: "put",
            record: {
              id: `coverage-${String(i)}`,
              revision: 1,
              kind: "issue",
              payload: {
                semanticDisposition: {
                  unitId: u.unitId,
                  disposition: "GROUP",
                  targetIds: [
                    `g-${String(admitted.findIndex((d) => d.payload.draftId === u.ownerDraftId))}`
                  ],
                  reason: "Synthetic declared owner",
                  evidence: u.evidence
                }
              }
            }
          }))
        );
      }
      if (facetPolicy && call.system.includes("B2 INVENTORY PHASE")) {
        const native = input.nativeContent as Array<{
          sourceId: string;
          locator: string;
          text: string;
        }>;
        expect(native.length).toBeGreaterThan(0);
        expect(native.every((range) => range.text.length > 0)).toBe(true);
        const units = input.semanticInventory as Array<{
          unitId: string;
          sourceId: string;
          content: string;
          evidence: unknown[];
          nodeName: string;
        }>;
        output = {
          schema: "syllab.ai.semantic-facets/2",
          nativeAudit: (
            input.sourceContexts as Array<{
              sourceId: string;
              index: { units: Array<{ locator: string }> };
            }>
          ).flatMap((source) =>
            source.index.units.map((range) => ({
              sourceId: source.sourceId,
              locator: range.locator,
              status: "EXAMINED",
              facetIds: units
                .filter((u) => u.sourceId === source.sourceId)
                .map((u) => `${u.unitId}:facet`),
              reason: "Synthetic native scope reviewed",
              evidence: [
                {
                  evidenceId: `audit:${source.sourceId}:${range.locator}`,
                  sourceId: source.sourceId,
                  locator: range.locator,
                  excerpt:
                    machine.sources
                      .find((s) => s.sourceId === source.sourceId)
                      ?.text.split("\n")[0] ?? ""
                }
              ]
            }))
          ),
          unitReviews: units.map((u) => ({
            unitId: u.unitId,
            facetIds: [`${u.unitId}:facet`],
            reason: "Synthetic singular Fact"
          })),
          facets: units.map((u) => ({
            ...u,
            unitId: `${u.unitId}:facet`,
            parentUnitId: u.unitId,
            modality: "fact"
          })),
          unresolvedIssues: facetGaps
            ? [{ description: "Synthetic unreviewed native clause remains unresolved" }]
            : []
        };
      }
      if (
        facetPolicy &&
        scenario.includes("native-discovery") &&
        call.system.includes("B2 INVENTORY PHASE")
      ) {
        const inventory = output as {
          facets: Array<Record<string, unknown>>;
          nativeAudit: Array<{ facetIds: string[] }>;
        };
        const first = inventory.facets[0];
        if (!first) throw Error("SYNTHETIC_FACET_REQUIRED");
        const id = `${String(first.unitId)}:native-extra`;
        inventory.facets.push({ ...first, unitId: id, parentUnitId: null });
        inventory.nativeAudit[0]?.facetIds.push(id);
      }
      if (
        coveragePolicy &&
        !call.system.includes("B2 INVENTORY PHASE") &&
        call.promptVersion === `b2-session/${version}`
      ) {
        const authored = output as { canonicalAssessmentProposals: Array<{ proposalId: string }> };
        const units = input.semanticInventory as Array<{
          unitId: string;
          nodeName: string;
          evidence: unknown[];
        }>;
        output = {
          ...authored,
          semanticInventory: [],
          coverageDecisions: units.map((u) => ({
            unitId: u.unitId,
            disposition: "KEEP",
            reason: "Synthetic declared target",
            evidence: u.evidence,
            targets: [
              {
                proposalId: authored.canonicalAssessmentProposals[0]?.proposalId,
                kind: "field",
                id: u.nodeName
              }
            ]
          }))
        };
      }
      if (coveragePolicy && call.promptVersion === `c-session/${version}`) {
        const target = input.target as { objectId: string };
        if (facetGaps)
          expect((input.coverage as { partialCoverage: boolean }).partialCoverage).toBe(true);
        const receipts = input.semanticCoverage as Array<{ targetObjectId: string }> | undefined;
        expect((receipts ?? []).every((r) => r.targetObjectId === target.objectId)).toBe(true);
        if (receipts?.length) cReceiptTargets.push(target.objectId);
      }
      return {
        schema: "syllab.ai/session/1",
        roundId: delivery.roundId,
        segmentId: delivery.segmentId,
        kind: "ROUND_COMPLETE_FINAL",
        carry: {},
        output
      };
    };
    const primary = ai.handler;
    ai.handler = (call) => {
      const result = primary(call) as { output: { operations?: unknown[] } };
      if (checkScenario && call.promptVersion === `b1-session/${version}`)
        result.output.operations?.push({
          id: "trusted-disposition",
          recordId: "trusted-identity",
          expectedRevision: 0,
          kind: "put",
          record: {
            id: "trusted-identity",
            revision: 1,
            kind: "identity",
            payload: {
              trustedObjectId: "trusted-user",
              relationship: "missing",
              reason: "Synthetic fixture missing latest"
            }
          }
        });
      return result;
    };
    const engine = engineFor({
      store,
      machine,
      ai,
      staging,
      clock: new VirtualClock(),
      newArchitecture: true
    });
    const before = await store.readTrustedSnapshot(course.courseId);
    const workflow = await engine.start(
      course,
      scenario === "rebuild" ? "rebuild" : checkScenario ? "check" : "initial"
    );
    // These captured synthetic responses exercise /2 compatibility; /3 has a separate coverage suite.
    workflow.semanticPolicy = facetPolicy
      ? "assessment-relevance/4"
      : coveragePolicy
        ? "assessment-relevance/3"
        : "assessment-relevance/2";
    await store.saveWorkflow(workflow);
    await engine.run(workflow.workflowId);
    const final = (await store.listWorkflows()).find(
      (w) => w.workflowId === workflow.workflowId
    ) as WorkflowRecord;
    expect(final.state, final.lastErrorDetail).toBe("waiting");
    expect(final.waitingReason).toBe("review");
    expect(ai.calls.filter((c) => c.promptVersion === `a-session/${version}`)).toHaveLength(2);
    expect(ai.calls.filter((c) => c.promptVersion === `b1-session/${version}`)).toHaveLength(1);
    expect(ai.calls.filter((c) => c.promptVersion === `b2-session/${version}`)).toHaveLength(
      facetPolicy ? 6 : 3
    );
    expect(
      ai.calls.some((c) => c.task === "teaching-classification" || c.task === "exhaustive-routing")
    ).toBe(false);
    const result = await staging.read(course.courseId, workflow.workflowId);
    if (coveragePolicy && !checkScenario) {
      expect(result?.taskBResult?.semanticCoverage).toHaveLength(3);
      expect(result?.taskBResult?.unresolvedIssues).toHaveLength(facetGaps ? 3 : 0);
    }
    if (!checkScenario)
      expect(result?.assessments).toHaveLength(scenario === "one-group-fails" ? 2 : 3);
    else expect(ai.calls.filter((c) => c.promptVersion === `c-session/${version}`)).toHaveLength(4);
    expect((await store.readTrustedSnapshot(course.courseId))?.assessments).toEqual(
      before?.assessments
    );
    expect(await store.readHistory(course.courseId)).toEqual([]);
    if (coveragePolicy && checkScenario) expect(cReceiptTargets).toHaveLength(3);
    const calls = ai.calls.length;
    await engine.run(workflow.workflowId);
    expect(ai.calls).toHaveLength(calls);
    // Incomplete semantic coverage deliberately disables the unchanged-Check fast path.
    if (scenario === "one-group-fails" || facetGaps) return;
    const check = await engine.start(course, "check");
    check.semanticPolicy = facetPolicy
      ? "assessment-relevance/4"
      : coveragePolicy
        ? "assessment-relevance/3"
        : "assessment-relevance/2";
    await store.saveWorkflow(check);
    await engine.run(check.workflowId);
    expect(ai.calls).toHaveLength(calls);
    expect(
      (await store.listWorkflows()).find((w) => w.workflowId === check.workflowId)?.state
    ).toBe("complete");
  });
});

describe("native global production workflow integration", () => {
  it.each([false, true])(
    "delivers native sources, reviews Rules and resumes without repeat (contract repair=%s)",
    async (repair) => {
      const store = await freshStore(),
        machine = new FakeMachine(),
        ai = new FakeAi(),
        clock = new VirtualClock(),
        staging = new RebuildStagingStore(memoryStorage());
      const course = courseRecord();
      await store.upsertCourse(course);
      ai.handler = (call) => {
        const d = JSON.parse(call.user) as {
          snapshot: string;
          claimAudit?: Array<{ claimId: string; kind?: string }>;
          sources: Array<{
            index: { sourceRef: string };
            nativeContent: Array<{ passages: Array<{ refId?: string }> }>;
          }>;
        };
        const first = d.sources[0];
        if (!first) throw Error("SOURCE_MISSING");
        const evidence = [
          {
            refId: first.nativeContent
              .flatMap((u: { passages: Array<{ refId?: string }> }) => u.passages)
              .find((p: { refId?: string }) => p.refId)?.refId
          }
        ];
        return {
          ...(d.claimAudit
            ? {
                claimAuditEncoding: "inline/1",
                contentEncoding: "upstream-claim/1",
                unmappedClaims: []
              }
            : {}),
          evidenceEncoding: "native-ref/1",
          schema: call.schemaVersion,
          snapshot: d.snapshot,
          coverage: d.sources.map((x: { index: { sourceRef: string } }) => ({
            sourceRef: x.index.sourceRef,
            examinedNativeLocators: "ALL_AVAILABLE_NATIVE",
            unresolvedNativeLocators: [],
            limitations: []
          })),
          output: {
            schema: "syllab.ai.task-b/1",
            identityResolutions: [],
            canonicalAssessmentProposals: [
              {
                proposalId: "essay",
                canonicalName: "Synthetic assignment",
                type: "assignment",
                role: "assessment",
                aliases: [],
                consolidatedFields:
                  repair && ai.calls.length === 1
                    ? [
                        {
                          fieldName: "venue",
                          state: "EXPLICITLY_UNKNOWN",
                          value: "TBA",
                          competingValues: [],
                          evidence
                        }
                      ]
                    : [],
                requirements: [
                  {
                    requirementId: "req",
                    ...(d.claimAudit
                      ? {
                          contentRef: d.claimAudit.find((c) => c.kind === "requirement")?.claimId,
                          reconciledClaimIds: d.claimAudit
                            .filter((c) => c.kind === "requirement")
                            .map((c) => c.claimId)
                        }
                      : { content: "Submit PDF." }),
                    evidence
                  }
                ],
                supportingEvidence: evidence,
                unresolvedIssues: [{ description: "Applicability needs checking", evidence }]
              }
            ],
            courseWideConstraintProposals: [
              {
                proposalId: "rule",
                ...(d.claimAudit
                  ? {
                      contentRef: d.claimAudit.find((c) => c.kind === "rule")?.claimId,
                      reconciledClaimIds: d.claimAudit
                        .filter((c) => c.kind === "rule")
                        .map((c) => c.claimId)
                    }
                  : { normalizedRuleContent: "Keep a copy." }),
                supportingEvidence: evidence,
                unresolvedIssues: []
              }
            ],
            fieldConsolidationResults: [],
            structuralRelationships: [],
            unresolvedIssues: [{ description: "Unresolved course issue", evidence }]
          }
        };
      };
      const engine = engineFor({ store, machine, ai, clock, staging, directCourse: true });
      const w = await engine.start(course, "initial");
      await engine.run(w.workflowId);
      const after = await store.readWorkflow(w.workflowId);
      expect(after?.state, JSON.stringify(after)).toBe("waiting");
      expect(after?.waitingReason).toBe("review");
      expect(ai.calls).toHaveLength(repair ? 3 : 2);
      const firstCall = ai.calls[0];
      if (!firstCall) throw Error("CALL_MISSING");
      const delivered = JSON.parse(firstCall.user) as { sources: unknown[] };
      expect(delivered.sources).toHaveLength(2);
      const snapshot = await store.readSnapshot(course.courseId);
      expect(snapshot?.reviewItems).toHaveLength(2);
      expect((await store.readTrustedSnapshot(course.courseId))?.constraints).toEqual([]);
      expect((await store.readTrustedSnapshot(course.courseId))?.assessments).toEqual([]);
      const views = new ViewBuilder({
        store,
        staging,
        productVersion: "0.3.0",
        settings: () =>
          Promise.resolve({
            apiKey: { state: "valid" },
            privacy: true,
            apiUsage: true,
            version: "0.3.0"
          })
      });
      const view = await views.build({
        surface: "full-page",
        screen: "IRV-01",
        courseId: course.courseId
      });
      expect(view.review?.unresolvedQuestions).toContain("Unresolved course issue");
      const rule = snapshot?.reviewItems.find(
        (item) => item.targetId === snapshot.constraints[0]?.constraintId
      );
      const constraint = snapshot?.constraints[0];
      if (!rule || !snapshot || !constraint) throw Error("MISSING_RULE");
      const { applyInitialReviewDecision } = await import("./course-state");
      const result = applyInitialReviewDecision(snapshot, {
        reviewItemId: rule.reviewItemId,
        kind: "Confirm",
        constraint,
        expectedRevision: snapshot.course.currentRevision,
        now: NOW.toISOString()
      });
      await store.commitReviewDecision(course.courseId, rule.reviewItemId, result);
      expect((await store.readTrustedSnapshot(course.courseId))?.constraints).toHaveLength(1);
      expect((await store.readTrustedSnapshot(course.courseId))?.assessments).toEqual([]);
      await engine.run(w.workflowId);
      expect(ai.calls).toHaveLength(repair ? 3 : 2);
    }
  );
});

describe("selective CourseDraft integrated workflow", () => {
  it.each([false, true])(
    "runs Initial → Human Confirm → edited Check → Human Accept → isolated Rebuild (typed product=%s)",
    async (typedProduct) => {
      const store = await freshStore(),
        machine = new FakeMachine(),
        ai = new FakeAi(),
        clock = new VirtualClock(),
        staging = new RebuildStagingStore(memoryStorage());
      const course = courseRecord();
      await store.upsertCourse(course);
      machine.sources = [
        {
          sourceId: "src-guide",
          title: "Reflection guide",
          kind: "attachment",
          text: "Reflection 40%. Submit PDF by Friday. You may include a diagram if useful, except when confidential."
        },
        {
          sourceId: "src-teaching",
          title: "Ordinary lecture",
          kind: "attachment",
          text: "Theory. Examples can explain concepts. End."
        }
      ];
      let weight = "40%";
      let withdrawn = false;
      const submission = () =>
        withdrawn
          ? "The Friday PDF upload is withdrawn; no upload is required."
          : "Submit PDF by Friday.";
      ai.handler = (call) => {
        const input = JSON.parse(call.user) as Record<string, unknown>,
          schema = SELECTIVE_COURSE_SCHEMA;
        if (call.promptVersion.endsWith(":inspect"))
          return {
            schema,
            decisions: (input.sources as SourceRecord[]).map((s) => ({
              sourceId: s.sourceId,
              depth: s.sourceId === "src-guide" ? "DEEP" : "INSPECTED",
              locators: s.sourceId === "src-guide" ? ["native-text"] : [],
              reason:
                s.sourceId === "src-guide"
                  ? "Current assessment instructions need native reading"
                  : "Preliminary teaching observation; omitted content remains a risk"
            }))
          };
        if (call.promptVersion.endsWith(":read"))
          return {
            schema,
            notes: [
              {
                sourceId: "src-guide",
                clauses: [
                  {
                    kind: "identity",
                    content: "Current Reflection",
                    state: "KNOWN",
                    competingValues: [],
                    modality: "descriptive",
                    conditions: [],
                    exceptions: [],
                    applicability: "CURRENT",
                    context: "Current guide",
                    evidence: [{ refId: "n1.1.1" }]
                  },
                  {
                    kind: "field",
                    field: "weight",
                    content: `Reflection ${weight}`,
                    state: "KNOWN",
                    value: weight,
                    competingValues: [],
                    modality: "descriptive",
                    conditions: [],
                    exceptions: [],
                    applicability: "CURRENT",
                    context: "Current guide",
                    evidence: [{ refId: "n1.1.1" }]
                  },
                  {
                    kind: "requirement",
                    content: submission(),
                    state: "KNOWN",
                    competingValues: [],
                    modality: "must",
                    conditions: [],
                    exceptions: [],
                    applicability: "CURRENT",
                    context: "Reflection",
                    evidence: [{ refId: "n1.1.1" }]
                  },
                  {
                    kind: "requirement",
                    content: "You may include a diagram.",
                    state: "KNOWN",
                    competingValues: [],
                    modality: "may",
                    conditions: ["if useful"],
                    exceptions: ["except when confidential"],
                    applicability: "CURRENT",
                    context: "Reflection",
                    evidence: [{ refId: "n1.1.1" }]
                  }
                ]
              }
            ],
            reads: []
          };
        if (call.promptVersion.endsWith(":link") || call.promptVersion.endsWith(":link-update")) {
          const clauses = input.clauses as Clause[],
            previous = input.previous as { entities?: Array<{ ref: string }> } | undefined;
          const ref = previous?.entities?.[0]?.ref ?? "reflection";
          const linked = {
            schema,
            entities: [
              {
                ref,
                name: "Reflection",
                type: "assignment",
                role: "assessment",
                aliases: [],
                clauseRefs: [clauses[0]?.clauseId]
              }
            ],
            links: clauses.map((c) => ({
              clauseRef: c.clauseId,
              ownerRef: ref,
              disposition: "CURRENT",
              state: c.value.state,
              competingClauseRefs: [],
              resolutionClauseRefs: [],
              basis: "Current guide"
            })),
            identities: [],
            reads: []
          };
          return call.promptVersion.endsWith(":link-update")
            ? {
                schema,
                patch: {
                  entities: linked.entities,
                  links: linked.links,
                  identities: linked.identities
                },
                reads: []
              }
            : linked;
        }
        if (call.promptVersion.endsWith(":screen"))
          return {
            schema,
            decisions: (input.sources as Array<{ sourceId: string }>).map((source) => ({
              sourceId: source.sourceId,
              depth: "INSPECTED",
              locators: [],
              reason: "Complete synthetic teaching text contains no task signal"
            }))
          };
        if (call.promptVersion === "course-product/1:organize") {
          const entities = input.entities as Array<{ ref: string }>;
          const clauses = input.clauses as Array<{ clauseId: string; evidenceRefs: string[] }>;
          const native = input.evidenceCatalog as Array<{ ref: string; excerpt: string }>;
          return {
            schema: "syllab.ai.course-product/1",
            product: {
              entities: entities.map((entity) => ({
                ownerRef: entity.ref,
                disposition: "CURRENT",
                basis: "Synthetic authored reflection"
              })),
              propositions: clauses.map((clause, i) => ({
                propositionRef: `reflection.${String(i)}`,
                ownerRef: required(entities[0]).ref,
                predicate: i === 0 ? "identity" : i === 1 ? "weight" : "requirement",
                value: {
                  state: "KNOWN",
                  value:
                    i === 0
                      ? "Reflection"
                      : i === 1
                        ? weight
                        : i === 2
                          ? submission()
                          : "You may include a diagram."
                },
                unit: i === 1 ? "percent_course" : "text",
                disposition: "ACTION",
                role: i < 2 ? "core" : "action",
                title: i === 1 ? "Course weight" : "Reflection requirement",
                group: "Reflection",
                relation: "INDEPENDENT",
                modality: i < 2 ? "descriptive" : i === 2 ? "must" : "may",
                conditions: i === 3 ? ["if useful"] : [],
                exceptions: i === 3 ? ["except when confidential"] : [],
                clauseRefs: [clause.clauseId],
                support: [
                  {
                    clauseRef: clause.clauseId,
                    quote: required(native.find((e) => clause.evidenceRefs.includes(e.ref))).excerpt
                  }
                ],
                basis: "Synthetic native evidence",
                independentReview: false
              })),
              context: []
            }
          };
        }
        if (call.promptVersion === "bounded-product-audit/2:local-repair") {
          const props = input.propositions as Array<Record<string, unknown>>;
          const clauses = input.clauses as Array<{ clauseId: string; evidenceRefs: string[] }>;
          const native = input.nativeEvidence as Array<{ ref: string; excerpt: string }>;
          return {
            schema: "syllab.ai.course-product/1",
            propositions: props.map((prop, i) => {
              const clause = required(clauses[i]);
              return {
                ...prop,
                ...(prop.predicate === "weight"
                  ? { value: { state: "KNOWN", value: weight } }
                  : prop.propositionRef === "reflection.2"
                    ? { value: { state: "KNOWN", value: submission() } }
                    : {}),
                clauseRefs: [clause.clauseId],
                support: [
                  {
                    clauseRef: clause.clauseId,
                    quote: required(native.find((e) => clause.evidenceRefs.includes(e.ref))).excerpt
                  }
                ]
              };
            }),
            entities: input.entities,
            context: []
          };
        }
        if (call.promptVersion.startsWith("bounded-product-audit/2:"))
          return {
            schema: "syllab.ai.course-product/1",
            taskRef: input.taskRef,
            checkedRefs: input.checkedRefs,
            complete: true,
            valid: true,
            issues: []
          };
        if (call.promptVersion.endsWith(":compare-delta")) {
          const current = input.currentFacts as FactRecord[],
            latest = input.latestFacts as FactRecord[];
          if (withdrawn) {
            const old = required(current.find((f) => f.field === "requirement")),
              witness = required(latest.find((f) => f.semanticClause?.content === submission()));
            return {
              schema,
              changes: [
                ...current
                  .filter((f) => f.factId !== old.factId)
                  .map((f) => ({
                    changeType: "NO_MEANINGFUL_CHANGE",
                    currentFactRef: f.factId,
                    latestFactRef: required(
                      latest.find(
                        (n) =>
                          n.field === f.field &&
                          n.semanticClause?.content === f.semanticClause?.content
                      )
                    ).factId,
                    judgmentBasis: "Unchanged independent meaning in reread source"
                  })),
                {
                  changeType: "POSSIBLY_REMOVED",
                  currentFactRef: old.factId,
                  witnessFactRefs: [witness.factId],
                  judgmentBasis: "Explicit withdrawal in completely read current source"
                },
                {
                  changeType: "CHANGED",
                  latestFactRef: witness.factId,
                  judgmentBasis: "Withdrawal remains a separate current instruction"
                }
              ]
            };
          }
          return {
            schema,
            changes: current.map((old) => {
              const next = latest.find(
                (f) =>
                  f.field === old.field &&
                  (f.field !== "requirement" ||
                    f.semanticClause?.content === old.semanticClause?.content)
              );
              if (!next) throw Error("MISSING_SCRIPTED_LATEST");
              return {
                changeType:
                  JSON.stringify(old.value) === JSON.stringify(next.value)
                    ? "NO_MEANINGFUL_CHANGE"
                    : "CHANGED",
                currentFactRef: old.factId,
                latestFactRef: next.factId,
                judgmentBasis: "Compare actual local value with latest source"
              };
            })
          };
        }
        throw Error("UNEXPECTED_SELECTIVE_TASK");
      };
      const engine = engineFor({
        store,
        machine,
        ai,
        clock,
        staging,
        directCourse: true,
        selectiveCourse: true,
        projectedCourse: typedProduct
      });
      const initial = await engine.start(course, "initial");
      await engine.run(initial.workflowId);
      expect(await store.readWorkflow(initial.workflowId)).toMatchObject({
        directCoursePolicy: typedProduct ? "selective-draft/3" : "selective-draft/1",
        waitingReason: "review"
      });
      const snapshot = await store.readSnapshot(course.courseId);
      expect(snapshot?.facts).toHaveLength(4);
      expect(snapshot?.reviewItems).toHaveLength(1);
      expect((await store.readTrustedSnapshot(course.courseId))?.facts).toEqual([]);
      expect(ai.calls.filter((c) => c.promptVersion.endsWith(":read"))).toHaveLength(1);
      expect(ai.calls.find((c) => c.promptVersion.endsWith(":read"))?.user).not.toContain(
        "Examples can explain concepts"
      );
      const { applyInitialReviewDecision, editFact } = await import("./course-state");
      if (!snapshot) throw Error("SNAPSHOT_MISSING");
      const review = required(snapshot.reviewItems[0]),
        assessment = required(snapshot.assessments[0]);
      await store.commitReviewDecision(
        course.courseId,
        review.reviewItemId,
        applyInitialReviewDecision(snapshot, {
          reviewItemId: review.reviewItemId,
          kind: "Confirm",
          assessment,
          facts: snapshot.facts,
          expectedRevision: 0,
          now: clock.now().toISOString()
        })
      );
      await engine.run(initial.workflowId);
      let trusted = required(await store.readTrustedSnapshot(course.courseId));
      const edited = editFact(trusted, {
        factId: required(trusted.facts.find((f) => f.field === "weight")).factId,
        value: { state: "KNOWN", value: "41%" },
        expectedRevision: trusted.course.currentRevision,
        now: clock.now().toISOString()
      });
      await store.commitMutation(course.courseId, edited);
      trusted = required(await store.readTrustedSnapshot(course.courseId));
      const unchangedCalls = ai.calls.length;
      const unchanged = await engine.start(trusted.course, "check");
      await engine.run(unchanged.workflowId);
      expect((await store.readWorkflow(unchanged.workflowId))?.state).toBe("complete");
      expect(ai.calls.length).toBe(unchangedCalls);
      expect((await store.readTrustedSnapshot(course.courseId))?.facts).toEqual(trusted.facts);
      weight = "45%";
      required(machine.sources[0]).text = required(machine.sources[0]).text.replace("40%", "45%");
      const check = await engine.start(trusted.course, "check");
      await engine.run(check.workflowId);
      expect((await store.readWorkflow(check.workflowId))?.lastErrorDetail).toBeUndefined();
      expect(await store.readWorkflow(check.workflowId)).toMatchObject({ state: "waiting" });
      const checked = required(await store.readSnapshot(course.courseId));
      expect(checked.changes).toHaveLength(1);
      expect(checked.changes[0]?.currentValue?.value).toBe("41%");
      expect(checked.changes[0]?.currentEvidenceIds).toEqual([]);
      expect(
        (await store.readTrustedSnapshot(course.courseId))?.facts.find((f) => f.field === "weight")
          ?.value.value
      ).toBe("41%");
      const change = required(checked.changes[0]),
        item = required(checked.reviewItems.find((i) => i.payload.changeId === change.changeId));
      await store.commitReviewDecision(
        course.courseId,
        item.reviewItemId,
        acceptChange(checked, {
          changeId: change.changeId,
          expectedRevision: checked.course.currentRevision,
          now: clock.now().toISOString(),
          evidenceRefs: required(change.proposedFact).evidenceRefs
        })
      );
      await engine.run(check.workflowId);
      trusted = required(await store.readTrustedSnapshot(course.courseId));
      expect(trusted.facts.find((f) => f.field === "weight")?.semanticClause?.content).toBe(
        typedProduct ? "45%" : "Reflection 45%"
      );
      const before = structuredClone(trusted),
        paidBefore = ai.calls.length;
      const rebuild = await engine.start(trusted.course, "rebuild");
      await engine.run(rebuild.workflowId);
      expect(await store.readTrustedSnapshot(course.courseId)).toEqual(before);
      const preview = await staging.read(course.courseId, rebuild.workflowId);
      expect(preview?.facts).toHaveLength(4);
      const optionalDiagram = preview?.facts.find((f) => f.semanticClause?.modality === "may");
      if (typedProduct)
        expect(optionalDiagram?.product?.exceptions).toContain("except when confidential");
      else expect(optionalDiagram?.value.value).toContain("except when confidential");
      const views = new ViewBuilder({
        store,
        staging,
        productVersion: "0.3.0",
        settings: () =>
          Promise.resolve({
            apiKey: { state: "valid" },
            privacy: true,
            apiUsage: true,
            version: "0.3.0"
          })
      });
      const rebuilt = await views.build({
        surface: "full-page",
        screen: "RBL-03",
        courseId: course.courseId
      });
      if (typedProduct) expect(rebuilt.rebuildPreview?.unresolvedQuestions).toEqual([]);
      else
        expect(rebuilt.rebuildPreview?.unresolvedQuestions?.join(" ")).toContain("Reading scope:");
      expect(
        rebuilt.rebuildPreview?.course.assessments[0]?.facts.some((f) => f.label.includes("may"))
      ).toBe(true);
      expect(ai.calls.slice(paidBefore).filter((c) => c.promptVersion.endsWith(":read"))).toEqual(
        []
      );
      if (typedProduct) {
        const saved = required(await store.readTrustedSnapshot(course.courseId));
        const upload = required(
          saved.facts.find((f) => f.semanticClause?.content === "Submit PDF by Friday.")
        );
        await store.commitMutation(
          course.courseId,
          editFact(saved, {
            factId: upload.factId,
            value: { state: "KNOWN", value: "My PDF upload reminder" },
            expectedRevision: saved.course.currentRevision,
            now: clock.now().toISOString()
          })
        );
        const beforeWithdrawal = required(await store.readTrustedSnapshot(course.courseId));
        withdrawn = true;
        required(machine.sources[0]).text =
          `Reflection 45%. ${submission()} You may include a diagram if useful, except when confidential.`;
        const withdrawalCheck = await engine.start(beforeWithdrawal.course, "check");
        await engine.run(withdrawalCheck.workflowId);
        expect(
          (await store.readWorkflow(withdrawalCheck.workflowId))?.lastErrorDetail
        ).toBeUndefined();
        const pending = required(await store.readSnapshot(course.courseId));
        const removal = required(pending.changes.find((c) => c.changeType === "POSSIBLY_REMOVED"));
        expect(removal.currentValue?.value).toBe("My PDF upload reminder");
        expect(removal.latestValue).toBeUndefined();
        expect(removal.newEvidenceIds.length).toBeGreaterThan(0);
        expect((await store.readTrustedSnapshot(course.courseId))?.facts).toEqual(
          beforeWithdrawal.facts
        );
        const removalItem = required(
          pending.reviewItems.find((r) => r.payload.changeId === removal.changeId)
        );
        const { keepPossiblyRemoved } = await import("./course-state");
        await store.commitReviewDecision(
          course.courseId,
          removalItem.reviewItemId,
          keepPossiblyRemoved(pending, {
            changeId: removal.changeId,
            expectedRevision: pending.course.currentRevision,
            now: clock.now().toISOString()
          })
        );
        expect(
          (await store.readTrustedSnapshot(course.courseId))?.facts.find(
            (f) => f.factId === upload.factId
          )
        ).toEqual(required(beforeWithdrawal.facts.find((f) => f.factId === upload.factId)));
        expect(
          (await store.readSnapshot(course.courseId))?.changes.some(
            (c) => c.changeType === "POSSIBLY_REMOVED"
          )
        ).toBe(false);
        expect((await store.readSnapshot(course.courseId))?.reviewItems.length).toBeGreaterThan(0);
      }
    }
  );
});

function required<T>(value: T | undefined | null): T {
  if (value == null) throw Error("SYNTHETIC_EXPECTED_VALUE_MISSING");
  return value;
}

it("recovers an undated hidden instruction through the production workflow into independent Initial Review without trusted promotion", async () => {
  const store = await freshStore(),
    machine = new FakeMachine(),
    ai = new FakeAi(),
    clock = new VirtualClock();
  const course = courseRecord();
  await store.upsertCourse(course);
  const instruction = "Upload a memo before class if assigned, unless an extension is approved.";
  machine.sources = [
    {
      sourceId: "ordinary",
      title: "Methods lecture",
      kind: "attachment",
      text: `Theory and worked examples. ${instruction}`
    }
  ];
  ai.handler = (call) => {
    const input = JSON.parse(call.user) as Record<string, unknown>,
      schema = SELECTIVE_COURSE_SCHEMA;
    if (call.promptVersion.endsWith(":inspect") || call.promptVersion.endsWith(":screen"))
      return {
        schema,
        decisions: [
          {
            sourceId: "ordinary",
            depth: "INSPECTED",
            locators: [],
            reason:
              "Simulated preliminary miss; full native risk audit must independently recover it."
          }
        ]
      };
    if (call.promptVersion.endsWith(":link"))
      return { schema, entities: [], links: [], identities: [], reads: [] };
    if (call.promptVersion === "course-product/1:organize")
      return {
        schema: "syllab.ai.course-product/1",
        product: { entities: [], propositions: [], context: [] }
      };
    if (call.promptVersion.endsWith(":read")) {
      expect(input.riskRecovery).toBeDefined();
      return {
        schema,
        notes: [
          {
            sourceId: "ordinary",
            clauses: [
              {
                kind: "requirement",
                content: instruction,
                state: "KNOWN",
                competingValues: [],
                modality: "must",
                conditions: ["if assigned"],
                exceptions: ["unless an extension is approved"],
                applicability: "CURRENT",
                context: "Authored instruction",
                evidence: [{ refId: "n1.1.1" }]
              }
            ]
          }
        ],
        reads: []
      };
    }
    if (call.promptVersion.endsWith(":link-patch")) {
      const ref = required((input.clauses as Clause[])[0]).clauseId;
      return {
        schema,
        patch: {
          entities: [
            {
              ref: "memo",
              name: "Memo",
              type: "assignment",
              role: "assessment",
              aliases: [],
              clauseRefs: [ref]
            }
          ],
          links: [
            {
              clauseRef: ref,
              ownerRef: "memo",
              disposition: "CURRENT",
              state: "KNOWN",
              competingClauseRefs: [],
              resolutionClauseRefs: [],
              basis: "Authored upload instruction"
            }
          ],
          identities: []
        },
        reads: []
      };
    }
    if (call.promptVersion === "bounded-product-audit/2:local-repair") {
      const ref = required((input.clauses as Array<{ clauseId: string }>)[0]).clauseId;
      return {
        schema: "syllab.ai.course-product/1",
        entities: [
          { ownerRef: "memo", disposition: "CURRENT", basis: "Authored current instruction" }
        ],
        propositions: [
          {
            propositionRef: "memo.upload",
            ownerRef: "memo",
            predicate: "requirement",
            value: { state: "KNOWN", value: instruction },
            unit: "text",
            disposition: "ACTION",
            role: "action",
            title: "Upload memo",
            group: "Submission",
            relation: "INDEPENDENT",
            modality: "must",
            conditions: ["if assigned"],
            exceptions: ["unless an extension is approved"],
            clauseRefs: [ref],
            support: [{ clauseRef: ref, quote: instruction }],
            basis: "Exact native instruction",
            independentReview: true
          }
        ],
        context: []
      };
    }
    if (call.promptVersion.startsWith("bounded-product-audit/2:")) {
      const evidence = input.evidence as Array<{ ref: string; excerpt: string }> | undefined;
      const missing = call.promptVersion.endsWith(":source") && !(input.claims as unknown[]).length;
      const passage = missing
        ? required(evidence?.find((e) => e.excerpt.includes(instruction)))
        : undefined;
      return {
        schema: "syllab.ai.course-product/1",
        taskRef: input.taskRef,
        checkedRefs: input.checkedRefs,
        complete: true,
        valid: !missing,
        issues: passage
          ? [
              {
                code: "MISSING_NATIVE_TASK",
                description: "Upload obligation missing from Reader",
                propositionRefs: [],
                clauseRefs: [],
                requiresRead: true,
                nativeRefs: [passage.ref],
                nativeQuote: instruction
              }
            ]
          : []
      };
    }
    throw Error("UNEXPECTED_HIDDEN_TASK_STAGE:" + call.promptVersion);
  };
  const engine = engineFor({
    store,
    machine,
    ai,
    clock,
    staging: new RebuildStagingStore(memoryStorage()),
    directCourse: true,
    selectiveCourse: true,
    projectedCourse: true
  });
  const workflow = await engine.start(course, "initial");
  await engine.run(workflow.workflowId);
  expect(await store.readWorkflow(workflow.workflowId)).toMatchObject({
    directCoursePolicy: "selective-draft/3",
    state: "waiting",
    waitingReason: "review"
  });
  const snapshot = required(await store.readSnapshot(course.courseId));
  expect(snapshot.assessments.map((a) => a.name)).toEqual(["Memo"]);
  expect(snapshot.facts).toHaveLength(1);
  expect(required(snapshot.facts[0]).semanticClause).toMatchObject({
    modality: "must",
    conditions: ["if assigned"],
    exceptions: ["unless an extension is approved"]
  });
  expect(snapshot.reviewItems).toHaveLength(2);
  expect(snapshot.reviewItems.map((i) => i.payload.scopeFactIds)).toEqual([
    [],
    [required(snapshot.facts[0]).factId]
  ]);
  expect((await store.readTrustedSnapshot(course.courseId))?.facts).toEqual([]);
  expect(ai.calls.filter((c) => c.promptVersion.endsWith(":read"))).toHaveLength(1);
  expect(ai.calls.filter((c) => c.promptVersion.endsWith(":inspect"))).toHaveLength(1);
  expect(ai.calls.filter((c) => c.promptVersion === "course-product/1:organize")).toHaveLength(1);
  const { applyInitialReviewDecision } = await import("./course-state");
  const identity = required(snapshot.reviewItems.find((i) => i.payload.ownerScope === true));
  await store.commitReviewDecision(
    course.courseId,
    identity.reviewItemId,
    applyInitialReviewDecision(snapshot, {
      reviewItemId: identity.reviewItemId,
      kind: "Confirm",
      assessment: required(snapshot.assessments[0]),
      facts: [],
      expectedRevision: snapshot.course.currentRevision,
      now: clock.now().toISOString()
    })
  );
  expect((await store.readTrustedSnapshot(course.courseId))?.facts).toEqual([]);
  const pending = required(await store.readSnapshot(course.courseId));
  expect(pending.reviewItems).toHaveLength(1);
  const action = required(pending.reviewItems[0]);
  await store.commitReviewDecision(
    course.courseId,
    action.reviewItemId,
    applyInitialReviewDecision(pending, {
      reviewItemId: action.reviewItemId,
      kind: "Confirm",
      assessment: required(pending.assessments[0]),
      facts: pending.facts,
      expectedRevision: pending.course.currentRevision,
      now: clock.now().toISOString()
    })
  );
  const accepted = required(await store.readTrustedSnapshot(course.courseId));
  expect(accepted.facts).toHaveLength(1);
  expect(required(accepted.facts[0]).semanticClause).toMatchObject({
    conditions: ["if assigned"],
    exceptions: ["unless an extension is approved"]
  });
  const native = await store.readEvidence(
    required(accepted.facts[0]).evidenceRefs.map((e) => required(e.evidenceId))
  );
  expect(native.some((e) => e.excerpt.includes(instruction))).toBe(true);
});

describe("Phase 1 workflow regressions (PR-01, PR-02, PR-03)", () => {
  it("PR-03: parks workflows in waiting state with specific waitingReason when API key or authorizations are missing", async () => {
    const cases: Array<{
      label: string;
      setupAi: (ai: FakeAi) => void;
      expectedReason: "api-key" | "privacy-authorization" | "api-usage-authorization";
    }> = [
      {
        label: "missing api key",
        setupAi: (ai) => {
          ai.key = null;
        },
        expectedReason: "api-key"
      },
      {
        label: "missing privacy authorization",
        setupAi: (ai) => {
          ai.privacy = false;
        },
        expectedReason: "privacy-authorization"
      },
      {
        label: "missing usage authorization",
        setupAi: (ai) => {
          ai.usage = false;
        },
        expectedReason: "api-usage-authorization"
      }
    ];
    for (const c of cases) {
      const store = await freshStore();
      const clock = new VirtualClock();
      const course = courseRecord();
      await store.upsertCourse(course);
      const machine = new FakeMachine();
      const ai = new FakeAi();
      c.setupAi(ai);
      const engine = engineFor({
        store,
        machine,
        ai,
        clock,
        staging: new RebuildStagingStore(memoryStorage()),
        directCourse: true,
        selectiveCourse: true
      });
      const wf = await engine.start(course, "initial");
      await engine.run(wf.workflowId);
      expect(await store.readWorkflow(wf.workflowId), c.label).toMatchObject({
        state: "waiting",
        waitingReason: c.expectedReason
      });
    }
  });

  it("PR-01: allows safe retry on consumesApi=false failure, but locks ambiguous dispatching failure with paidRetryAvailable=false", async () => {
    const store = await freshStore();
    const clock = new VirtualClock();
    const course = courseRecord();
    await store.upsertCourse(course);
    const machine = new FakeMachine();
    machine.sources = [
      {
        sourceId: "syllabus",
        title: "Syllabus",
        kind: "document",
        text: "Final exam is 100%."
      }
    ];
    let calls = 0;
    const ai = new FakeAi();
    ai.execute = () => {
      calls++;
      if (calls === 1) {
        return Promise.reject(
          new AiUnitFailure({
            errorCode: "AI_AUTH",
            consumesApi: false,
            detail: "preflight auth rejected before inference"
          })
        );
      }
      return Promise.reject(
        new DeepSeekFailure("NETWORK_TRANSIENT", true, "socket dropped mid-flight")
      );
    };
    const engine = engineFor({
      store,
      machine,
      ai,
      clock,
      staging: new RebuildStagingStore(memoryStorage()),
      directCourse: true,
      selectiveCourse: true
    });
    const wf = await engine.start(course, "initial");
    await engine.run(wf.workflowId);
    const afterSafeFail = required(await store.readWorkflow(wf.workflowId));
    expect(afterSafeFail.state).toBe("failed");
    expect(afterSafeFail.paidRetryAvailable).toBe(true);

    // Retry after consumesApi=false failure reaches the provider again (not COURSE_DRAFT_PAID_UNVERIFIED).
    await store.saveWorkflow({ ...afterSafeFail, state: "saved", userRetryAuthorized: true });
    await engine.run(wf.workflowId);
    expect(calls).toBe(2);
    const afterAmbiguous = required(await store.readWorkflow(wf.workflowId));
    expect(afterAmbiguous.state).toBe("failed");

    // Next retry sees the dispatching entry from the ambiguous timeout and locks paidRetryAvailable=false.
    await store.saveWorkflow({ ...afterAmbiguous, state: "saved", userRetryAuthorized: true });
    await engine.run(wf.workflowId);
    expect(calls).toBe(2);
    expect(await store.readWorkflow(wf.workflowId)).toMatchObject({
      state: "failed",
      lastErrorDetail: "COURSE_DRAFT_PAID_UNVERIFIED",
      paidRetryAvailable: false,
      retryConsumesApi: false
    });
  });

  it("PR-02: failed maintenance check increments consecutiveCheckFailures and sets nextCheckAt backoff", async () => {
    const store = await freshStore();
    const clock = new VirtualClock();
    const course = { ...courseRecord(), established: true };
    await store.upsertCourse(course);
    const machine = new FakeMachine();
    machine.discover = () => Promise.reject(new Error("NETWORK_OFFLINE"));
    const engine = engineFor({
      store,
      machine,
      ai: new FakeAi(),
      clock,
      staging: new RebuildStagingStore(memoryStorage())
    });
    const wf = await engine.start(course, "check");
    await engine.run(wf.workflowId);
    const updated = required(await store.readCourse(course.courseId));
    expect(updated.consecutiveCheckFailures).toBe(1);
    expect(updated.nextCheckAt).toBeDefined();
    expect(Date.parse(updated.nextCheckAt ?? "")).toBeGreaterThan(clock.now().getTime());
  });
});
