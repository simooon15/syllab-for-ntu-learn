import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  BRIEF_ITEMS_STORE,
  CANDIDATES_STORE,
  NORMALIZED_UNITS_STORE,
  PARSED_SOURCES_STORE,
  REVIEW_PROGRESS_STORE,
  openLocalDatabase,
  requestResult,
  transactionComplete
} from "../repository/local-database";
import { calendarFileName, exportCalendar } from "./calendar-export";
import { DURABLE_TABLES, type DurableTable } from "./domain";
import {
  isInternalIdentifier,
  LEGACY_IMPORT_SEMESTER_ID,
  LEGACY_MIGRATION_KEY,
  migrateLegacyDatabase,
  type LegacyCourseSummary,
  type LegacyMigrationResult
} from "./migration";
import { LocalDatabase } from "./storage";
import { LocalStore } from "./store";
import { withDates } from "./testing";

const NOW = "2026-09-19T00:00:00.000Z";

interface LegacySeed {
  candidates?: Record<string, unknown>[];
  progress?: Record<string, unknown>[];
  briefItems?: Record<string, unknown>[];
  parsedSources?: Record<string, unknown>[];
  normalizedUnits?: Record<string, unknown>[];
}

const databases: LocalDatabase[] = [];

/** The v0.1.0 opener hard-codes the database name, so every test shares one and cleans up. */
function newDatabase(): LocalDatabase {
  const database = new LocalDatabase();
  databases.push(database);
  return database;
}

async function deleteDatabase(): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("syllab-local");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

/** Writes a v0.1.0 snapshot through the v0.1.0 opener itself, as a real upgrade would find it. */
async function seedLegacy(seed: LegacySeed): Promise<void> {
  const database = await openLocalDatabase();
  const transaction = database.transaction(
    [
      CANDIDATES_STORE,
      REVIEW_PROGRESS_STORE,
      BRIEF_ITEMS_STORE,
      PARSED_SOURCES_STORE,
      NORMALIZED_UNITS_STORE
    ],
    "readwrite"
  );
  const put = (store: string, rows: Record<string, unknown>[] = []): void => {
    for (const row of rows) transaction.objectStore(store).put(row);
  };
  put(CANDIDATES_STORE, seed.candidates);
  put(REVIEW_PROGRESS_STORE, seed.progress);
  put(BRIEF_ITEMS_STORE, seed.briefItems);
  put(PARSED_SOURCES_STORE, seed.parsedSources);
  put(NORMALIZED_UNITS_STORE, seed.normalizedUnits);
  await transactionComplete(transaction);
  database.close();
}

function briefItem(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    briefItemId: "brief-a",
    courseId: "course-1",
    kind: "assessment",
    origin: "candidate",
    status: "Confirmed",
    currentValue: {},
    fieldStates: {},
    sourceCandidateRefs: [],
    evidenceRefs: [],
    updatedAt: NOW,
    ...overrides
  };
}

function unit(locator: string, text: string): Record<string, unknown> {
  return {
    unitId: `unit-${locator}`,
    scanId: "scan-1",
    courseId: "course-1",
    sourceId: "content:item-1",
    sourceType: "assignment",
    title: "Project brief",
    path: [],
    locator,
    text,
    contentHash: `hash-${locator}`
  };
}

function candidate(candidateId: string, courseId: string, scanId: string, status: string) {
  return {
    candidateId,
    courseId,
    scanId,
    status,
    semanticKey: candidateId,
    kind: "assessment",
    proposedValue: {},
    evidenceRefs: [],
    createdAt: NOW,
    providerResponse: { provider: "deepseek", model: "deepseek-flash", requestId: "request-1" }
  };
}

const SUMMARIES: LegacyCourseSummary[] = [
  {
    courseId: "course-1",
    courseCode: "MA6081",
    courseName: "Fundamentals of Project Management"
  },
  // E3: v0.1.0 could carry a Blackboard internal id where a course name belongs.
  { courseId: "course-2", courseCode: "_24680_1", courseName: "24680_1" },
  { courseId: "course-3", courseCode: "AB1201", courseName: "_12345_2" }
];

