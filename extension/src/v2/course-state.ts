import { randomId } from "./crypto";
import type {
  AssessmentRecord,
  ChangeRecord,
  ConstraintRecord,
  CourseRecord,
  CurrentMark,
  FactRecord,
  FactValue,
  HistoryRecord,
  ReviewDecisionRecord,
  ReviewDecisionKind,
  ReviewItemRecord,
  WorkflowPhase,
  WorkflowRecord
} from "./domain";

export interface CourseSnapshot {
  course: CourseRecord;
  assessments: AssessmentRecord[];
  constraints: ConstraintRecord[];
  facts: FactRecord[];
  changes: ChangeRecord[];
  reviewItems: ReviewItemRecord[];
  history: HistoryRecord[];
}

export interface MutationResult {
  snapshot: CourseSnapshot;
  decisions: ReviewDecisionRecord[];
  history: HistoryRecord[];
}

export class StateGuardError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function requireRevision(snapshot: CourseSnapshot, expected: number): void {
  if (snapshot.course.currentRevision !== expected)
    throw new StateGuardError("COURSE_REVISION_CONFLICT");
}

function withRevision(
  snapshot: CourseSnapshot,
  now: string,
  updates: Partial<CourseSnapshot>,
  history: HistoryRecord[],
  decisions: ReviewDecisionRecord[] = []
): MutationResult {
  // Every accepted decision moves the Course revision exactly once, inside the same
  // transaction that writes the new objects, so a stale writer can never apply over it.
  const revision = snapshot.course.currentRevision + 1;
  const recorded = history.map((entry) => ({ ...entry, revision }));
  return {
    snapshot: {
      ...snapshot,
      ...updates,
      course: { ...snapshot.course, currentRevision: revision, updatedAt: now },
      history: [...snapshot.history, ...recorded]
    },
    decisions,
    history: recorded
  };
}

function addMark(marks: CurrentMark[], mark: CurrentMark): CurrentMark[] {
  return marks.includes(mark) ? marks : [...marks, mark];
}

function withoutMark(marks: CurrentMark[], mark: CurrentMark): CurrentMark[] {
  return marks.filter((item) => item !== mark);
}

function decision(
  kind: ReviewDecisionKind,
  courseId: string,
  reviewItemId: string,
  now: string,
  targetId?: string,
  details?: Record<string, unknown>
): ReviewDecisionRecord {
  return {
    decisionId: randomId("dec"),
    courseId,
    reviewItemId,
    kind,
    ...(targetId ? { targetId } : {}),
    ...(details ? { details } : {}),
    decidedAt: now
  };
}

function history(
  courseId: string,
  event: HistoryRecord["event"],
  targetId: string,
  now: string,
  extra: Partial<HistoryRecord> = {}
): HistoryRecord {
  return {
    historyId: randomId("hist"),
    courseId,
    revision: 0,
    targetId,
    event,
    recordedAt: now,
    ...withoutUndefined(extra)
  };
}

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function dropReviewItem(items: ReviewItemRecord[], reviewItemId: string): ReviewItemRecord[] {
  return items.filter((item) => item.reviewItemId !== reviewItemId);
}

// ---------------------------------------------------------------------------
// Workflow shape
// ---------------------------------------------------------------------------

export const AUTOMATIC_PHASES: readonly WorkflowPhase[] = [
  "discover",
  "fetch",
  "parse",
  "normalize",
  "task-a",
  "task-b"
];

export function createInitialWorkflow(
  workflowId: string,
  course: CourseRecord,
  now: string,
  kind: WorkflowRecord["kind"] = "initial"
): WorkflowRecord {
  return {
    workflowId,
    courseId: course.courseId,
    kind,
    state: "queued",
    phase: "discover",
    phaseCursor: "start",
    attempt: 0,
    baseCourseRevision: course.currentRevision,
    createdAt: now,
    updatedAt: now
  };
}

