import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import { createBackup, DURABLE_TABLES, durableRow, type DurableTable } from "./backup";
import {
  applyRestore,
  parseBackup,
  prepareRestore,
  restoreBackup,
  RestoreError,
  type PreparedRestore
} from "./restore";
import {
  API_USAGE_AUTH_STORAGE,
  DEEPSEEK_KEY_STORAGE,
  PRIVACY_AUTH_STORAGE,
  SettingsRepository,
  type LocalSettingsStorage
} from "./settings";
import { V2_STORES } from "./schema";
import { LocalDatabase } from "./storage";
import { LocalStore } from "./store";

const NOW = "2026-09-19T00:00:00.000Z";
const SYNTHETIC_KEY = "synthetic-key-value-0000";

let databases = 0;

function database(): LocalDatabase {
  databases += 1;
  return new LocalDatabase(indexedDB, `restore-test-${String(databases)}`);
}

function tables(): Record<DurableTable, Record<string, unknown>[]> {
  return Object.fromEntries(DURABLE_TABLES.map((table) => [table, []])) as unknown as Record<
    DurableTable,
    Record<string, unknown>[]
  >;
}

function course(courseId: string, semesterId: string): Record<string, unknown> {
  return {
    courseId,
    semesterId,
    courseCode: "MA6081",
    courseName: "Fundamentals of Project Management",
    curriculum: true,
    established: true,
    currentRevision: 3,
    consecutiveCheckFailures: 0,
    updatedAt: NOW
  };
}

const SOURCE = {
  sourceId: "content:item-1",
  courseId: "course-1",
  nativeItemId: "item-1",
  kind: "assignment",
  title: "Project brief",
  updatedAt: NOW
};

/** A complete, synthetic local state covering every PRD-listed durable category. */
function localState(): Record<DurableTable, Record<string, unknown>[]> {
  const state = tables();
  state.semesters.push(
    {
      semesterId: "semester-2",
      nativeSemesterId: "native-2",
      label: "AY2026/27 · Semester 1",
      status: "Current",
      discoveredAt: NOW,
      updatedAt: NOW
    },
    {
      semesterId: "semester-1",
      nativeSemesterId: "native-1",
      label: "AY2025/26 · Semester 2",
      status: "Historical",
      discoveredAt: NOW,
      updatedAt: NOW
    }
  );
  state.courses.push(course("course-1", "semester-2"), course("course-2", "semester-1"));
  state.courseStates.push({ courseId: "course-1", revision: 3, updatedAt: NOW });
  state.assessments.push(
    {
      assessmentId: "assessment-1",
      courseId: "course-1",
      role: "assessment",
      kind: "project",
      name: "Group Project",
      aliases: [],
      marks: ["Changed"],
      createdBy: "ai",
      createdAt: NOW,
      updatedAt: NOW
    },
    {
      assessmentId: "assessment-2",
      courseId: "course-1",
      parentAssessmentId: "assessment-1",
      role: "component",
      kind: "project",
      name: "Written report",
      aliases: ["Write-up"],
      marks: ["Edited"],
      createdBy: "user",
      createdAt: NOW,
      updatedAt: NOW
    },
    {
      assessmentId: "assessment-3",
      courseId: "course-2",
      role: "assessment",
      kind: "exam",
      name: "Final Exam",
      aliases: [],
      marks: [],
      createdBy: "migration",
      createdAt: NOW,
      updatedAt: NOW
    }
  );
  state.constraints.push({
    constraintId: "constraint-1",
    courseId: "course-1",
    content: "Attendance is compulsory.",
    evidenceRefs: [{ sourceId: "content:item-1", locator: "page-1" }],
    marks: [],
    createdBy: "ai",
    updatedAt: NOW
  });
  state.sources.push({ ...SOURCE, parsed: { text: "cached source bytes", structure: ["body"] } });
  state.evidence.push({
    evidenceId: "evidence-1",
    courseId: "course-1",
    sourceId: "content:item-1",
    locator: "page-1",
    excerpt: "Due 12 Nov",
    capturedAt: NOW
  });
  state.facts.push(
    {
      factId: "fact-1",
      courseId: "course-1",
      assessmentId: "assessment-1",
      field: "due_date",
      value: { state: "KNOWN", value: "2026-11-12" },
      evidenceRefs: [{ sourceId: "content:item-1", locator: "page-1", evidenceId: "evidence-1" }],
      marks: [],
      updatedAt: NOW
    },
    {
      factId: "fact-2",
      courseId: "course-1",
      constraintId: "constraint-1",
      field: "requirement",
      value: { state: "KNOWN", value: "Attend every session" },
      evidenceRefs: [],
      marks: [],
      updatedAt: NOW
    },
    {
      factId: "fact-3",
      courseId: "course-2",
      assessmentId: "assessment-3",
      field: "exam_date",
      value: { state: "UNCERTAIN", value: "2026-12-03", competingValues: ["2026-12-04"] },
      evidenceRefs: [],
      marks: ["PossiblyRemoved"],
      updatedAt: NOW
    }
  );
  state.reviewItems.push({
    reviewItemId: "review-1",
    courseId: "course-2",
    workflowId: "workflow-1",
    kind: "initial",
    targetId: "assessment-3",
    payload: { assessment: { assessmentId: "assessment-3" } },
    createdAt: NOW,
    updatedAt: NOW
  });
  state.reviewDecisions.push({
    decisionId: "decision-1",
    courseId: "course-1",
    reviewItemId: "review-1",
    kind: "Confirm",
    targetId: "assessment-1",
    decidedAt: NOW
  });
  state.exclusionMemory.push({
    memoryId: "memory-1",
    courseId: "course-1",
    proposalKey: "assessment:group-project",
    evidenceFingerprint: "fingerprint-1",
    createdAt: NOW
  });
  state.changes.push({
    changeId: "change-1",
    courseId: "course-1",
    workflowId: "workflow-1",
    targetId: "assessment-1",
    field: "due_date",
    changeType: "CHANGED",
    currentValue: { state: "KNOWN", value: "2026-11-12" },
    latestValue: { state: "KNOWN", value: "2026-11-19" },
    currentEvidenceIds: ["evidence-1"],
    newEvidenceIds: [],
    createdAt: NOW,
    updatedAt: NOW
  });
  state.history.push({
    historyId: "history-1",
    courseId: "course-1",
    revision: 3,
    targetId: "assessment-1",
    event: "ASSESSMENT_CONFIRMED",
    recordedAt: NOW
  });
  return state;
}

