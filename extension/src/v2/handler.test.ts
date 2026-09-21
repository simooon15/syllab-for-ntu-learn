import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { V2_MESSAGE_CONTRACT } from "./contract";
import type { AssessmentRecord, CourseRecord, WorkflowRecord } from "./domain";
import { ViewHandler } from "./handler";
import { RebuildStagingStore } from "./staging";
import { LocalDatabase, DATABASE_NAME } from "./storage";
import { LocalStore } from "./store";
import type { ViewBuilder } from "./view";
import type { WorkflowEngine } from "./workflow";

const NOW = "2026-09-20T09:00:00.000Z";

describe("ViewHandler Rebuild context", () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME);
      request.addEventListener("success", () => resolve());
      request.addEventListener("error", () => resolve());
      request.addEventListener("blocked", () => resolve());
    });
  });

  it("resolves the live NTU Learn tab and passes it to the Rebuild workflow", async () => {
    const database = new LocalDatabase();
    const store = new LocalStore(database);
    await store.initialize();
    const course: CourseRecord = {
      courseId: "course-1",
      semesterId: "semester-1",
      courseCode: "MA6081",
      courseName: "Fundamentals of Project Management",
      curriculum: true,
      established: true,
      currentRevision: 7,
      consecutiveCheckFailures: 0,
      updatedAt: NOW
    };
    await store.upsertCourse(course);
    const workflow: WorkflowRecord = {
      workflowId: "workflow-rebuild",
      courseId: course.courseId,
      kind: "rebuild",
      state: "queued",
      phase: "discover",
      phaseCursor: "start",
      attempt: 0,
      baseCourseRevision: course.currentRevision,
      createdAt: NOW,
      updatedAt: NOW
    };
    const start = vi.fn().mockResolvedValue(workflow);
    const resolveScanTab = vi.fn().mockResolvedValue(2468);
    const driveWorkflow = vi.fn();
    const views = {
      build: vi.fn().mockResolvedValue({
        surface: "full-page",
        screen: "SEM-01",
        settings: {
          apiKey: { state: "valid" },
          privacy: true,
          apiUsage: true,
          version: "0.2.0"
        }
      })
    } as unknown as ViewBuilder;
    const handler = new ViewHandler({
      store,
      database,
      staging: new RebuildStagingStore({
        get: () => Promise.resolve({}),
        set: () => Promise.resolve(),
        remove: () => Promise.resolve()
      }),
      session: { get: () => Promise.resolve(undefined), set: () => Promise.resolve() },
      views,
      engine: { start } as unknown as WorkflowEngine,
      surfaceRoutes: new Map(),
      now: () => new Date(NOW),
      driveWorkflow,
      resolveScanTab,
      exportBackup: () => Promise.resolve(),
      exportCalendar: () => Promise.resolve(),
      setApiKey: () => Promise.resolve(),
      validateApiKey: () => Promise.resolve("valid"),
      setAuthorization: () => Promise.resolve(),
      productVersion: "0.2.0"
    });

    const response = await handler.handle({
      contract: V2_MESSAGE_CONTRACT,
      type: "MUTATE",
      surface: "full-page",
      courseId: course.courseId,
      expectedRevision: course.currentRevision,
      mutation: { kind: "RebuildCourse" }
    });

    expect(response.ok).toBe(true);
    expect(resolveScanTab).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledWith(course, "rebuild", { tabId: 2468 });
    expect(driveWorkflow).toHaveBeenCalledWith(workflow.workflowId);
  });

  it("retries only the displayed failed workflow with a fresh phase retry budget", async () => {
    const database = new LocalDatabase();
    const store = new LocalStore(database);
    await store.initialize();
    const course: CourseRecord = {
      courseId: "course-1",
      semesterId: "semester-1",
      courseCode: "MA6081",
      courseName: "Fundamentals of Project Management",
      curriculum: true,
      established: true,
      currentRevision: 7,
      consecutiveCheckFailures: 0,
      updatedAt: NOW
    };
    await store.upsertCourse(course);
    const failed = (workflowId: string): WorkflowRecord => ({
      workflowId,
      courseId: course.courseId,
      kind: "rebuild",
      state: "failed",
      phase: "task-a",
      phaseCursor: "start",
      attempt: 4,
      errorCode: "AI_AUTH",
      lastErrorDetail: "This API key isn’t working",
      paidRetryAvailable: true,
      retryConsumesApi: true,
      baseCourseRevision: course.currentRevision,
      createdAt: NOW,
      updatedAt: NOW
    });
    await store.saveWorkflow(failed("workflow-other"));
    await store.saveWorkflow(failed("workflow-visible"));
    const driveWorkflow = vi.fn();
    const handler = new ViewHandler({
      store,
      database,
      staging: new RebuildStagingStore({
        get: () => Promise.resolve({}),
        set: () => Promise.resolve(),
        remove: () => Promise.resolve()
      }),
      session: { get: () => Promise.resolve(undefined), set: () => Promise.resolve() },
      views: { build: vi.fn() } as unknown as ViewBuilder,
      engine: {} as WorkflowEngine,
      surfaceRoutes: new Map(),
      now: () => new Date(NOW),
      driveWorkflow,
      resolveScanTab: () => Promise.resolve(undefined),
      exportBackup: () => Promise.resolve(),
      exportCalendar: () => Promise.resolve(),
      setApiKey: () => Promise.resolve(),
      validateApiKey: () => Promise.resolve("valid"),
      setAuthorization: () => Promise.resolve(),
      productVersion: "0.2.0"
    });

    const response = await handler.handle({
      contract: V2_MESSAGE_CONTRACT,
      type: "MUTATE",
      surface: "full-page",
      courseId: course.courseId,
      expectedRevision: course.currentRevision,
      mutation: { kind: "RetryTask", workflowId: "workflow-visible" }
    });

    expect(response.ok).toBe(true);
    expect(driveWorkflow).toHaveBeenCalledOnce();
    expect(driveWorkflow).toHaveBeenCalledWith("workflow-visible");
    expect(await store.readWorkflow("workflow-other")).toMatchObject({
      state: "failed",
      attempt: 4,
      errorCode: "AI_AUTH"
    });
    expect(await store.readWorkflow("workflow-visible")).toEqual(
      expect.objectContaining({ state: "saved", attempt: 0 })
    );
    const retried = await store.readWorkflow("workflow-visible");
    expect(retried?.errorCode).toBeUndefined();
    expect(retried?.lastErrorDetail).toBeUndefined();
    expect(retried?.paidRetryAvailable).toBeUndefined();
    expect(retried?.retryConsumesApi).toBeUndefined();
  });

  it("refuses partial Rebuild adoption, preserves Current State, and still allows Keep current", async () => {
    const database = new LocalDatabase();
    const store = new LocalStore(database);
    await store.initialize();
    const course: CourseRecord = {
      courseId: "course-partial",
      semesterId: "semester-1",
      courseCode: "MA6081",
      courseName: "Fundamentals of Project Management",
      curriculum: true,
      established: true,
      currentRevision: 7,
      consecutiveCheckFailures: 0,
      updatedAt: NOW
    };
    const trusted: AssessmentRecord = {
      assessmentId: "assessment-trusted",
      courseId: course.courseId,
      role: "assessment",
      kind: "project",
      name: "Trusted Project",
      aliases: [],
      marks: [],
      createdBy: "user",
      createdAt: NOW,
      updatedAt: NOW
    };
    const rebuilt: AssessmentRecord = {
      ...trusted,
      assessmentId: "assessment-partial",
      name: "Partial Rebuild Essay",
      createdBy: "ai"
    };
    await store.upsertCourse(course);
    await store.writeDraft({ assessments: [trusted] });
    const workflow: WorkflowRecord = {
      workflowId: "workflow-partial",
      courseId: course.courseId,
      kind: "rebuild",
      state: "waiting",
      phase: "review",
      phaseCursor: "complete",
      waitingReason: "review",
      attempt: 0,
      baseCourseRevision: course.currentRevision,
      createdAt: NOW,
      updatedAt: NOW
    };
    await store.saveWorkflow(workflow);
    await store.writeDraft({
      observations: [
        {
          observationId: "obs-fetch-failed",
          workflowId: workflow.workflowId,
          sourceId: "source-fetch-failed",
          courseId: course.courseId,
          fetchStatus: "failed",
          parseStatus: "not-attempted",
          comparability: "incomparable",
          errorCode: "NO_EXTRACTABLE_TEXT",
          recordedAt: NOW
        }
      ]
    });
    const memory = new Map<string, unknown>();
    const staging = new RebuildStagingStore({
      get: (key) => Promise.resolve({ [String(key)]: memory.get(String(key)) }),
      set: (items) => {
        for (const [key, value] of Object.entries(items)) memory.set(key, value);
        return Promise.resolve();
      },
      remove: (key) => {
        memory.delete(String(key));
        return Promise.resolve();
      }
    });
    await staging.write({
      courseId: course.courseId,
      workflowId: workflow.workflowId,
      stagedAt: NOW,
      assessments: [rebuilt],
      constraints: [],
      facts: [],
      evidence: [],
      reviewItems: [],
      changes: [],
      taskACoverage: {
        succeededSourceIds: ["source-ok"],
        relevantSourceIds: ["source-ok"],
        failedSources: []
      }
    });
    const handler = new ViewHandler({
      store,
      database,
      staging,
      session: { get: () => Promise.resolve(undefined), set: () => Promise.resolve() },
      views: { build: vi.fn() } as unknown as ViewBuilder,
      engine: {} as WorkflowEngine,
      surfaceRoutes: new Map(),
      now: () => new Date(NOW),
      driveWorkflow: vi.fn(),
      resolveScanTab: () => Promise.resolve(undefined),
      exportBackup: () => Promise.resolve(),
      exportCalendar: () => Promise.resolve(),
      setApiKey: () => Promise.resolve(),
      validateApiKey: () => Promise.resolve("valid"),
      setAuthorization: () => Promise.resolve(),
      productVersion: "0.2.0"
    });

    const use = await handler.handle({
      contract: V2_MESSAGE_CONTRACT,
      type: "MUTATE",
      surface: "full-page",
      courseId: course.courseId,
      expectedRevision: course.currentRevision,
      mutation: { kind: "UseRebuiltCourse" }
    });
    expect(use).toMatchObject({ ok: false, error: { code: "PARTIAL_REBUILD_NOT_ADOPTABLE" } });
    expect((await store.readSnapshot(course.courseId))?.assessments).toEqual([trusted]);
    expect(await staging.read(course.courseId, workflow.workflowId)).not.toBeNull();

    const keep = await handler.handle({
      contract: V2_MESSAGE_CONTRACT,
      type: "MUTATE",
      surface: "full-page",
      courseId: course.courseId,
      expectedRevision: course.currentRevision,
      mutation: { kind: "KeepCurrentCourse" }
    });
    expect(keep.ok).toBe(true);
    expect((await store.readSnapshot(course.courseId))?.assessments).toEqual([trusted]);
    expect(await staging.read(course.courseId, workflow.workflowId)).toBeNull();
    expect(await store.readWorkflow(workflow.workflowId)).toMatchObject({
      state: "complete",
      phase: "review",
      phaseCursor: "complete"
    });
  });

  it("adopts a fully successful Rebuild and clears its staging", async () => {
    const database = new LocalDatabase();
    const store = new LocalStore(database);
    await store.initialize();
    const course: CourseRecord = {
      courseId: "course-complete",
      semesterId: "semester-1",
      courseCode: "MA6081",
      courseName: "Fundamentals of Project Management",
      curriculum: true,
      established: true,
      currentRevision: 2,
      consecutiveCheckFailures: 0,
      updatedAt: NOW
    };
    const rebuilt: AssessmentRecord = {
      assessmentId: "assessment-rebuilt",
      courseId: course.courseId,
      role: "assessment",
      kind: "assignment",
      name: "Complete Rebuild Essay",
      aliases: [],
      marks: [],
      createdBy: "ai",
      createdAt: NOW,
      updatedAt: NOW
    };
    await store.upsertCourse(course);
    const workflow: WorkflowRecord = {
      workflowId: "workflow-complete",
      courseId: course.courseId,
      kind: "rebuild",
      state: "waiting",
      phase: "review",
      phaseCursor: "complete",
      waitingReason: "review",
      attempt: 0,
      baseCourseRevision: course.currentRevision,
      createdAt: NOW,
      updatedAt: NOW
    };
    await store.saveWorkflow(workflow);
    const memory = new Map<string, unknown>();
    const staging = new RebuildStagingStore({
      get: (key) => Promise.resolve({ [String(key)]: memory.get(String(key)) }),
      set: (items) => {
        for (const [key, value] of Object.entries(items)) memory.set(key, value);
        return Promise.resolve();
      },
      remove: (key) => {
        memory.delete(String(key));
        return Promise.resolve();
      }
    });
    await staging.write({
      courseId: course.courseId,
      workflowId: workflow.workflowId,
      stagedAt: NOW,
      assessments: [rebuilt],
      constraints: [],
      facts: [],
      evidence: [],
      reviewItems: [],
      changes: [],
      taskACoverage: {
        succeededSourceIds: ["source-ok"],
        relevantSourceIds: ["source-ok"],
        failedSources: []
      }
    });
    const handler = new ViewHandler({
      store,
      database,
      staging,
      session: { get: () => Promise.resolve(undefined), set: () => Promise.resolve() },
      views: { build: vi.fn() } as unknown as ViewBuilder,
      engine: {} as WorkflowEngine,
      surfaceRoutes: new Map(),
      now: () => new Date(NOW),
      driveWorkflow: vi.fn(),
      resolveScanTab: () => Promise.resolve(undefined),
      exportBackup: () => Promise.resolve(),
      exportCalendar: () => Promise.resolve(),
      setApiKey: () => Promise.resolve(),
      validateApiKey: () => Promise.resolve("valid"),
      setAuthorization: () => Promise.resolve(),
      productVersion: "0.2.0"
    });

    const response = await handler.handle({
      contract: V2_MESSAGE_CONTRACT,
      type: "MUTATE",
      surface: "full-page",
      courseId: course.courseId,
      expectedRevision: course.currentRevision,
      mutation: { kind: "UseRebuiltCourse" }
    });

    expect(response.ok).toBe(true);
    expect((await store.readSnapshot(course.courseId))?.assessments).toEqual([rebuilt]);
    expect(await staging.read(course.courseId, workflow.workflowId)).toBeNull();
    expect(await store.readWorkflow(workflow.workflowId)).toMatchObject({
      state: "complete",
      phase: "review",
      phaseCursor: "complete"
    });
  });
});