export function advanceWorkflow(
  workflow: WorkflowRecord,
  next: WorkflowPhase,
  now: string
): WorkflowRecord {
  return {
    ...workflow,
    state: next === "review" ? "waiting" : "working",
    phase: next,
    phaseCursor: "start",
    ...(next === "review" ? { waitingReason: "review" as const } : {}),
    updatedAt: now
  };
}

// ---------------------------------------------------------------------------
// Initial Review decisions
// ---------------------------------------------------------------------------

export interface InitialReviewDecision {
  reviewItemId: string;
  kind: "Confirm" | "Edit" | "Exclude" | "Defer";
  assessment?: AssessmentRecord;
  facts?: FactRecord[];
}

export function applyInitialReviewDecision(
  snapshot: CourseSnapshot,
  input: InitialReviewDecision & { expectedRevision: number; now: string }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const item = snapshot.reviewItems.find((entry) => entry.reviewItemId === input.reviewItemId);
  if (!item) throw new StateGuardError("REVIEW_ITEM_NOT_FOUND");

  if (input.kind === "Defer") {
    return {
      snapshot,
      decisions: [
        decision("Defer", snapshot.course.courseId, item.reviewItemId, input.now, item.targetId)
      ],
      history: []
    };
  }

  if (input.kind === "Exclude") {
    return withRevision(
      snapshot,
      input.now,
      { reviewItems: dropReviewItem(snapshot.reviewItems, item.reviewItemId) },
      [
        history(snapshot.course.courseId, "ASSESSMENT_EXCLUDED", item.targetId, input.now, {
          ...(typeof item.payload.proposalKey === "string"
            ? { note: item.payload.proposalKey }
            : {})
        })
      ],
      [
        decision(
          "Exclude",
          snapshot.course.courseId,
          item.reviewItemId,
          input.now,
          item.targetId,
          item.payload
        )
      ]
    );
  }

  const assessment = input.assessment ?? (item.payload.assessment as AssessmentRecord | undefined);
  if (!assessment) throw new StateGuardError("ASSESSMENT_PAYLOAD_MISSING");
  if (assessment.courseId !== snapshot.course.courseId)
    throw new StateGuardError("COURSE_ID_MISMATCH");
  const facts = input.facts ?? (item.payload.facts as FactRecord[] | undefined) ?? [];
  for (const fact of facts) {
    if (
      fact.courseId !== snapshot.course.courseId ||
      (fact.assessmentId !== undefined && fact.assessmentId !== assessment.assessmentId)
    ) {
      throw new StateGuardError("FACT_OWNERSHIP_MISMATCH");
    }
  }

  const marks: CurrentMark[] =
    input.kind === "Edit" ? addMark(assessment.marks, "Edited") : assessment.marks;
  const storedAssessment: AssessmentRecord = {
    ...assessment,
    marks,
    updatedAt: input.now
  };
  const storedFacts: FactRecord[] = facts.map((fact) => ({
    ...fact,
    marks: input.kind === "Edit" ? addMark(fact.marks, "Edited") : fact.marks,
    ...(input.kind === "Edit" ? { userEdited: true } : {}),
    updatedAt: input.now
  }));

  return withRevision(
    snapshot,
    input.now,
    {
      assessments: [
        ...snapshot.assessments.filter((a) => a.assessmentId !== storedAssessment.assessmentId),
        storedAssessment
      ],
      facts: [
        ...snapshot.facts.filter(
          (existing) => !storedFacts.some((incoming) => incoming.factId === existing.factId)
        ),
        ...storedFacts
      ],
      reviewItems: dropReviewItem(snapshot.reviewItems, item.reviewItemId)
    },
    [
      history(
        snapshot.course.courseId,
        "ASSESSMENT_CONFIRMED",
        storedAssessment.assessmentId,
        input.now,
        {
          ...(input.kind === "Edit" ? { note: "edited" } : {})
        }
      )
    ],
    [
      decision(
        input.kind,
        snapshot.course.courseId,
        item.reviewItemId,
        input.now,
        storedAssessment.assessmentId,
        {
          edited: input.kind === "Edit"
        }
      )
    ]
  );
}

