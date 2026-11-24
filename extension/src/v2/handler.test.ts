import { requirePresent } from "./errors";
import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { V2_MESSAGE_CONTRACT } from "./contract";
import type { AssessmentRecord, CourseRecord, WorkflowRecord } from "./domain";
import { ViewHandler } from "./handler";
import { RebuildStagingStore } from "./staging";
import { LocalDatabase, DATABASE_NAME } from "./storage";
import { LocalStore } from "./store";
import { ViewBuilder } from "./view";
import type { WorkflowEngine } from "./workflow";
import { makeCourse } from "./testing";

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
  it("browses without approval, persists the cursor, and Defer advances while retaining the pending scope", async () => {
    const database = new LocalDatabase(),
      store = new LocalStore(database);
    await store.initialize();
    const course: CourseRecord = {
      courseId: "navigation",
      semesterId: "semester",
      courseCode: "ZZ1000",
      courseName: "Synthetic navigation course",
      curriculum: true,
      established: false,
      currentRevision: 1,
      consecutiveCheckFailures: 0,
      updatedAt: NOW
    };
    await store.upsertCourse(course);
    await store.writeDraft({
      assessments: ["a", "b"].map((id) => ({
        assessmentId: id,
        courseId: course.courseId,
        role: "assessment" as const,
        kind: "assignment" as const,
        name: id,
        aliases: [],
        marks: [],
        createdBy: "ai" as const,
        createdAt: NOW,
        updatedAt: NOW
      })),
      reviewItems: ["a", "b"].map((id) => ({
        reviewItemId: id,
        courseId: course.courseId,
        workflowId: "wf",
        kind: "initial" as const,
        targetId: id,
        payload: {
          productScope: true,
          ownerScope: true,
          scopeFactIds: [],
          scopeVersions: [],
          scopeTitle: id
        },
        createdAt: NOW,
        updatedAt: NOW
      }))
    });
    const memory = new Map<string, unknown>();
    const views = new ViewBuilder({
      store,
      productVersion: "0.3.0",
      settings: async () =>
        await Promise.resolve({
          apiKey: { state: "missing" },
          privacy: false,
          apiUsage: false,
          version: "0.3.0"
        })
    });
    const options = {
      store,
      database,
      staging: new RebuildStagingStore({
        get: async () => await Promise.resolve({}),
        set: async () => {
          await Promise.resolve();
        },
        remove: async () => {
          await Promise.resolve();
        }
      }),
      session: {
        get: async (key: string) => await Promise.resolve(memory.get(key)),
        set: async (key: string, value: unknown) => {
          await Promise.resolve();

          memory.set(key, value);
        }
      },
      views,
      engine: {} as WorkflowEngine,
      surfaceRoutes: new Map(),
      now: () => new Date(NOW),
      driveWorkflow: vi.fn(),
      resolveScanTab: async () => await Promise.resolve(undefined),
      exportBackup: async () => {
        await Promise.resolve();
      },
      exportCalendar: async () => {
        await Promise.resolve();
      },
      setApiKey: async () => {
        await Promise.resolve();
      },
      validateApiKey: async () => await Promise.resolve("valid" as const),
      setAuthorization: async () => {
        await Promise.resolve();
      },
      productVersion: "0.3.0"
    };
    let handler = new ViewHandler(options);
    const opened = await handler.handle({
      contract: V2_MESSAGE_CONTRACT,
      type: "OPEN_SCREEN",
      surface: "full-page",
      screen: "IRV-01",
      courseId: course.courseId,
      reviewItemId: "b"
    });
    expect(opened.ok && opened.view.review?.reviewItemId).toBe("b");
    expect(await store.readDecisions(course.courseId)).toEqual([]);
    expect(requirePresent(await store.readTrustedSnapshot(course.courseId)).assessments).toEqual(
      []
    );
    handler = new ViewHandler({ ...options, surfaceRoutes: new Map() });
    const restored = await handler.handle({
      contract: V2_MESSAGE_CONTRACT,
      type: "GET_VIEW",
      surface: "full-page"
    });
    expect(restored.ok && restored.view.review?.reviewItemId).toBe("b");
    const deferred = await handler.handle({
      contract: V2_MESSAGE_CONTRACT,
      type: "MUTATE",
      surface: "full-page",
      courseId: course.courseId,
      expectedRevision: 1,
      mutation: { kind: "DeferReviewItem", reviewItemId: "b" }
    });
    expect(deferred.ok && deferred.view.review?.reviewItemId).toBe("a");
    expect(requirePresent(await store.readSnapshot(course.courseId)).reviewItems).toHaveLength(2);
    expect(requirePresent(await store.readTrustedSnapshot(course.courseId)).assessments).toEqual(
      []
    );
    expect((await store.readDecisions(course.courseId)).map((d) => d.kind)).toEqual(["Defer"]);
  });
});