async function backupText(state: Record<DurableTable, Record<string, unknown>[]>): Promise<string> {
  return JSON.stringify(await createBackup(state, NOW));
}

async function readAll(
  database: LocalDatabase
): Promise<Record<DurableTable, Record<string, unknown>[]>> {
  return new LocalStore(database).readDurableTables();
}

/** IndexedDB returns rows in key order, so a comparison normalises the order first. */
function byKey(table: DurableTable, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const key = V2_STORES[table];
  return [...rows].sort((left, right) => String(left[key]).localeCompare(String(right[key])));
}

async function restored(
  state: Record<DurableTable, Record<string, unknown>[]>
): Promise<{ database: LocalDatabase; read: Record<DurableTable, Record<string, unknown>[]> }> {
  const target = database();
  await restoreBackup({ database: target, backup: await backupText(state) });
  return { database: target, read: await readAll(target) };
}

async function failureOf(run: () => Promise<unknown>): Promise<RestoreError> {
  try {
    await run();
  } catch (error) {
    if (error instanceof RestoreError) return error;
    throw error;
  }
  throw new Error("EXPECTED_RESTORE_FAILURE");
}

describe("Full Replace restore", () => {
  it("restores every durable table and reports the summary", async () => {
    const state = localState();
    const result = await restored(state);
    for (const table of DURABLE_TABLES) {
      if (table === "sources") continue;
      expect(byKey(table, result.read[table])).toEqual(byKey(table, state[table]));
    }
    // The source keeps its identity, its machine representation fields and its title, but never
    // the cached parse text: that is a derived byte cache, not user state.
    expect(result.read.sources).toEqual([SOURCE]);

    const prepared = await prepareRestore(parseBackup(await backupText(state)));
    // Component and series instances are nested inside an assessment, so the summary counts the
    // top-level assessments the user actually sees.
    expect(prepared.summary).toEqual({
      semesters: ["AY2026/27 · Semester 1", "AY2025/26 · Semester 2"],
      courseCount: 2,
      assessmentCount: 2
    });
  });

  it("moves the active generation so every restored row is readable from the new one", async () => {
    const target = database();
    const state = localState();
    const result = await restoreBackup({ database: target, backup: await backupText(state) });
    expect(await target.readGeneration()).toBe(result.generation);
    const store = new LocalStore(target);
    expect((await store.readCourses()).map((row) => row.courseId).sort()).toEqual([
      "course-1",
      "course-2"
    ]);
    expect(await store.readSnapshot("course-1")).toMatchObject({
      course: { courseId: "course-1", currentRevision: 3 },
      assessments: [{ assessmentId: "assessment-1" }, { assessmentId: "assessment-2" }]
    });
  });

  it("enforces size, depth and count limits before anything is written", async () => {
    const text = await backupText(localState());
    const limits = { maxBytes: 2000, maxDepth: 32, maxRecords: 250_000 };
    const rejections: Array<{ detail: string; run: () => Promise<unknown> }> = [
      { detail: "bytes:", run: () => Promise.resolve(parseBackup(text, limits)) },
      {
        detail: "parse",
        run: () =>
          Promise.resolve(parseBackup("{ not a document", { ...limits, maxBytes: 1_000_000 }))
      },
      {
        detail: "depth:",
        run: () =>
          Promise.resolve(
            parseBackup(JSON.stringify({ payload: [[[[[[1]]]]]] }), {
              maxBytes: 1_000_000,
              maxDepth: 3,
              maxRecords: 10
            })
          )
      },
      {
        detail: "records:",
        run: () =>
          restoreBackup({
            database: database(),
            backup: text,
            limits: { maxBytes: 1_000_000, maxDepth: 32, maxRecords: 10 }
          })
      }
    ];
    for (const rejection of rejections) {
      const error = await failureOf(rejection.run);
      // One code for every unusable file, with the reason kept for Details.
      expect(error.code).toBe("BACKUP_INVALID");
      expect(error.detail).toContain(rejection.detail);
    }
  });

  it("refuses tampering, unsupported versions and unsupported enums", async () => {
    const target = database();
    const state = localState();
    await restoreBackup({ database: target, backup: await backupText(state) });
    const before = await readAll(target);

    const tampered = JSON.parse(await backupText(state)) as {
      payload: Record<DurableTable, Record<string, unknown>[]>;
    };
    tampered.payload.courses[0] = { ...tampered.payload.courses[0], courseName: "Rewritten" };
    expect(
      (await failureOf(() => restoreBackup({ database: target, backup: tampered }))).code
    ).toBe("BACKUP_DIGEST_MISMATCH");

    const future = JSON.parse(await backupText(state)) as { formatVersion: number };
    future.formatVersion = 99;
    expect((await failureOf(() => restoreBackup({ database: target, backup: future }))).code).toBe(
      "BACKUP_FORMAT_UNSUPPORTED"
    );

    const unknownEnum = localState();
    unknownEnum.assessments[0] = { ...unknownEnum.assessments[0], role: "series_group" };
    const unknownEnumText = await backupText(unknownEnum);
    expect(
      (await failureOf(() => restoreBackup({ database: target, backup: unknownEnumText }))).code
    ).toBe("BACKUP_INVALID");

    expect(await readAll(target)).toEqual(before);
  });

  it("refuses a payload whose references do not resolve", async () => {
    const dangling = [
      (state: Record<DurableTable, Record<string, unknown>[]>) => {
        state.facts[0] = { ...state.facts[0], assessmentId: "assessment-gone" };
      },
      (state: Record<DurableTable, Record<string, unknown>[]>) => {
        state.evidence[0] = { ...state.evidence[0], sourceId: "content:gone" };
      },
      (state: Record<DurableTable, Record<string, unknown>[]>) => {
        state.changes[0] = { ...state.changes[0], currentEvidenceIds: ["evidence-gone"] };
      },
      (state: Record<DurableTable, Record<string, unknown>[]>) => {
        state.courses[0] = { ...state.courses[0], semesterId: "semester-gone" };
      },
      (state: Record<DurableTable, Record<string, unknown>[]>) => {
        state.assessments[1] = { ...state.assessments[1], parentAssessmentId: "assessment-gone" };
      }
    ];
    for (const damage of dangling) {
      const state = localState();
      damage(state);
      const error = await failureOf(async () =>
        prepareRestore(parseBackup(await backupText(state)))
      );
      expect(error.code).toBe("BACKUP_INVALID");
      expect(error.detail).toContain("gone");
    }
  });

  it("keeps the previous state when validation fails", async () => {
    const target = database();
    await restoreBackup({ database: target, backup: await backupText(localState()) });
    const before = await readAll(target);

    const broken = localState();
    broken.reviewItems[0] = { ...broken.reviewItems[0], targetId: "assessment-gone" };
    const brokenText = await backupText(broken);
    expect(
      (await failureOf(() => restoreBackup({ database: target, backup: brokenText }))).code
    ).toBe("BACKUP_INVALID");

    expect(await readAll(target)).toEqual(before);
    expect(await new LocalStore(target).readSnapshot("course-1")).not.toBeNull();
  });

  it("keeps the previous state when the write fails", async () => {
    const target = database();
    await restoreBackup({ database: target, backup: await backupText(localState()) });
    const before = await readAll(target);
    const generation = await target.readGeneration();

    const prepared = await prepareRestore(parseBackup(await backupText(localState())));
    const poisoned: PreparedRestore = {
      summary: prepared.summary,
      tables: {
        ...prepared.tables,
        // A value IndexedDB cannot structurally clone: the import must abort as a whole.
        courses: [...prepared.tables.courses, { courseId: "course-broken", write: () => undefined }]
      }
    };
    expect((await failureOf(() => applyRestore(target, poisoned))).code).toBe(
      "RESTORE_WRITE_FAILED"
    );

    expect(await readAll(target)).toEqual(before);
    expect(await target.readGeneration()).toBe(generation);
  });

  it("never carries the API key or the authorizations, and never touches them", async () => {
    const values: Record<string, unknown> = {};
    const area: LocalSettingsStorage & { values: Record<string, unknown> } = {
      values,
      get(keys) {
        const list = Array.isArray(keys) ? keys : [keys];
        return Promise.resolve(
          Object.fromEntries(list.filter((key) => key in values).map((key) => [key, values[key]]))
        );
      },
      set(items) {
        Object.assign(values, items);
        return Promise.resolve();
      },
      remove(keys) {
        for (const key of Array.isArray(keys) ? keys : [keys]) Reflect.deleteProperty(values, key);
        return Promise.resolve();
      }
    };
    const settings = new SettingsRepository(area);
    await settings.saveApiKey(SYNTHETIC_KEY);
    await settings.setAuthorization("privacy", true, NOW);
    await settings.setAuthorization("apiUsage", true, NOW);
    const settingsBefore = structuredClone(values);

    const text = await backupText(localState());
    expect(text).not.toContain(SYNTHETIC_KEY);
    expect(text).not.toContain(DEEPSEEK_KEY_STORAGE);
    expect(text).not.toContain(API_USAGE_AUTH_STORAGE);
    expect(text).not.toContain(PRIVACY_AUTH_STORAGE);
    expect(text).not.toContain("parsed");

    await restoreBackup({ database: database(), backup: text });

    expect(values).toEqual(settingsBefore);
    expect(await settings.readApiKeyForTransport()).toBe(SYNTHETIC_KEY);
    expect((await settings.authorizations()).privacy.granted).toBe(true);
    expect((await settings.authorizations()).apiUsage.granted).toBe(true);
  });

  it("drops source-derived cached bytes from a row wherever they appear", () => {
    const row = { sourceId: "content:item-1", parsed: { text: "cached" }, title: "Brief" };
    expect(durableRow("sources", row)).toEqual({ sourceId: "content:item-1", title: "Brief" });
    expect(durableRow("facts", { factId: "fact-1", parsed: "kept" })).toEqual({
      factId: "fact-1",
      parsed: "kept"
    });
  });
});