export function mergeAssessment(
  snapshot: CourseSnapshot,
  input: {
    reviewItemId: string;
    sourceAssessmentId: string;
    targetAssessmentId: string;
    expectedRevision: number;
    now: string;
  }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  if (input.sourceAssessmentId === input.targetAssessmentId)
    throw new StateGuardError("MERGE_SAME_TARGET");
  const target = snapshot.assessments.find(
    (item) => item.assessmentId === input.targetAssessmentId
  );
  const source = snapshot.assessments.find(
    (item) => item.assessmentId === input.sourceAssessmentId
  );
  if (!target || !source) throw new StateGuardError("MERGE_TARGET_NOT_CANONICAL");
  // A merge is only legal onto an accepted Current State object, never onto another draft.
  if (target.supersededBy || source.supersededBy)
    throw new StateGuardError("MERGE_TARGET_SUPERSEDED");

  const merged: AssessmentRecord = {
    ...target,
    aliases: [...new Set([...target.aliases, source.name, ...source.aliases])].filter(
      (alias) => alias !== target.name
    ),
    marks: [...new Set([...target.marks, ...source.marks])],
    updatedAt: input.now
  };
  return withRevision(
    snapshot,
    input.now,
    {
      assessments: snapshot.assessments.map((item) =>
        item.assessmentId === target.assessmentId
          ? merged
          : item.assessmentId === source.assessmentId
            ? { ...item, supersededBy: target.assessmentId, updatedAt: input.now }
            : item
      ),
      facts: snapshot.facts.map((fact) =>
        fact.assessmentId === source.assessmentId
          ? { ...fact, assessmentId: target.assessmentId, updatedAt: input.now }
          : fact
      ),
      reviewItems: dropReviewItem(snapshot.reviewItems, input.reviewItemId)
    },
    [
      history(snapshot.course.courseId, "ASSESSMENT_MERGED", target.assessmentId, input.now, {
        note: source.assessmentId
      })
    ],
    [
      decision(
        "Merge",
        snapshot.course.courseId,
        input.reviewItemId,
        input.now,
        target.assessmentId,
        {
          sourceAssessmentId: source.assessmentId
        }
      )
    ]
  );
}

export function splitAssessment(
  snapshot: CourseSnapshot,
  input: {
    reviewItemId: string;
    sourceAssessmentId: string;
    parts: Array<{ assessmentId: string; name: string; factIds: string[] }>;
    expectedRevision: number;
    now: string;
  }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  if (input.parts.length < 2) throw new StateGuardError("SPLIT_NEEDS_TWO_PARTS");
  const source = snapshot.assessments.find(
    (item) => item.assessmentId === input.sourceAssessmentId
  );
  if (!source) throw new StateGuardError("SPLIT_SOURCE_MISSING");

  const created: AssessmentRecord[] = input.parts.map((part) => ({
    assessmentId: part.assessmentId,
    courseId: snapshot.course.courseId,
    role: "assessment",
    kind: source.kind,
    name: part.name,
    aliases: [],
    marks: [],
    createdBy: "user",
    createdAt: input.now,
    updatedAt: input.now
  }));
  const ownership = new Map<string, string>();
  for (const part of input.parts) {
    for (const factId of part.factIds) ownership.set(factId, part.assessmentId);
  }

  return withRevision(
    snapshot,
    input.now,
    {
      assessments: [
        ...snapshot.assessments.map((item) =>
          item.assessmentId === source.assessmentId
            ? {
                ...item,
                ...(created[0] ? { supersededBy: created[0].assessmentId } : {}),
                updatedAt: input.now
              }
            : item
        ),
        ...created
      ],
      facts: snapshot.facts.map((fact): FactRecord => {
        const owner = ownership.get(fact.factId);
        if (!owner) return fact;
        return { ...fact, assessmentId: owner, updatedAt: input.now };
      }),
      reviewItems: dropReviewItem(snapshot.reviewItems, input.reviewItemId)
    },
    [
      history(snapshot.course.courseId, "ASSESSMENT_SPLIT", source.assessmentId, input.now, {
        note: created.map((item) => item.assessmentId).join(",")
      })
    ],
    [
      decision(
        "Split",
        snapshot.course.courseId,
        input.reviewItemId,
        input.now,
        source.assessmentId,
        {
          createdAssessmentIds: created.map((item) => item.assessmentId)
        }
      )
    ]
  );
}