describe("Change and identity dependency audit", () => {
  it.each(["KeepCurrent", "ResolveIdentity"] as const)(
    "%s rejects a changed source, then atomically saves the reviewed proposal and removes its queue entry",
    async (kind) => {
      const database = new LocalDatabase(),
        store = new LocalStore(database);
      await store.initialize();
      const course = makeCourse({ courseId: "dependencies-" + kind, currentRevision: 1 });
      await store.upsertCourse(course);
      const source = {
        sourceId: "source-" + kind,
        courseId: course.courseId,
        nativeItemId: "native",
        kind: "text",
        title: "Synthetic source",
        updatedAt: NOW,
        machine: {
          sourceId: "source-" + kind,
          contentHash: "new",
          canonicalMetadataHash: "metadata",
          structureHash: "structure",
          representationVersion: 1
        }
      };
      const change = {
        changeId: "change-" + kind,
        courseId: course.courseId,
        workflowId: "workflow",
        targetId: "owner",
        changeType:
          kind === "ResolveIdentity" ? ("IDENTITY_UNCERTAIN" as const) : ("CONFLICT" as const),
        currentValue: { state: "KNOWN" as const, value: "saved" },
        latestValue: { state: "KNOWN" as const, value: "proposed" },
        currentEvidenceIds: [],
        newEvidenceIds: [],
        createdAt: NOW,
        updatedAt: NOW,
        reviewSourceDependencies: [{ sourceId: source.sourceId, present: true, contentHash: "old" }]
      };
      const review = {
        reviewItemId: change.changeId,
        courseId: course.courseId,
        workflowId: "workflow",
        kind: kind === "ResolveIdentity" ? ("identity" as const) : ("change" as const),
        targetId: "owner",
        payload: { changeId: change.changeId },
        createdAt: NOW,
        updatedAt: NOW
      };
      await store.writeDraft({ sources: [source], changes: [change], reviewItems: [review] });
      const handler = new ViewHandler({
        store,
        database,
        staging: new RebuildStagingStore({
          get: () => Promise.resolve({}),
          set: () => Promise.resolve(),
          remove: () => Promise.resolve()
        }),
        session: { get: () => Promise.resolve(undefined), set: () => Promise.resolve() },
        views: { build: vi.fn().mockResolvedValue({}) } as unknown as ViewBuilder,
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
        productVersion: "0.3.0"
      });
      const mutation =
        kind === "KeepCurrent"
          ? { kind, changeId: change.changeId }
          : { kind, changeId: change.changeId, relationship: "DIFFERENT_ASSESSMENT" as const };
      const message = {
        contract: V2_MESSAGE_CONTRACT,
        type: "MUTATE" as const,
        surface: "full-page" as const,
        courseId: course.courseId,
        expectedRevision: 1,
        mutation
      };
      expect(await handler.handle(message)).toMatchObject({
        ok: false,
        error: { code: "REVIEW_SCOPE_CHANGED" }
      });
      expect(await store.readDecisions(course.courseId)).toEqual([]);
      expect((await store.readSnapshot(course.courseId))?.reviewItems).toContainEqual(review);
      await store.writeDraft({
        sources: [{ ...source, machine: { ...source.machine, contentHash: "old" } }]
      });
      const readSources = store.readAllSourceStates.bind(store);
      vi.spyOn(store, "readAllSourceStates").mockImplementationOnce(async (id) => {
        await store.writeDraft({ changes: [{ ...change, updatedAt: "2026-10-12T00:00:00Z" }] });
        return await readSources(id);
      });
      expect(await handler.handle(message)).toMatchObject({
        ok: false,
        error: { code: "REVIEW_SCOPE_CHANGED" }
      });
      expect(await store.readDecisions(course.courseId)).toEqual([]);
      expect((await store.readSnapshot(course.courseId))?.reviewItems).toContainEqual(review);
      await store.writeDraft({ changes: [change] });
      vi.spyOn(store, "deleteReviewItems").mockRejectedValue(Error("NON_ATOMIC_QUEUE_DELETE"));
      expect(await handler.handle(message)).toMatchObject({ ok: true });
      const after = requirePresent(await store.readSnapshot(course.courseId));
      expect(after.changes).toEqual([]);
      expect(after.reviewItems).toEqual([]);
      const decision = requirePresent((await store.readDecisions(course.courseId))[0]);
      expect(decision.details).toMatchObject({
        reviewDependencyBound: true,
        courseRevision: 1,
        reviewedChange: change,
        reviewedItems: [review],
        sourceDependencies: change.reviewSourceDependencies
      });
      expect(decision.details?.productScope).toBeUndefined(); // An identity/change decision is not base approval.
    }
  );
});
