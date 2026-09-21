import { randomId } from "./crypto";
import type { CourseSnapshot, MutationResult } from "./course-state";
import type {
  AppMetadataRecord,
  AssessmentRecord,
  ChangeRecord,
  ConstraintRecord,
  CourseRecord,
  CourseStateRecord,
  DurableTable,
  EvidenceRecord,
  FactRecord,
  HistoryRecord,
  ReviewDecisionRecord,
  ReviewItemRecord,
  SemesterRecord,
  SourceObservationRecord,
  SourceRecord,
  WorkflowRecord,
  AiRunRecord
} from "./domain";
import { DURABLE_TABLES, type V2StoreName } from "./domain";
import type { LocalDatabase, Transaction } from "./storage";

/** What a task may add to a Course while it runs, before the user has decided anything. */
export interface DraftBundle {
  assessments: AssessmentRecord[];
  constraints: ConstraintRecord[];
  facts: FactRecord[];
  evidence: EvidenceRecord[];
  reviewItems: ReviewItemRecord[];
  changes: ChangeRecord[];
  sources: SourceRecord[];
  observations: SourceObservationRecord[];
}

const ALL_TABLES: V2StoreName[] = [
  ...DURABLE_TABLES,
  "sourceObservations",
  "workflows",
  "aiRuns",
  "appMetadata"
];

export class LocalStore {
  constructor(private readonly database: LocalDatabase) {}

  async initialize(): Promise<void> {
    await this.database.ensureGeneration();
  }