export function manualAddAssessment(
  snapshot: CourseSnapshot,
  input: {
    assessment: AssessmentRecord;
    facts: FactRecord[];
    expectedRevision: number;
    now: string;
  }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  if (input.assessment.courseId !== snapshot.course.courseId)
    throw new StateGuardError("COURSE_ID_MISMATCH");
  if (snapshot.assessments.some((item) => item.assessmentId === input.assessment.assessmentId)) {
    throw new StateGuardError("ASSESSMENT_EXISTS");
  }
  const stored: AssessmentRecord = {
    ...input.assessment,
    createdBy: "user",
    marks: [],
    createdAt: input.now,
    updatedAt: input.now
  };
  return withRevision(
    snapshot,
    input.now,
    {
      assessments: [...snapshot.assessments, stored],
      facts: [...snapshot.facts, ...input.facts.map((fact) => ({ ...fact, updatedAt: input.now }))]
    },
    [history(snapshot.course.courseId, "ASSESSMENT_ADDED", stored.assessmentId, input.now)],
    [
      {
        decisionId: randomId("dec"),
        courseId: snapshot.course.courseId,
        reviewItemId: `manual:${stored.assessmentId}`,
        kind: "ManualAdd",
        targetId: stored.assessmentId,
        decidedAt: input.now
      }
    ]
  );
}

export function editFact(
  snapshot: CourseSnapshot,
  input: {
    factId: string;
    value: FactValue;
    expectedRevision: number;
    now: string;
  }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const fact = snapshot.facts.find((item) => item.factId === input.factId);
  if (!fact) throw new StateGuardError("FACT_NOT_FOUND");
  const updated: FactRecord = {
    ...fact,
    value: structuredClone(input.value),
    marks: addMark(withoutMark(fact.marks, "PossiblyRemoved"), "Edited"),
    userEdited: true,
    updatedAt: input.now
  };
  return withRevision(
    snapshot,
    input.now,
    { facts: snapshot.facts.map((item) => (item.factId === fact.factId ? updated : item)) },
    [
      history(
        snapshot.course.courseId,
        "FIELD_EDITED",
        fact.assessmentId ?? fact.constraintId ?? fact.factId,
        input.now,
        {
          ...(fact.field ? { field: fact.field } : {}),
          fromValue: fact.value,
          toValue: input.value
        }
      )
    ],
    [
      {
        decisionId: randomId("dec"),
        courseId: snapshot.course.courseId,
        reviewItemId: `edit:${fact.factId}`,
        kind: "Edit",
        targetId: fact.factId,
        details: { field: fact.field },
        decidedAt: input.now
      }
    ]
  );
}

export function renameAssessment(
  snapshot: CourseSnapshot,
  input: { assessmentId: string; name: string; expectedRevision: number; now: string }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const assessment = snapshot.assessments.find((item) => item.assessmentId === input.assessmentId);
  if (!assessment) throw new StateGuardError("ASSESSMENT_NOT_FOUND");
  const aliases = [...new Set([...assessment.aliases, assessment.name])].filter(
    (alias) => alias !== input.name
  );
  return withRevision(
    snapshot,
    input.now,
    {
      assessments: snapshot.assessments.map((item) =>
        item.assessmentId === assessment.assessmentId
          ? {
              ...item,
              name: input.name,
              aliases,
              marks: addMark(item.marks, "Edited"),
              updatedAt: input.now
            }
          : item
      )
    },
    [
      history(snapshot.course.courseId, "FIELD_EDITED", assessment.assessmentId, input.now, {
        note: "name"
      })
    ]
  );
}