/** A synthetic v0.1.0 library: two confirmed objects, one orphan, one course-wide rule. */
async function seedLibrary(): Promise<void> {
  await seedLegacy({
    briefItems: [
      briefItem({
        briefItemId: "brief-project",
        semanticKey: "group-project",
        currentValue: { title: "Group Project" },
        evidenceRefs: [{ sourceId: "content:item-1", locator: "page-1" }]
      }),
      briefItem({
        briefItemId: "brief-project-date",
        kind: "important_date",
        parentBriefItemId: "brief-project",
        parentSemanticKey: "group-project",
        currentValue: { date: "2026-11-12", time: "23:59" },
        evidenceRefs: [{ sourceId: "content:item-1", locator: "page-2" }]
      }),
      briefItem({
        briefItemId: "brief-project-rule",
        kind: "important_rule",
        parentBriefItemId: "brief-project",
        status: "EditedConfirmed",
        currentValue: { rule: "Group size is 5" }
      }),
      briefItem({
        briefItemId: "brief-project-unresolved",
        kind: "important_date",
        parentBriefItemId: "brief-project",
        currentValue: { what: "CA1 batches" },
        fieldStates: {
          date: {
            status: "Unresolved",
            candidateValues: ["2026-11-12", "2026-11-13"],
            evidenceRefs: []
          }
        }
      }),
      briefItem({
        briefItemId: "brief-orphan",
        kind: "important_date",
        scope: "assessment",
        parentBriefItemId: "brief-missing",
        currentValue: { date: "2026-12-01" },
        sourceCandidateRefs: ["candidate-9"],
        evidenceRefs: [{ sourceId: "content:item-1", locator: "page-9" }]
      }),
      briefItem({
        briefItemId: "brief-course-rule",
        kind: "important_rule",
        scope: "course",
        currentValue: { content: "Attendance is compulsory." }
      }),
      briefItem({
        briefItemId: "brief-course-date",
        kind: "important_date",
        scope: "course",
        currentValue: { deadline: "2026-12-03" }
      }),
      // Never confirmed in v0.1.0, so it is not part of the accepted state.
      briefItem({
        briefItemId: "brief-ignored",
        status: "Ignored",
        currentValue: { title: "Draft" }
      }),
      briefItem({
        briefItemId: "brief-course-2",
        courseId: "course-2",
        currentValue: { title: "Final Exam" }
      })
    ],
    parsedSources: [
      {
        recordId: "record-1",
        scanId: "scan-1",
        courseId: "course-1",
        sourceId: "content:item-1",
        sourceType: "assignment",
        title: "Project brief",
        path: [],
        result: { format: "pdf", status: "parsed", units: [] }
      }
    ],
    normalizedUnits: [
      unit("page-1", "Group Project brief text"),
      unit("page-2", "Due 12 November")
    ],
    candidates: [
      candidate("candidate-1", "course-1", "scan-1", "Confirmed"),
      candidate("candidate-2", "course-1", "scan-1", "NeedsReview"),
      candidate("candidate-3", "course-2", "scan-2", "Confirmed")
    ],
    progress: [
      { scanId: "scan-1", total: 2, reviewed: 1, detected: 0, needsReview: 1, complete: false },
      { scanId: "scan-2", total: 1, reviewed: 1, detected: 0, needsReview: 0, complete: false }
    ]
  });
}

async function migrate(input?: {
  summaries?: LegacyCourseSummary[];
  database?: LocalDatabase;
}): Promise<{ database: LocalDatabase; result: LegacyMigrationResult }> {
  const database = input?.database ?? newDatabase();
  const result = await migrateLegacyDatabase({
    database,
    courseSummaries: input?.summaries ?? SUMMARIES,
    now: NOW
  });
  return { database, result };
}

async function readDurable(
  database: LocalDatabase
): Promise<Record<DurableTable, Record<string, unknown>[]>> {
  return new LocalStore(database).readDurableTables();
}

async function legacyRows(
  database: LocalDatabase,
  store: string
): Promise<Record<string, unknown>[]> {
  const connection = await database.open();
  const transaction = connection.transaction([store], "readonly");
  const rows = (await requestResult(transaction.objectStore(store).getAll())) as Record<
    string,
    unknown
  >[];
  await transactionComplete(transaction);
  return rows;
}

beforeEach(async () => {
  await deleteDatabase();
});

afterEach(async () => {
  for (const database of databases.splice(0)) await database.close();
  await deleteDatabase();
});