  async currentGeneration(): Promise<string | null> {
    return this.database.readGeneration();
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  async readSnapshot(courseId: string): Promise<CourseSnapshot | null> {
    return this.database.read(
      [
        "courses",
        "courseStates",
        "assessments",
        "constraints",
        "facts",
        "changes",
        "reviewItems",
        "history"
      ],
      async (transaction) => {
        const course = await transaction.get<CourseRecord>("courses", courseId);
        if (!course) return null;
        const [assessments, constraints, facts, changes, reviewItems, history] = await Promise.all([
          transaction.getAll<AssessmentRecord>("assessments"),
          transaction.getAll<ConstraintRecord>("constraints"),
          transaction.getAll<FactRecord>("facts"),
          transaction.getAll<ChangeRecord>("changes"),
          transaction.getAll<ReviewItemRecord>("reviewItems"),
          transaction.getAll<HistoryRecord>("history")
        ]);
        return {
          course,
          assessments: assessments.filter(
            (item) => item.courseId === courseId && !item.supersededBy
          ),
          constraints: constraints.filter((item) => item.courseId === courseId && !item.superseded),
          facts: facts.filter((item) => item.courseId === courseId && !item.superseded),
          changes: changes.filter((item) => item.courseId === courseId),
          reviewItems: reviewItems.filter((item) => item.courseId === courseId),
          history: history.filter((item) => item.courseId === courseId)
        };
      }
    );
  }

  /**
   * Current Course State excludes unresolved Initial Review drafts and objects the user excluded.
   * The raw rows remain available to Review, exclusion memory, and Undo through `readSnapshot`.
   */
  async readTrustedSnapshot(courseId: string): Promise<CourseSnapshot | null> {
    const [snapshot, decisions] = await Promise.all([
      this.readSnapshot(courseId),
      this.readDecisions(courseId)
    ]);
    if (!snapshot) return null;
    const hidden = new Set(
      snapshot.reviewItems.filter((item) => item.kind === "initial").map((item) => item.targetId)
    );
    for (const decision of decisions) {
      if (decision.kind === "Exclude" && decision.targetId) hidden.add(decision.targetId);
    }
    return {
      ...snapshot,
      assessments: snapshot.assessments.filter((item) => !hidden.has(item.assessmentId)),
      constraints: snapshot.constraints.filter((item) => !hidden.has(item.constraintId)),
      facts: snapshot.facts.filter(
        (item) =>
          (item.assessmentId === undefined || !hidden.has(item.assessmentId)) &&
          (item.constraintId === undefined || !hidden.has(item.constraintId))
      )
    };
  }

  async readCourse(courseId: string): Promise<CourseRecord | null> {
    return this.database.read(["courses"], async (transaction) => {
      return (await transaction.get<CourseRecord>("courses", courseId)) ?? null;
    });
  }

  async readSemesters(): Promise<SemesterRecord[]> {
    return this.database.read(["semesters"], (transaction) =>
      transaction.getAll<SemesterRecord>("semesters")
    );
  }

  async readCourses(): Promise<CourseRecord[]> {
    return this.database.read(["courses"], (transaction) =>
      transaction.getAll<CourseRecord>("courses")
    );
  }

  async readEvidence(evidenceIds: string[]): Promise<EvidenceRecord[]> {
    if (evidenceIds.length === 0) return [];
    return this.database.read(["evidence"], async (transaction) => {
      const all = await transaction.getAll<EvidenceRecord>("evidence");
      const wanted = new Set(evidenceIds);
      return all.filter((item) => wanted.has(item.evidenceId));
    });
  }

  async readHistory(courseId: string): Promise<HistoryRecord[]> {
    return this.database.read(["history"], async (transaction) => {
      const all = await transaction.getAll<HistoryRecord>("history");
      return all
        .filter((item) => item.courseId === courseId)
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt));
    });
  }

  async readDecisions(courseId: string): Promise<ReviewDecisionRecord[]> {
    return this.database.read(["reviewDecisions"], async (transaction) => {
      const all = await transaction.getAll<ReviewDecisionRecord>("reviewDecisions");
      return all.filter((item) => item.courseId === courseId);
    });
  }

  async readExclusionMemory(courseId: string) {
    return this.database.read(["exclusionMemory"], async (transaction) => {
      const all = await transaction.getAll<{
        memoryId: string;
        courseId: string;
        proposalKey: string;
        evidenceFingerprint: string;
        createdAt: string;
      }>("exclusionMemory");
      return all.filter((item) => item.courseId === courseId);
    });
  }

  async readWorkflow(workflowId: string): Promise<WorkflowRecord | null> {
    return this.database.read(["workflows"], async (transaction) => {
      return (await transaction.get<WorkflowRecord>("workflows", workflowId)) ?? null;
    });
  }

  async listWorkflows(): Promise<WorkflowRecord[]> {
    return this.database.read(["workflows"], (transaction) =>
      transaction.getAll<WorkflowRecord>("workflows")
    );
  }

  async readAllSourceStates(courseId: string): Promise<{
    sources: SourceRecord[];
    observations: SourceObservationRecord[];
  }> {
    return this.database.read(["sources", "sourceObservations"], async (transaction) => {
      const [sources, observations] = await Promise.all([
        transaction.getAll<SourceRecord>("sources"),
        transaction.getAll<SourceObservationRecord>("sourceObservations")
      ]);
      return {
        sources: sources.filter((item) => item.courseId === courseId),
        observations: observations.filter((item) => item.courseId === courseId)
      };
    });
  }

  async findAiRun(
    idempotencyKey: string,
    invocationFingerprint?: string
  ): Promise<AiRunRecord | null> {
    return this.database.read(["aiRuns"], async (transaction) => {
      const all = await transaction.getAll<AiRunRecord>("aiRuns");
      return (
        all.find(
          (item) =>
            item.idempotencyKey === idempotencyKey &&
            (invocationFingerprint === undefined ||
              item.invocationFingerprint === invocationFingerprint)
        ) ?? null
      );
    });
  }

  // -------------------------------------------------------------------------
  // Writes
  // -------------------------------------------------------------------------

  /** Persists a decision result and the objects it created in one transaction. */
  async commitMutation(
    courseId: string,
    result: MutationResult,
    extra: {
      reviewItems?: ReviewItemRecord[];
      changes?: ChangeRecord[];
      evidence?: EvidenceRecord[];
    } = {}
  ): Promise<void> {
    await this.database.write(ALL_TABLES, async (transaction) => {
      await transaction.put(
        "courses",
        result.snapshot.course as unknown as Record<string, unknown>
      );
      await transaction.put("courseStates", {
        courseId,
        revision: result.snapshot.course.currentRevision,
        updatedAt: result.snapshot.course.updatedAt
      });
      await transaction.putMany(
        "assessments",
        result.snapshot.assessments as unknown as Record<string, unknown>[]
      );
      await transaction.putMany(
        "constraints",
        result.snapshot.constraints as unknown as Record<string, unknown>[]
      );
      await transaction.putMany(
        "facts",
        result.snapshot.facts as unknown as Record<string, unknown>[]
      );
      await transaction.putMany(
        "evidence",
        (extra.evidence ?? []) as unknown as Record<string, unknown>[]
      );
      await transaction.putMany(
        "changes",
        result.snapshot.changes as unknown as Record<string, unknown>[]
      );
      await transaction.putMany(
        "reviewItems",
        result.snapshot.reviewItems as unknown as Record<string, unknown>[]
      );
      await transaction.putMany(
        "changes",
        (extra.changes ?? []) as unknown as Record<string, unknown>[]
      );
      await transaction.putMany(
        "reviewItems",
        (extra.reviewItems ?? []) as unknown as Record<string, unknown>[]
      );
      await transaction.putMany("history", result.history as unknown as Record<string, unknown>[]);
      await transaction.putMany(
        "reviewDecisions",
        result.decisions as unknown as Record<string, unknown>[]
      );
    });
    // State a Review did not produce — a Manual Add Assessment, for one — establishes a Course
    // without ever passing a Review item, so this cannot be left to `deleteReviewItems` alone.
    // (Gate 3 finding F22.)
    await this.recomputeEstablished(courseId);
  }

  /**
   * Applies a Review decision and takes the item it resolved out of the store.
   *
   * Committing alone is not enough: `commitMutation` writes the Review list its snapshot carries,
   * and a list without this item simply does not upsert it — the row stays behind and the next read
   * hands the same item back, so the Initial Review would never reach its second one. The Change
   * Review path already removes what it resolves; this is the same step for the Initial Review.
   * (Gate 3 finding F25.)
   */
  async commitReviewDecision(
    courseId: string,
    reviewItemId: string,
    result: MutationResult,
    extra: { evidence?: EvidenceRecord[]; changeIdsToDelete?: string[] } = {}
  ): Promise<void> {
    await this.commitMutation(courseId, result, extra);
    await this.deleteChanges(extra.changeIdsToDelete ?? []);
    await this.deleteReviewItems([reviewItemId]);
  }

  async deleteChanges(changeIds: string[]): Promise<void> {
    if (changeIds.length === 0) return;
    await this.database.write(["changes"], async (transaction) => {
      for (const id of changeIds) await transaction.delete("changes", id);
    });
  }

  /**
   * Removes review item rows whose decisions just resolved them.
   *
   * Whether a Course is established is decided by what is left here — an object that has just left
   * the Review is Current Course State — so resolving one is also the moment to say so. Doing it in
   * this one place keeps every caller honest, including the ones that never think about
   * establishment at all. (Gate 3 finding F22.)
   */
  async deleteReviewItems(reviewItemIds: string[]): Promise<void> {
    if (reviewItemIds.length === 0) return;
    const courseIds = new Set<string>();
    await this.database.write(["reviewItems"], async (transaction) => {
      for (const id of reviewItemIds) {
        const item = await transaction.get<ReviewItemRecord>("reviewItems", id);
        if (item) courseIds.add(item.courseId);
        await transaction.delete("reviewItems", id);
      }
    });
    for (const courseId of courseIds) await this.recomputeEstablished(courseId);
  }

  async writeDraft(bundle: Partial<DraftBundle>): Promise<void> {
    await this.database.write(ALL_TABLES, async (transaction) => {
      if (bundle.sources)
        await transaction.putMany(
          "sources",
          bundle.sources as unknown as Record<string, unknown>[]
        );
      if (bundle.observations) {
        await transaction.putMany(
          "sourceObservations",
          bundle.observations as unknown as Record<string, unknown>[]
        );
      }
      if (bundle.evidence)
        await transaction.putMany(
          "evidence",
          bundle.evidence as unknown as Record<string, unknown>[]
        );
      if (bundle.assessments) {
        await transaction.putMany(
          "assessments",
          bundle.assessments as unknown as Record<string, unknown>[]
        );
      }
      if (bundle.constraints) {
        await transaction.putMany(
          "constraints",
          bundle.constraints as unknown as Record<string, unknown>[]
        );
      }
      if (bundle.facts)
        await transaction.putMany("facts", bundle.facts as unknown as Record<string, unknown>[]);
      if (bundle.changes) {
        await transaction.putMany(
          "changes",
          bundle.changes as unknown as Record<string, unknown>[]
        );
      }
      if (bundle.reviewItems) {
        await transaction.putMany(
          "reviewItems",
          bundle.reviewItems as unknown as Record<string, unknown>[]
        );
      }
    });
  }

  /**
   * Clears a Course's pending decisions — Changes, Review Items, recorded decisions and History —
   * inside the live generation. Course facts and Assessments are untouched; this is a scenario
   * reset for deterministic acceptance, not a product operation.
   */
  async replaceCourseDecisions(
    courseId: string,
    next: {
      changes: ChangeRecord[];
      reviewItems: ReviewItemRecord[];
      decisions: ReviewDecisionRecord[];
      history: HistoryRecord[];
    }
  ): Promise<void> {
    await this.database.write(
      ["changes", "reviewItems", "reviewDecisions", "history"],
      async (transaction) => {
        const [changes, reviewItems, decisions, history] = await Promise.all([
          transaction.getAll<ChangeRecord>("changes"),
          transaction.getAll<ReviewItemRecord>("reviewItems"),
          transaction.getAll<ReviewDecisionRecord>("reviewDecisions"),
          transaction.getAll<HistoryRecord>("history")
        ]);
        for (const item of changes.filter((entry) => entry.courseId === courseId)) {
          await transaction.delete("changes", item.changeId);
        }
        for (const item of reviewItems.filter((entry) => entry.courseId === courseId)) {
          await transaction.delete("reviewItems", item.reviewItemId);
        }
        for (const item of decisions.filter((entry) => entry.courseId === courseId)) {
          await transaction.delete("reviewDecisions", item.decisionId);
        }
        for (const item of history.filter((entry) => entry.courseId === courseId)) {
          await transaction.delete("history", item.historyId);
        }
        await transaction.putMany("changes", next.changes as unknown as Record<string, unknown>[]);
        await transaction.putMany(
          "reviewItems",
          next.reviewItems as unknown as Record<string, unknown>[]
        );
        await transaction.putMany(
          "reviewDecisions",
          next.decisions as unknown as Record<string, unknown>[]
        );
        await transaction.putMany("history", next.history as unknown as Record<string, unknown>[]);
      }
    );
  }

  async saveWorkflow(workflow: WorkflowRecord): Promise<void> {
    await this.database.write(["workflows"], async (transaction) => {
      await transaction.put("workflows", workflow as unknown as Record<string, unknown>);
    });
  }

  async recordAiRun(run: AiRunRecord): Promise<void> {
    await this.database.write(["aiRuns"], async (transaction) => {
      await transaction.put("aiRuns", run as unknown as Record<string, unknown>);
    });
  }

  async recordExclusion(input: {
    courseId: string;
    proposalKey: string;
    evidenceFingerprint: string;
  }): Promise<void> {
    await this.database.write(["exclusionMemory"], async (transaction) => {
      await transaction.put("exclusionMemory", {
        memoryId: randomId("mem"),
        courseId: input.courseId,
        proposalKey: input.proposalKey,
        evidenceFingerprint: input.evidenceFingerprint,
        createdAt: new Date().toISOString()
      });
    });
  }

  async saveSemester(semester: SemesterRecord): Promise<void> {
    await this.database.write(["semesters"], async (transaction) => {
      await transaction.put("semesters", semester as unknown as Record<string, unknown>);
    });
  }

  async upsertCourse(course: CourseRecord): Promise<void> {
    await this.database.write(["courses"], async (transaction) => {
      await transaction.put("courses", course as unknown as Record<string, unknown>);
    });
  }

  // -------------------------------------------------------------------------
  // Backup / restore support
  // -------------------------------------------------------------------------

  async readDurableTables(): Promise<Record<DurableTable, Record<string, unknown>[]>> {
    const tables = {} as Record<DurableTable, Record<string, unknown>[]>;
    await this.database.read([...DURABLE_TABLES], async (transaction) => {
      for (const table of DURABLE_TABLES) {
        tables[table] = await transaction.getAll<Record<string, unknown>>(table);
      }
    });
    return tables;
  }

  async replaceAll(tables: Record<DurableTable, Record<string, unknown>[]>): Promise<void> {
    await this.database.replaceGeneration(tables, randomId("gen"));
  }

  async readMetadata(): Promise<Record<string, unknown>> {
    return this.database.read(["appMetadata"], (transaction) => transaction.metadata());
  }

  /** Test and maintenance helper: drops every row of a table inside the active generation. */
  async clearTable(table: DurableTable): Promise<void> {
    await this.database.write([table], async (transaction) => {
      await transaction.clear(table);
    });
  }

  /**
   * Source of truth for "is this Course established" is the aggregate, not a cached flag.
   *
   * A Course has Current Course State once something in it has been Confirmed. An AI draft still
   * waiting in the Initial Review is not state yet: §3.5 gives a Not Established Course no status
   * text at all, and a Pending Review cue on its card would be exactly that. §6.7 is what makes
   * this incremental — a Confirm enters the Current Course State straight away, without waiting
   * for the rest of the review — so the first decision is enough to establish the Course.
   */
  async recomputeEstablished(courseId: string): Promise<CourseRecord | null> {
    // Read, decide, then write. A write started from inside the read's body would outlive the
    // readonly transaction that carried it — IndexedDB autocommits one the moment the body yields —
    // and the `complete` the read is waiting on would then never arrive.
    const state = await this.database.read(
      ["courses", "assessments", "constraints", "reviewItems", "reviewDecisions"],
      async (transaction) => {
        const course = await transaction.get<CourseRecord>("courses", courseId);
        if (!course) return null;
        const [assessments, constraints, reviewItems, decisions] = await Promise.all([
          transaction.getAll<AssessmentRecord>("assessments"),
          transaction.getAll<ConstraintRecord>("constraints"),
          transaction.getAll<ReviewItemRecord>("reviewItems"),
          transaction.getAll<ReviewDecisionRecord>("reviewDecisions")
        ]);
        const awaitingDecision = new Set(reviewItems.map((item) => item.targetId));
        // Excluding is a decision that takes an object out of the Course, and it does so without
        // deleting the row — the Undo has to be able to put it back. So a row that is still there
        // is not state if the user has already said it does not belong.
        const excluded = new Set(
          decisions
            .filter((decision) => decision.kind === "Exclude")
            .flatMap((decision) => (decision.targetId === undefined ? [] : [decision.targetId]))
        );
        const counts = (id: string): boolean => !awaitingDecision.has(id) && !excluded.has(id);
        const established =
          assessments.some(
            (item) => item.courseId === courseId && !item.supersededBy && counts(item.assessmentId)
          ) ||
          constraints.some(
            (item) => item.courseId === courseId && !item.superseded && counts(item.constraintId)
          );
        return { course, established };
      }
    );
    if (!state) return null;
    if (state.established === state.course.established) return state.course;
    const updated: CourseRecord = {
      ...state.course,
      established: state.established,
      updatedAt: new Date().toISOString()
    };
    await this.database.write(["courses"], async (transaction) => {
      await transaction.put("courses", updated as unknown as Record<string, unknown>);
    });
    return updated;
  }

  /** Revision pointer for the active generation; staging lives in `RebuildStagingStore`. */
  async writeCourseStateRecord(record: CourseStateRecord): Promise<void> {
    await this.database.write(["courseStates"], async (transaction) => {
      await transaction.put("courseStates", record as unknown as Record<string, unknown>);
    });
  }

  async setMetadata(items: Record<string, unknown>): Promise<void> {
    await this.database.write(["appMetadata"], async (transaction) => {
      await transaction.setMetadata(items);
    });
  }

  async readAppMetadataRecord(key: string): Promise<AppMetadataRecord | null> {
    return this.database.read(["appMetadata"], async (transaction) => {
      return (await transaction.get<AppMetadataRecord>("appMetadata", key)) ?? null;
    });
  }
}

export type { Transaction };