// ---------------------------------------------------------------------------
// Change Review decisions
// ---------------------------------------------------------------------------

export function acceptChange(
  snapshot: CourseSnapshot,
  input: { changeId: string; expectedRevision: number; now: string; value?: FactValue }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const change = snapshot.changes.find((item) => item.changeId === input.changeId);
  if (!change) throw new StateGuardError("CHANGE_NOT_FOUND");
  if (change.changeType === "IDENTITY_UNCERTAIN")
    throw new StateGuardError("CHANGE_NOT_APPLICABLE");
  const nextValue = input.value ?? change.latestValue;
  if (!nextValue) throw new StateGuardError("CHANGE_VALUE_MISSING");

  if (change.changeType === "NEW") {
    const assessment = snapshot.assessments.find((item) => item.assessmentId === change.targetId);
    if (!assessment) throw new StateGuardError("ASSESSMENT_NOT_FOUND");
    return withRevision(
      snapshot,
      input.now,
      {
        assessments: snapshot.assessments.map((item) =>
          item.assessmentId === assessment.assessmentId ? { ...item, updatedAt: input.now } : item
        ),
        changes: snapshot.changes.filter((item) => item.changeId !== change.changeId),
        reviewItems: snapshot.reviewItems.filter((item) => item.targetId !== change.targetId)
      },
      [
        history(
          snapshot.course.courseId,
          "ASSESSMENT_CONFIRMED",
          assessment.assessmentId,
          input.now
        )
      ],
      [
        decision(
          "AcceptChange",
          snapshot.course.courseId,
          `change:${change.changeId}`,
          input.now,
          change.targetId
        )
      ]
    );
  }

  if (!change.field) throw new StateGuardError("CHANGE_FIELD_MISSING");
  const fact = snapshot.facts.find(
    (item) =>
      item.assessmentId === change.targetId && item.field === change.field && !item.superseded
  );
  if (!fact) throw new StateGuardError("FACT_NOT_FOUND");
  const updated: FactRecord = {
    ...fact,
    value: structuredClone(nextValue),
    marks: addMark(withoutMark(fact.marks, "PossiblyRemoved"), "Changed"),
    userEdited: false,
    updatedAt: input.now
  };

  return withRevision(
    snapshot,
    input.now,
    {
      facts: snapshot.facts.map((item) => (item.factId === fact.factId ? updated : item)),
      changes: snapshot.changes.filter((item) => item.changeId !== change.changeId)
    },
    [
      history(snapshot.course.courseId, "CHANGE_ACCEPTED", change.targetId, input.now, {
        ...(change.field ? { field: change.field } : {}),
        fromValue: fact.value,
        toValue: nextValue
      })
    ],
    [
      decision(
        "AcceptChange",
        snapshot.course.courseId,
        `change:${change.changeId}`,
        input.now,
        change.targetId,
        {
          changeType: change.changeType
        }
      )
    ]
  );
}

/**
 * Keep Current preserves the accepted value and records the real discrepancy. It must not
 * become permanent suppression: a later, genuinely different value can raise a new review.
 */