describe("v0.1.0 → v0.2.0 migration", () => {
  it("records nothing on a clean install", async () => {
    const { database, result } = await migrate({ summaries: [] });
    expect(result).toMatchObject({ status: "nothing-to-migrate", courseIds: [] });
    // No marker is written, so a later run with the real course index still imports.
    const marker = await database.read(["appMetadata"], (transaction) =>
      transaction.get("appMetadata", LEGACY_MIGRATION_KEY)
    );
    expect(marker).toBeUndefined();
    expect(await new LocalStore(database).readCourses()).toEqual([]);
  });

  it("imports a real v0.1.0 library into the v0.2.0 model", async () => {
    await seedLibrary();
    const { database, result } = await migrate();

    expect(result.status).toBe("migrated");
    expect(result.courseIds).toEqual(["course-1", "course-2", "course-3"]);
    expect(result.skippedCourseIds).toEqual([]);
    expect(result.counts).toEqual({
      semesters: 1,
      courses: 3,
      courseStates: 2,
      assessments: 2,
      constraints: 1,
      facts: 5,
      sources: 1,
      evidence: 2,
      reviewItems: 1,
      history: 3,
      workflows: 2
    });

    const store = new LocalStore(database);
    const courses = await store.readCourses();
    expect(courses).toHaveLength(3);
    expect(courses[0]).toMatchObject({
      courseId: "course-1",
      semesterId: LEGACY_IMPORT_SEMESTER_ID,
      courseCode: "MA6081",
      courseName: "Fundamentals of Project Management",
      established: true,
      currentRevision: 1
    });
    expect(await store.readSemesters()).toEqual([
      {
        semesterId: LEGACY_IMPORT_SEMESTER_ID,
        nativeSemesterId: LEGACY_IMPORT_SEMESTER_ID,
        label: "Imported from Syllab v0.1.0",
        // Imported courses must never become the Current Semester that checking may spend on.
        status: "Historical",
        discoveredAt: NOW,
        updatedAt: NOW
      }
    ]);

    const snapshot = await store.readSnapshot("course-1");
    expect(snapshot?.assessments).toEqual([
      {
        assessmentId: "assessment_legacy_brief-project",
        courseId: "course-1",
        role: "assessment",
        kind: "other",
        name: "Group Project",
        aliases: [],
        marks: [],
        createdBy: "migration",
        createdAt: NOW,
        updatedAt: NOW
      }
    ]);
    expect(snapshot?.constraints).toEqual([
      {
        constraintId: "constraint_legacy_brief-course-rule",
        courseId: "course-1",
        content: "Attendance is compulsory.",
        evidenceRefs: [],
        marks: [],
        createdBy: "migration",
        updatedAt: NOW
      }
    ]);

    // Confirmed children become typed facts on the object they were confirmed under. Two items
    // that disagree about one field become one unsettled field with both values kept: the
    // confirmed date and the unresolved one never silently become one settled date.
    const ownFacts = (snapshot?.facts ?? []).filter(
      (fact) => fact.assessmentId === "assessment_legacy_brief-project"
    );
    expect(ownFacts.map((fact) => [fact.field, fact.value])).toEqual([
      [
        "date",
        {
          state: "UNCERTAIN",
          value: "2026-11-12",
          competingValues: ["2026-11-12", "2026-11-13"]
        }
      ],
      ["time", { state: "KNOWN", value: "23:59" }],
      ["rule", { state: "KNOWN", value: "Group size is 5" }],
      ["what", { state: "KNOWN", value: "CA1 batches" }]
    ]);
    // An edited confirmation keeps its mark; a course-scope date belongs to the course itself.
    expect(ownFacts.find((fact) => fact.field === "rule")?.marks).toEqual(["Edited"]);
    const tables = await readDurable(database);
    expect(tables.facts).toContainEqual(
      expect.objectContaining({
        factId: "fact_legacy_brief-course-date:deadline",
        field: "deadline",
        value: { state: "KNOWN", value: "2026-12-03" }
      })
    );

    // Evidence lineage: the reference survives with its exact source and locator, and an excerpt
    // is recorded only where the original text still exists.
    expect(tables.evidence.map((row) => [row["locator"], row["excerpt"]])).toEqual([
      ["page-1", "Group Project brief text"],
      ["page-2", "Due 12 November"]
    ]);
    const dateFact = tables.facts.find(
      (row) => row["factId"] === "fact_legacy_brief-project-date:date"
    );
    const references = (dateFact?.["evidenceRefs"] ?? []) as Array<{
      sourceId: string;
      locator: string;
      evidenceId: string;
    }>;
    expect(references.map((reference) => [reference.sourceId, reference.locator])).toEqual([
      ["content:item-1", "page-1"],
      ["content:item-1", "page-2"]
    ]);
    // Every reference the fact keeps names an excerpt that was actually recorded.
    const recorded = new Set(tables.evidence.map((row) => row["evidenceId"]));
    expect(references.every((reference) => recorded.has(reference.evidenceId))).toBe(true);
    expect(tables.sources).toEqual([
      {
        sourceId: "content:item-1",
        courseId: "course-1",
        nativeItemId: "item-1",
        kind: "assignment",
        title: "Project brief",
        updatedAt: NOW
      }
    ]);

    // Unresolved ownership becomes a migration Review Item that keeps everything v0.1.0 knew, and
    // nothing is invented for it: no assessment is created and no excerpt is fabricated.
    const [reviewItem] = snapshot?.reviewItems ?? [];
    expect(reviewItem).toMatchObject({
      reviewItemId: "review_legacy_brief-orphan",
      courseId: "course-1",
      kind: "identity",
      changeType: "IDENTITY_UNCERTAIN",
      targetId: "course-1"
    });
    expect(reviewItem?.payload).toMatchObject({
      migration: true,
      legacyBriefItemId: "brief-orphan",
      parentBriefItemId: "brief-missing",
      sourceCandidateRefs: ["candidate-9"],
      evidenceRefs: [{ sourceId: "content:item-1", locator: "page-9" }]
    });
    expect(tables.assessments.map((row) => row["assessmentId"])).not.toContain(
      "assessment_legacy_brief-orphan"
    );
    expect(tables.evidence.map((row) => row["locator"])).not.toContain("page-9");

    // An in-flight scan becomes a resumable legacy import; a scan with nothing left to review
    // becomes a safe failed record instead of a workflow that pretends it can resume.
    const workflows = await store.listWorkflows();
    expect(
      workflows.map((workflow) => [
        workflow.courseId,
        workflow.state,
        workflow.waitingReason ?? null
      ])
    ).toEqual([
      ["course-1", "saved", "review"],
      ["course-2", "failed", null]
    ]);
    expect(workflows.every((workflow) => workflow.paidRetryAvailable === false)).toBe(true);
    expect(workflows.every((workflow) => workflow.phaseCursor === "legacy-import")).toBe(true);
    expect(workflows[1]?.errorCode).toBe("LEGACY_IMPORT_UNRESUMABLE");

    expect(tables.history.map((row) => [row["courseId"], row["event"], row["note"]])).toEqual([
      ["course-1", "MIGRATED", "legacy-import"],
      ["course-2", "MIGRATED", "legacy-import"],
      ["course-3", "MIGRATED", "legacy-import"]
    ]);

    // Migrated state feeds the calendar path: the settled course-level date exports, and the
    // contested date on the assessment stays out instead of being settled for the user.
    const migratedCourse = courses.find((entry) => entry.courseId === "course-1");
    if (!migratedCourse) throw new Error("MIGRATED_COURSE_MISSING");
    const calendar = exportCalendar(
      withDates({
        course: migratedCourse,
        assessments: snapshot?.assessments ?? [],
        constraints: snapshot?.constraints ?? [],
        facts: snapshot?.facts ?? [],
        changes: snapshot?.changes ?? []
      }),
      new Date(NOW)
    );
    expect(calendar.events.map((event) => [event.title, event.date])).toEqual([
      ["MA6081 - Deadline", "2026-12-03"]
    ]);
    expect(calendar.fileName).toBe("MA6081.ics");
    expect(calendar.content).not.toContain("24680");
    expect(calendar.content).not.toContain("assessment_legacy");

    // The v0.1.0 stores stay exactly as they were, so a rollback is still possible.
    expect(await legacyRows(database, BRIEF_ITEMS_STORE)).toHaveLength(9);
    expect(await legacyRows(database, CANDIDATES_STORE)).toHaveLength(3);
    expect(await legacyRows(database, REVIEW_PROGRESS_STORE)).toHaveLength(2);
    expect(await legacyRows(database, PARSED_SOURCES_STORE)).toHaveLength(1);
    expect(await legacyRows(database, NORMALIZED_UNITS_STORE)).toHaveLength(2);
  });

  it("fixes E3: an internal course id never becomes a user-visible label or file name", async () => {
    await seedLibrary();
    const { database } = await migrate();
    const courses = await new LocalStore(database).readCourses();
    const byId = new Map(courses.map((course) => [course.courseId, course]));

    // Both labels were internal ids, so the course gets a neutral name instead of the id.
    expect(byId.get("course-2")).toMatchObject({ courseCode: "", courseName: "Imported course" });
    // A usable code wins over an id-shaped name.
    expect(byId.get("course-3")).toMatchObject({ courseCode: "AB1201", courseName: "AB1201" });

    // Whatever label the course ends up with, the internal id is not part of it.
    const second = byId.get("course-2") ?? { courseCode: "", courseName: "" };
    expect(calendarFileName(second)).toBe("Imported course.ics");
    expect(calendarFileName(second)).not.toContain("24680");

    expect(isInternalIdentifier("MA6081")).toBe(false);
    expect(isInternalIdentifier("Fundamentals of Project Management")).toBe(false);
    expect(isInternalIdentifier("AB1201")).toBe(false);
    expect(isInternalIdentifier("24680_1")).toBe(true);
    expect(isInternalIdentifier("_24680_1")).toBe(true);
    expect(isInternalIdentifier("12")).toBe(true);
    expect(isInternalIdentifier("3f7a9c1d20b84e6f5a0d3c7b9e1f2a44")).toBe(true);
    expect(isInternalIdentifier("4a2f6c1e-0b3d-4e5f-9a8b-1c2d3e4f5a6b")).toBe(true);
    expect(isInternalIdentifier("content:item-1")).toBe(true);
  });

  it("imports the course summaries even when no legacy brief was ever written", async () => {
    await seedLegacy({});
    const { database, result } = await migrate();
    expect(result.status).toBe("migrated");
    expect(result.counts).toMatchObject({ courses: 3, assessments: 0, courseStates: 0 });
    const courses = await new LocalStore(database).readCourses();
    expect(courses).toHaveLength(3);
    expect(courses[0]).toMatchObject({ established: false, currentRevision: 0 });
    expect((await readDurable(database)).courseStates).toEqual([]);
  });

  it("is a no-op the second time and never imports twice after a lost marker", async () => {
    await seedLibrary();
    const database = newDatabase();
    const first = await migrate({ database });
    expect(first.result.status).toBe("migrated");
    const afterFirst = await readDurable(database);

    const second = await migrate({ database });
    expect(second.result).toMatchObject({
      status: "already-migrated",
      migratedAt: NOW,
      courseIds: ["course-1", "course-2", "course-3"]
    });
    expect(await readDurable(database)).toEqual(afterFirst);

    // A database that lost its marker but already holds the courses must not import them again.
    await database.write(["appMetadata"], async (transaction) => {
      await transaction.delete("appMetadata", LEGACY_MIGRATION_KEY);
    });
    const third = await migrate({ database });
    expect(third.result.status).toBe("nothing-to-migrate");
    expect(third.result.skippedCourseIds).toEqual(["course-1", "course-2", "course-3"]);
    expect(await readDurable(database)).toEqual(afterFirst);
  });

  it("imports only what is missing, leaves the rest alone and keeps every table readable", async () => {
    await seedLibrary();
    const database = newDatabase();
    await migrate({ database, summaries: SUMMARIES.slice(0, 2) });
    const partial = await readDurable(database);
    expect(partial.assessments).toHaveLength(2);

    await database.write(["appMetadata"], async (transaction) => {
      await transaction.delete("appMetadata", LEGACY_MIGRATION_KEY);
    });
    const rest = await migrate({ database });
    expect(rest.result.status).toBe("migrated");
    expect(rest.result.courseIds).toEqual(["course-3"]);
    expect(rest.result.skippedCourseIds).toEqual(["course-1", "course-2"]);

    const after = await readDurable(database);
    // Nothing the first run imported changed or doubled.
    expect(after.assessments).toEqual(partial.assessments);
    expect(after.courses).toHaveLength(3);
    for (const table of DURABLE_TABLES) expect(Array.isArray(after[table])).toBe(true);
  });
});
