import { operativeSemantics } from "./fact-semantics";
import { renderFactValue } from "./assessments";
import type { CourseDraftArchive } from "./course-draft-archive";
import { requirePresent } from "./errors";
import type { ExclusionMemoryRecord } from "./schema";
import type { BLogicalLedger } from "./task-b-ledger";
import { qaTrace } from "./qa-telemetry";
import { TRIAGE_SCHEMA } from "./source-triage";
import { randomId, stableStringify } from "./crypto";
import { stableDigest } from "./chunking";
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
      snapshot.reviewItems
        .filter(
          (item) =>
            item.kind === "initial" && (!item.payload.productScope || item.payload.ownerScope)
        )
        .map((item) => item.targetId)
    );
    for (const decision of decisions) {
      if (
        decision.kind === "Exclude" &&
        decision.targetId &&
        (!decision.details?.productScope || decision.details.ownerScope) &&
        !decisions.some(
          (d) =>
            d.kind === "UndoExclude" &&
            d.reviewItemId === decision.reviewItemId &&
            d.decidedAt >= decision.decidedAt
        )
      )
        hidden.add(decision.targetId);
    }
    const hiddenFacts = new Set(
      snapshot.reviewItems
        .filter((item) => item.kind === "initial")
        .flatMap((item) =>
          Array.isArray(item.payload.scopeFactIds) ? (item.payload.scopeFactIds as string[]) : []
        )
    );
    for (const d of decisions)
      if (
        d.kind === "Exclude" &&
        d.details?.productScope &&
        !decisions.some(
          (x) =>
            x.kind === "UndoExclude" &&
            x.reviewItemId === d.reviewItemId &&
            x.decidedAt >= d.decidedAt
        )
      )
        for (const id of (d.details.scopeFactIds as string[] | undefined) ?? [])
          hiddenFacts.add(id);
    const trustedFacts = snapshot.facts.filter(
      (item) =>
        !hiddenFacts.has(item.factId) &&
        (!item.product || !["REFERENCE", "BACKGROUND"].includes(item.product.disposition)) &&
        (item.assessmentId === undefined || !hidden.has(item.assessmentId)) &&
        (item.constraintId === undefined || !hidden.has(item.constraintId))
    );
    const constraints = snapshot.constraints.flatMap((item) => {
      if (hidden.has(item.constraintId) || item.productDisposition === "REFERENCE") return [];
      if (!snapshot.facts.some((f) => f.constraintId === item.constraintId && f.product))
        return [item];
      const accepted = trustedFacts.filter((f) => f.constraintId === item.constraintId);
      if (!accepted.length) return [];
      return [
        {
          ...item,
          content: accepted
            .map((f) => {
              const semantics = operativeSemantics(f);
              return [
                renderFactValue(f.value),
                ...(semantics?.conditions ?? []),
                ...(semantics?.exceptions ?? [])
              ].join("\n");
            })
            .join("\n"),
          evidenceRefs: accepted.flatMap((f) => f.evidenceRefs)
        }
      ];
    });
    return {
      ...snapshot,
      assessments: snapshot.assessments.filter(
        (item) => !hidden.has(item.assessmentId) && item.productDisposition !== "REFERENCE"
      ),
      constraints,
      facts: trustedFacts
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

  /** Only successful runtime A output from this workflow; no trusted-state publication. */
  async sourceUnderstanding(workflowId: string, sourceId: string): Promise<AiRunRecord | null> {
    return this.database.read(["aiRuns"], async (transaction) => {
      const all = await transaction.getAll<AiRunRecord>("aiRuns");
      const runs = all.filter(
        (item) =>
          item.workflowId === workflowId &&
          item.sourceId === sourceId &&
          item.status === "succeeded" &&
          item.invocationRole !== "physical" &&
          (item.task === "task-a" || item.task === "task-a-consolidate")
      );
      return runs.find((item) => item.task === "task-a-consolidate") ?? runs[0] ?? null;
    });
  }

  async plannerAcquisitionRuns(workflowId: string): Promise<AiRunRecord[]> {
    return this.database.read(["aiRuns"], async (transaction) =>
      (await transaction.getAll<AiRunRecord>("aiRuns")).filter(
        (run) =>
          run.workflowId === workflowId &&
          (run.task === "retrieval-planner" || run.task === "coverage-audit") &&
          run.status === "succeeded"
      )
    );
  }

  async findTaskAPackage(
    workflowId: string,
    sourceId: string,
    fingerprint: string
  ): Promise<AiRunRecord | null> {
    return this.database.read(["aiRuns"], async (transaction) => {
      const runs = await transaction.getAll<AiRunRecord>("aiRuns");
      return (
        [...runs]
          .sort(
            (a, b) =>
              Number(b.schemaVersion === TRIAGE_SCHEMA) -
                Number(a.schemaVersion === TRIAGE_SCHEMA) ||
              b.recordedAt.localeCompare(a.recordedAt)
          )
          .find(
            (run) =>
              run.workflowId === workflowId &&
              run.sourceId === sourceId &&
              run.status === "succeeded" &&
              run.taskAPackage?.fingerprint === fingerprint
          ) ?? null
      );
    });
  }

  /** Replay an accepted batch if worker eviction interrupted per-Source checkpoint writes. */
  async findTriageBatch(
    workflowId: string,
    sourceId: string,
    fingerprint: string
  ): Promise<AiRunRecord | null> {
    return this.database.read(["aiRuns"], async (transaction) => {
      const runs = await transaction.getAll<AiRunRecord>("aiRuns");
      return (
        [...runs]
          .sort(
            (a, b) =>
              Number(b.schemaVersion === TRIAGE_SCHEMA) -
                Number(a.schemaVersion === TRIAGE_SCHEMA) ||
              b.recordedAt.localeCompare(a.recordedAt)
          )
          .find(
            (run) =>
              run.workflowId === workflowId &&
              run.task === "source-triage" &&
              run.status === "succeeded" &&
              run.triageProfiles?.some(
                (profile) => profile.sourceId === sourceId && profile.fingerprint === fingerprint
              )
          ) ?? null
      );
    });
  }

  async findAiRun(
    idempotencyKey: string,
    invocationFingerprint?: string,
    workflowId?: string
  ): Promise<AiRunRecord | null> {
    return this.database.read(["aiRuns"], async (transaction) => {
      const all = await transaction.getAll<AiRunRecord>("aiRuns");
      if (workflowId !== undefined)
        qaTrace("qa.semantic-clean-candidates", {
          workflowId,
          historicalCandidates: all.filter(
            (item) =>
              item.idempotencyKey === idempotencyKey &&
              item.workflowId !== workflowId &&
              item.status === "succeeded" &&
              (invocationFingerprint === undefined ||
                item.invocationFingerprint === invocationFingerprint)
          ).length,
          acceptedHistoricalHits: 0,
          logicalUnitId: idempotencyKey
        });
      return (
        all
          .filter(
            (item) =>
              item.idempotencyKey === idempotencyKey &&
              (workflowId === undefined || item.workflowId === workflowId) &&
              (invocationFingerprint === undefined ||
                item.invocationFingerprint === invocationFingerprint)
          )
          .find((item) => item.status === "succeeded") ??
        all.find(
          (item) =>
            item.idempotencyKey === idempotencyKey &&
            (workflowId === undefined || item.workflowId === workflowId) &&
            (invocationFingerprint === undefined ||
              item.invocationFingerprint === invocationFingerprint)
        ) ??
        null
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
      replaceCurrentObjects?: boolean;
      sourceInterpretation?: CourseDraftArchive;
      exclusionMemory?: { courseId: string; proposalKey: string; evidenceFingerprint: string };
    } = {}
  ): Promise<void> {
    await this.database.write(ALL_TABLES, async (transaction) => {
      const bound = result.decisions.find(
        (d) =>
          (d.details?.productScope || d.details?.reviewDependencyBound) && d.kind !== "UndoExclude"
      );
      if (bound) {
        const current = await transaction.get<CourseRecord>("courses", courseId);
        if (current?.currentRevision !== bound.details?.courseRevision)
          throw Error("COURSE_REVISION_CONFLICT");
        const changeVersion = bound.details?.changeVersion as
          { changeId: string; updatedAt: string } | undefined;
        if (changeVersion) {
          const change = await transaction.get<ChangeRecord>("changes", changeVersion.changeId);
          if (change?.updatedAt !== changeVersion.updatedAt) throw Error("REVIEW_SCOPE_CHANGED");
        }
        for (const dep of (bound.details?.sourceDependencies as
          Array<{ sourceId: string; present: boolean; contentHash: string | null }> | undefined) ??
          []) {
          const source = await transaction.get<SourceRecord>("sources", dep.sourceId);
          const hash = source?.machine?.contentHash ?? null;
          if (Boolean(source) !== dep.present || hash !== dep.contentHash)
            throw Error("REVIEW_SCOPE_CHANGED");
        }
        for (const v of (bound.details?.scopeVersions as
          | Array<{
              factId: string;
              updatedAt: string;
              sourceVersions?: Array<{ sourceId: string; contentHash?: string }>;
            }>
          | undefined) ?? []) {
          const f = await transaction.get<FactRecord>("facts", v.factId);
          if (f?.updatedAt !== v.updatedAt) throw Error("REVIEW_SCOPE_CHANGED");
          for (const dep of v.sourceVersions ?? [])
            if (dep.contentHash) {
              const source = await transaction.get<SourceRecord>("sources", dep.sourceId);
              if (source?.machine?.contentHash !== dep.contentHash)
                throw Error("REVIEW_SCOPE_CHANGED");
            }
        }
      }
      if (extra.exclusionMemory)
        await transaction.put("exclusionMemory", {
          memoryId: randomId("mem"),
          ...extra.exclusionMemory,
          createdAt: new Date().toISOString()
        });
      // Explicit Rebuild adoption replaces Current objects; an upsert alone leaves omitted
      // old facts visible beside the adopted model result. Historical superseded rows remain.
      if (extra.replaceCurrentObjects) {
        const replacements = {
          assessments: { rows: result.snapshot.assessments, key: "assessmentId" },
          constraints: { rows: result.snapshot.constraints, key: "constraintId" },
          facts: { rows: result.snapshot.facts, key: "factId" }
        } as const;
        for (const table of ["assessments", "constraints", "facts"] as const) {
          const replacement = replacements[table];
          const ids = new Set(
            replacement.rows.map((r) => Reflect.get(r, replacement.key) as string)
          );
          for (const row of await transaction.getAll<Record<string, unknown>>(table))
            if (
              row.courseId === courseId &&
              !row.superseded &&
              !row.supersededBy &&
              !ids.has(String(row[replacement.key]))
            )
              await transaction.delete(table, String(row[replacement.key]));
        }
      }
      // Mutation snapshots contain the complete pending queues for this course. An omitted row
      // must be removed atomically, otherwise a completed Human decision reappears after reload.
      const retainedChanges = new Set(
        [...result.snapshot.changes, ...(extra.changes ?? [])].map((c) => c.changeId)
      );
      const retainedReviews = new Set(
        [...result.snapshot.reviewItems, ...(extra.reviewItems ?? [])].map((i) => i.reviewItemId)
      );
      for (const c of await transaction.getAll<ChangeRecord>("changes"))
        if (c.courseId === courseId && !retainedChanges.has(c.changeId))
          await transaction.delete("changes", c.changeId);
      for (const i of await transaction.getAll<ReviewItemRecord>("reviewItems"))
        if (i.courseId === courseId && !retainedReviews.has(i.reviewItemId))
          await transaction.delete("reviewItems", i.reviewItemId);
      await transaction.put(
        "courses",
        result.snapshot.course as unknown as Record<string, unknown>
      );
      const priorCourseState = await transaction.get<CourseStateRecord>("courseStates", courseId);
      await transaction.put("courseStates", {
        ...priorCourseState,
        ...(extra.sourceInterpretation ? { sourceInterpretation: extra.sourceInterpretation } : {}),
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
    extra: {
      evidence?: EvidenceRecord[];
      changeIdsToDelete?: string[];
      exclusionMemory?: { courseId: string; proposalKey: string; evidenceFingerprint: string };
    } = {}
  ): Promise<void> {
    const deleted = new Set(extra.changeIdsToDelete ?? []);
    await this.commitMutation(
      courseId,
      {
        ...result,
        snapshot: {
          ...result.snapshot,
          changes: result.snapshot.changes.filter((c) => !deleted.has(c.changeId)),
          reviewItems: result.snapshot.reviewItems.filter((r) => r.reviewItemId !== reviewItemId)
        }
      },
      extra
    );
  }

  async undoExclusion(courseId: string, reviewItemId: string, now: string): Promise<void> {
    await this.database.write(["reviewItems", "reviewDecisions", "exclusionMemory"], async (tx) => {
      const decisions = await tx.getAll<ReviewDecisionRecord>("reviewDecisions");
      const last = decisions
        .filter(
          (d) => d.courseId === courseId && d.reviewItemId === reviewItemId && d.kind === "Exclude"
        )
        .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))[0];
      const review = last?.details?.excludedReviewItem as ReviewItemRecord | undefined;
      if (!review || review.courseId !== courseId || review.reviewItemId !== reviewItemId)
        throw Error("UNDO_EXCLUSION_UNAVAILABLE");
      if (
        decisions.some(
          (d) =>
            d.kind === "UndoExclude" &&
            d.reviewItemId === reviewItemId &&
            d.decidedAt >= requirePresent(last).decidedAt
        )
      )
        return;
      await tx.put("reviewItems", review as unknown as Record<string, unknown>);
      await tx.put("reviewDecisions", {
        decisionId: randomId("dec"),
        courseId,
        reviewItemId,
        kind: "UndoExclude",
        targetId: review.targetId,
        decidedAt: now
      });
      const key = last?.details?.exclusionKey as
        { proposalKey?: string; evidenceFingerprint?: string } | undefined;
      if (key)
        for (const m of await tx.getAll<ExclusionMemoryRecord>("exclusionMemory"))
          if (
            m.courseId === courseId &&
            m.proposalKey === key.proposalKey &&
            m.evidenceFingerprint === key.evidenceFingerprint
          )
            await tx.delete("exclusionMemory", m.memoryId);
    });
    await this.recomputeEstablished(courseId);
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

  /** Replace only unreviewed initial drafts; original full baseline already saved in native ledger. */
  async replaceInitialProvisional(
    owner: WorkflowRecord,
    baseline: Partial<DraftBundle>,
    bundle: Partial<DraftBundle>
  ): Promise<void> {
    await this.database.write(ALL_TABLES, async (tx) => {
      const current = await tx.get<WorkflowRecord>("workflows", owner.workflowId);
      const course = await tx.get<CourseRecord>("courses", owner.courseId);
      const metadata = await tx.get<AppMetadataRecord>(
        "appMetadata",
        `task-b-ledger:${owner.workflowId}`
      );
      const saved = metadata?.value as { ledger?: BLogicalLedger } | undefined;
      if (
        owner.kind !== "initial" ||
        !owner.lease ||
        current?.state !== "working" ||
        current.lease?.token !== owner.lease.token ||
        current.lease.sessionId !== owner.lease.sessionId
      )
        throw Error("STALE_INITIAL_CANONICAL_WRITE");
      if (!course || course.established || course.currentRevision !== 0)
        throw Error("TRUSTED_INITIAL_CANONICAL_WRITE_FORBIDDEN");
      if (
        (baseline.assessments ?? []).some(
          (row) => row.createdBy !== "ai" || row.marks.length > 0
        ) ||
        (baseline.constraints ?? []).some(
          (row) => row.createdBy !== "ai" || row.marks.length > 0
        ) ||
        (baseline.facts ?? []).some((row) => row.userEdited || row.marks.length > 0)
      )
        throw Error("TRUSTED_INITIAL_BASELINE_WRITE_FORBIDDEN");
      if (stableStringify(saved?.ledger?.taskABaseline) !== stableStringify(baseline))
        throw Error("INITIAL_BASELINE_NOT_DURABLE");
      const keys = {
        assessments: "assessmentId",
        constraints: "constraintId",
        facts: "factId",
        evidence: "evidenceId",
        reviewItems: "reviewItemId",
        changes: "changeId"
      } as const;
      for (const [table, key] of Object.entries(keys)) {
        const name = table as keyof typeof keys;
        const previous = (baseline[name] ?? []) as unknown as Record<string, unknown>[];
        for (const record of previous) {
          const id = String(record[key]);
          const row = await tx.get<Record<string, unknown>>(name, id);
          if (stableStringify(row) !== stableStringify(record))
            throw Error("INITIAL_PROVISIONAL_CHANGED_AFTER_BASELINE");
          await tx.delete(name, id);
        }
        const incoming = (bundle[name] ?? []) as unknown as Record<string, unknown>[];
        await tx.putMany(name, incoming);
      }
    });
  }

  async writeDraft(bundle: Partial<DraftBundle>, owner?: WorkflowRecord): Promise<void> {
    await this.database.write(ALL_TABLES, async (transaction) => {
      if (owner) {
        const current = await transaction.get<WorkflowRecord>("workflows", owner.workflowId);
        if (current?.state !== "working" || current.lease?.token !== owner.lease?.token)
          throw new Error("STALE_WORKFLOW_WRITE");
      }
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

  /** Atomic claim/CAS; two callers cannot acquire the same persisted phase. */
  async replaceWorkflow(expected: WorkflowRecord, next: WorkflowRecord): Promise<boolean> {
    return this.database.write(["workflows"], async (transaction) => {
      const current = await transaction.get<WorkflowRecord>("workflows", expected.workflowId);
      if (!current || JSON.stringify(current) !== JSON.stringify(expected)) return false;
      await transaction.put("workflows", next as unknown as Record<string, unknown>);
      return true;
    });
  }

  async saveWorkflow(workflow: WorkflowRecord, owner?: WorkflowRecord): Promise<void> {
    await this.database.write(["workflows"], async (transaction) => {
      if (owner?.lease) {
        const current = await transaction.get<WorkflowRecord>("workflows", owner.workflowId);
        if (current?.state !== "working" || current.lease?.token !== owner.lease.token)
          throw new Error("STALE_WORKFLOW_WRITE");
      }
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
        const awaitingDecision = new Set(
          reviewItems
            .filter((item) => !item.payload.productScope || item.payload.ownerScope)
            .map((item) => item.targetId)
        );
        // Excluding is a decision that takes an object out of the Course, and it does so without
        // deleting the row — the Undo has to be able to put it back. So a row that is still there
        // is not state if the user has already said it does not belong.
        const excluded = new Set(
          decisions
            .filter(
              (decision) =>
                decision.kind === "Exclude" &&
                (!decision.details?.productScope || decision.details.ownerScope) &&
                !decisions.some(
                  (d) =>
                    d.kind === "UndoExclude" &&
                    d.reviewItemId === decision.reviewItemId &&
                    d.decidedAt >= decision.decidedAt
                )
            )
            .flatMap((decision) => (decision.targetId === undefined ? [] : [decision.targetId]))
        );
        const counts = (id: string): boolean => !awaitingDecision.has(id) && !excluded.has(id);
        const established =
          assessments.some(
            (item) =>
              item.courseId === courseId &&
              !item.supersededBy &&
              item.productDisposition !== "REFERENCE" &&
              counts(item.assessmentId)
          ) ||
          constraints.some(
            (item) =>
              item.courseId === courseId &&
              !item.superseded &&
              item.productDisposition !== "REFERENCE" &&
              counts(item.constraintId)
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
  async readCourseDraftArchive(courseId: string) {
    return this.database.read(
      ["courseStates"],
      async (transaction) =>
        (await transaction.get<CourseStateRecord>("courseStates", courseId))?.sourceInterpretation
    );
  }

  async writeCourseDraftArchive(
    courseId: string,
    archive: CourseDraftArchive,
    owner?: WorkflowRecord
  ): Promise<void> {
    await this.database.write(["courseStates", "courses", "workflows"], async (transaction) => {
      if (owner) {
        const current = await transaction.get<WorkflowRecord>("workflows", owner.workflowId);
        if (
          owner.courseId !== courseId ||
          archive.workflowId !== owner.workflowId ||
          current?.courseId !== courseId ||
          current.state !== "working" ||
          current.lease?.token !== owner.lease?.token
        )
          throw Error("STALE_WORKFLOW_WRITE");
      }
      const course = await transaction.get<CourseRecord>("courses", courseId);
      if (!course) throw Error("COURSE_NOT_FOUND");
      const prior = await transaction.get<CourseStateRecord>("courseStates", courseId);
      await transaction.put("courseStates", {
        ...prior,
        courseId,
        revision: course.currentRevision,
        updatedAt: course.updatedAt,
        sourceInterpretation: archive
      });
    });
  }

  async writeCourseStateRecord(record: CourseStateRecord): Promise<void> {
    await this.database.write(["courseStates"], async (transaction) => {
      const prior = await transaction.get<CourseStateRecord>("courseStates", record.courseId);
      await transaction.put("courseStates", { ...prior, ...record });
    });
  }

  async setMetadata(items: Record<string, unknown>): Promise<void> {
    await this.database.write(["appMetadata"], async (transaction) => {
      await transaction.setMetadata(items);
    });
  }

  /** Private runtime diagnostics are separate from semantic checkpoints and trusted state. */
  async writePostProcessingDiagnostic(
    owner: WorkflowRecord,
    key: string,
    value: Record<string, unknown>
  ): Promise<void> {
    await this.database.write(["workflows", "appMetadata"], async (transaction) => {
      const current = await transaction.get<WorkflowRecord>("workflows", owner.workflowId);
      const previous = await transaction.get<AppMetadataRecord>("appMetadata", key);
      const ownerRef = owner.lease ? stableDigest(owner.lease.token) : undefined;
      const workingOwner =
        owner.lease !== undefined &&
        current?.state === "working" &&
        current.lease?.token === owner.lease.token;
      const completedTerminalWrite =
        value.stage === "terminal-state-write" &&
        value.phase !== "start" &&
        ownerRef !== undefined &&
        (previous?.value as Record<string, unknown> | undefined)?.ownerRef === ownerRef &&
        current?.state === "failed" &&
        !current.lease &&
        current.attempt === owner.attempt + 1;
      if (!workingOwner && !completedTerminalWrite) throw new Error("STALE_DIAGNOSTIC_WRITE");
      await transaction.setMetadata({ [key]: { ...value, ownerRef } });
    });
  }

  /** Durable logical work is private runtime state, fenced atomically with its workflow owner. */
  async writeTaskBLogicalLedger(owner: WorkflowRecord, ledger: BLogicalLedger): Promise<void> {
    await this.database.write(["workflows", "appMetadata"], async (transaction) => {
      const current = await transaction.get<WorkflowRecord>("workflows", owner.workflowId);
      if (
        !owner.lease ||
        current?.state !== "working" ||
        current.lease?.token !== owner.lease.token ||
        current.lease.sessionId !== owner.lease.sessionId
      )
        throw new Error("STALE_B_LEDGER_WRITE");
      await transaction.setMetadata({
        [`task-b-ledger:${owner.workflowId}`]: {
          kind: "task-b-logical-ledger",
          workflowId: owner.workflowId,
          courseId: owner.courseId,
          ledger
        }
      });
    });
  }

  async writePhysicalWorkLedger(
    owner: WorkflowRecord,
    key: string,
    ledger: unknown
  ): Promise<void> {
    await this.database.write(["workflows", "appMetadata"], async (transaction) => {
      const current = await transaction.get<WorkflowRecord>("workflows", owner.workflowId);
      if (
        !owner.lease ||
        current?.state !== "working" ||
        current.lease?.token !== owner.lease.token ||
        current.lease.sessionId !== owner.lease.sessionId
      )
        throw Error("STALE_PHYSICAL_LEDGER_WRITE");
      await transaction.setMetadata({
        [key]: {
          kind: "physical-work-ledger",
          workflowId: owner.workflowId,
          courseId: owner.courseId,
          ledger
        }
      });
    });
  }

  async readMetadataValue(key: string): Promise<unknown> {
    return this.database.read(
      ["appMetadata"],
      async (transaction) => (await transaction.get<AppMetadataRecord>("appMetadata", key))?.value
    );
  }

  async readAppMetadataRecord(key: string): Promise<AppMetadataRecord | null> {
    return this.database.read(["appMetadata"], async (transaction) => {
      return (await transaction.get<AppMetadataRecord>("appMetadata", key)) ?? null;
    });
  }
}

export type { Transaction };