export function keepCurrent(
  snapshot: CourseSnapshot,
  input: { changeId: string; expectedRevision: number; now: string }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const change = snapshot.changes.find((item) => item.changeId === input.changeId);
  if (!change) throw new StateGuardError("CHANGE_NOT_FOUND");
  return withRevision(
    snapshot,
    input.now,
    { changes: snapshot.changes.filter((item) => item.changeId !== change.changeId) },
    [
      history(snapshot.course.courseId, "CHANGE_KEPT_CURRENT", change.targetId, input.now, {
        ...(change.field ? { field: change.field } : {}),
        ...(change.currentValue ? { fromValue: change.currentValue } : {}),
        ...(change.latestValue ? { toValue: change.latestValue } : {}),
        note: "discrepancy"
      })
    ],
    [
      decision(
        "KeepCurrent",
        snapshot.course.courseId,
        `change:${change.changeId}`,
        input.now,
        change.targetId,
        {
          field: change.field,
          latest: change.latestValue
        }
      )
    ]
  );
}

export function resolveConflict(
  snapshot: CourseSnapshot,
  input: {
    changeId: string;
    resolution: FactValue;
    expectedRevision: number;
    now: string;
  }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const change = snapshot.changes.find((item) => item.changeId === input.changeId);
  if (!change || change.changeType !== "CONFLICT") throw new StateGuardError("CONFLICT_NOT_FOUND");
  const fact = snapshot.facts.find(
    (item) =>
      item.assessmentId === change.targetId && item.field === change.field && !item.superseded
  );
  if (!fact) throw new StateGuardError("FACT_NOT_FOUND");
  const resolution = { ...structuredClone(input.resolution) };
  return withRevision(
    snapshot,
    input.now,
    {
      facts: snapshot.facts.map((item) =>
        item.factId === fact.factId
          ? {
              ...item,
              value: {
                state: resolution.state,
                ...(resolution.value !== undefined ? { value: resolution.value } : {})
              },
              updatedAt: input.now
            }
          : item
      ),
      changes: snapshot.changes.filter((item) => item.changeId !== change.changeId)
    },
    [
      history(snapshot.course.courseId, "CONFLICT_RESOLVED", change.targetId, input.now, {
        ...(change.field ? { field: change.field } : {}),
        fromValue: fact.value,
        toValue: input.resolution
      })
    ],
    [
      decision(
        "ResolveConflict",
        snapshot.course.courseId,
        `change:${change.changeId}`,
        input.now,
        change.targetId
      )
    ]
  );
}

export function keepPossiblyRemoved(
  snapshot: CourseSnapshot,
  input: { changeId: string; expectedRevision: number; now: string }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const change = snapshot.changes.find((item) => item.changeId === input.changeId);
  if (!change || change.changeType !== "POSSIBLY_REMOVED") {
    throw new StateGuardError("CHANGE_NOT_APPLICABLE");
  }
  return withRevision(
    snapshot,
    input.now,
    {
      assessments: snapshot.assessments.map((item) =>
        item.assessmentId === change.targetId
          ? { ...item, marks: addMark(item.marks, "PossiblyRemoved"), updatedAt: input.now }
          : item
      ),
      changes: snapshot.changes.filter((item) => item.changeId !== change.changeId)
    },
    [history(snapshot.course.courseId, "POSSIBLY_REMOVED_KEPT", change.targetId, input.now)],
    [
      decision(
        "KeepPossiblyRemoved",
        snapshot.course.courseId,
        `change:${change.changeId}`,
        input.now,
        change.targetId
      )
    ]
  );
}

export function removeAssessment(
  snapshot: CourseSnapshot,
  input: { changeId: string; expectedRevision: number; now: string }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const change = snapshot.changes.find((item) => item.changeId === input.changeId);
  if (!change || change.changeType !== "POSSIBLY_REMOVED") {
    throw new StateGuardError("CHANGE_NOT_APPLICABLE");
  }
  return withRevision(
    snapshot,
    input.now,
    {
      assessments: snapshot.assessments.map((item) =>
        item.assessmentId === change.targetId
          ? { ...item, supersededBy: "removed", updatedAt: input.now }
          : item
      ),
      facts: snapshot.facts.map((fact) =>
        fact.assessmentId === change.targetId
          ? { ...fact, superseded: true, updatedAt: input.now }
          : fact
      ),
      changes: snapshot.changes.filter((item) => item.changeId !== change.changeId)
    },
    [history(snapshot.course.courseId, "ASSESSMENT_REMOVED", change.targetId, input.now)],
    [
      decision(
        "Remove",
        snapshot.course.courseId,
        `change:${change.changeId}`,
        input.now,
        change.targetId
      )
    ]
  );
}

export function resolveIdentity(
  snapshot: CourseSnapshot,
  input: {
    changeId: string;
    relationship: "SAME_ASSESSMENT" | "DIFFERENT_ASSESSMENT";
    expectedRevision: number;
    now: string;
  }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const change = snapshot.changes.find((item) => item.changeId === input.changeId);
  if (!change || change.changeType !== "IDENTITY_UNCERTAIN")
    throw new StateGuardError("CHANGE_NOT_APPLICABLE");
  return withRevision(
    snapshot,
    input.now,
    { changes: snapshot.changes.filter((item) => item.changeId !== change.changeId) },
    [
      history(snapshot.course.courseId, "CHANGE_ACCEPTED", change.targetId, input.now, {
        note: input.relationship
      })
    ],
    [
      decision(
        input.relationship === "SAME_ASSESSMENT" ? "KeepIdentity" : "DifferentIdentity",
        snapshot.course.courseId,
        `change:${change.changeId}`,
        input.now,
        change.targetId
      )
    ]
  );
}

/**
 * A kept Possibly Removed object that is reliably found again drops the mark without a new
 * Review and records the transition in History.
 */
export function resolveReappearance(
  snapshot: CourseSnapshot,
  input: { assessmentId: string; expectedRevision: number; now: string }
): MutationResult | null {
  requireRevision(snapshot, input.expectedRevision);
  const assessment = snapshot.assessments.find((item) => item.assessmentId === input.assessmentId);
  if (!assessment || !assessment.marks.includes("PossiblyRemoved")) return null;
  return withRevision(
    snapshot,
    input.now,
    {
      assessments: snapshot.assessments.map((item) =>
        item.assessmentId === assessment.assessmentId
          ? { ...item, marks: withoutMark(item.marks, "PossiblyRemoved"), updatedAt: input.now }
          : item
      )
    },
    [
      history(
        snapshot.course.courseId,
        "POSSIBLY_REMOVED_RESOLVED",
        assessment.assessmentId,
        input.now
      )
    ]
  );
}

export function replaceCourseState(
  snapshot: CourseSnapshot,
  input: {
    assessments: AssessmentRecord[];
    constraints: ConstraintRecord[];
    facts: FactRecord[];
    expectedRevision: number;
    now: string;
    note: string;
  }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  return withRevision(
    snapshot,
    input.now,
    {
      assessments: structuredClone(input.assessments),
      constraints: structuredClone(input.constraints),
      facts: structuredClone(input.facts),
      changes: [],
      reviewItems: []
    },
    [
      history(snapshot.course.courseId, "REBUILT_STATE_USED", snapshot.course.courseId, input.now, {
        note: input.note
      })
    ]
  );
}

export function recordKeepCurrentCourse(
  snapshot: CourseSnapshot,
  input: { expectedRevision: number; now: string }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  return withRevision(
    snapshot,
    input.now,
    { changes: snapshot.changes, reviewItems: snapshot.reviewItems },
    [
      history(
        snapshot.course.courseId,
        "CHANGE_KEPT_CURRENT",
        snapshot.course.courseId,
        input.now,
        {
          note: "rebuild-declined"
        }
      )
    ],
    [
      {
        decisionId: randomId("dec"),
        courseId: snapshot.course.courseId,
        reviewItemId: `rebuild:${input.now}`,
        kind: "KeepCurrentCourse",
        decidedAt: input.now
      }
    ]
  );
}
