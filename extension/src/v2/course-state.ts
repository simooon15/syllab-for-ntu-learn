import { withHumanSemantics, operativeSemantics } from "./fact-semantics";
import type { FactSemantics } from "./schema";
import { requirePresent } from "./errors";
import { randomId } from "./crypto";
import { renderFactValue } from "./assessments";
import type {
  AssessmentRecord,
  ChangeRecord,
  ConstraintRecord,
  CourseRecord,
  CurrentMark,
  FactRecord,
  FactValue,
  EvidenceReference,
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

/** NEW facts on an existing owner are additions, never permission to overwrite Current. */
export function factsForReview(
  stored: FactRecord[],
  proposed: FactRecord[],
  changeType?: string
): FactRecord[] {
  if (changeType !== "NEW") return stored.length ? stored : proposed;
  const currentIds = new Set(stored.map((f) => f.factId));
  return [...stored, ...proposed.filter((f) => !currentIds.has(f.factId))];
}

/** Preserve an existing Rule and append only explicitly reviewed new observations. */
export function constraintForReview(
  current: ConstraintRecord | undefined,
  proposed: ConstraintRecord,
  storedFacts: FactRecord[],
  proposedFacts: FactRecord[],
  changeType?: string
): ConstraintRecord {
  if (!current || changeType !== "NEW") return current ?? proposed;
  const ids = new Set(storedFacts.map((f) => f.factId));
  const additions = proposedFacts.filter((f) => !ids.has(f.factId));
  return {
    ...current,
    content: [
      current.content,
      ...additions.map((f) => {
        const c = f.semanticClause;
        const value = renderFactValue(f.value);
        return `${f.value.state === "UNCERTAIN" ? "UNCERTAIN — " : ""}${c?.modality && c.modality !== "descriptive" ? `${c.modality}: ` : ""}${value}${
          c
            ? [...c.conditions, ...c.exceptions, c.context]
                .filter((x): x is string => typeof x === "string" && !!x && !value.includes(x))
                .map((x) => `\n${x}`)
                .join("")
            : ""
        }`;
      })
    ].join("\n"),
    evidenceRefs: [
      ...new Map(
        [...current.evidenceRefs, ...additions.flatMap((f) => f.evidenceRefs)].map((r) => [
          JSON.stringify(r),
          r
        ])
      ).values()
    ]
  };
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
  constraint?: ConstraintRecord;
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
        history(
          snapshot.course.courseId,
          input.constraint?.constraintId === item.targetId ||
            snapshot.constraints.some((c) => c.constraintId === item.targetId)
            ? "CONSTRAINT_EXCLUDED"
            : "ASSESSMENT_EXCLUDED",
          item.targetId,
          input.now,
          {
            ...(typeof item.payload.proposalKey === "string"
              ? { note: item.payload.proposalKey }
              : {})
          }
        )
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

  const constraint =
    input.constraint ?? snapshot.constraints.find((c) => c.constraintId === item.targetId);
  if (constraint) {
    if (
      constraint.courseId !== snapshot.course.courseId ||
      constraint.constraintId !== item.targetId
    )
      throw new StateGuardError("CONSTRAINT_OWNERSHIP_MISMATCH");
    if (input.kind === "Edit") throw new StateGuardError("CONSTRAINT_EDIT_NOT_SUPPORTED");
    const facts = input.facts ?? [];
    if (
      facts.some(
        (f) =>
          f.courseId !== snapshot.course.courseId ||
          f.constraintId !== constraint.constraintId ||
          f.assessmentId !== undefined
      )
    )
      throw new StateGuardError("FACT_OWNERSHIP_MISMATCH");
    return withRevision(
      snapshot,
      input.now,
      {
        constraints: [
          ...snapshot.constraints.filter((c) => c.constraintId !== constraint.constraintId),
          { ...constraint, updatedAt: input.now }
        ],
        facts: [
          ...snapshot.facts.filter((f) => !facts.some((incoming) => incoming.factId === f.factId)),
          ...facts.map((f) => ({ ...f, updatedAt: input.now }))
        ],
        reviewItems: dropReviewItem(snapshot.reviewItems, item.reviewItemId)
      },
      [
        history(
          snapshot.course.courseId,
          "CONSTRAINT_CONFIRMED",
          constraint.constraintId,
          input.now
        )
      ],
      [decision("Confirm", snapshot.course.courseId, item.reviewItemId, input.now, item.targetId)]
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
    marks:
      input.kind === "Edit" && (fact.userEdited || !item.payload.productScope)
        ? addMark(fact.marks, "Edited")
        : fact.marks,
    ...(input.kind === "Edit" && (fact.userEdited || !item.payload.productScope)
      ? { userEdited: true }
      : {}),
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
  // Human corrects identity here; pending semantic scopes are preserved by the handler.
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

  // Structural correction must not orphan independent obligations outside the visible base scope.
  for (const fact of snapshot.facts)
    if (fact.assessmentId === source.assessmentId && !ownership.has(fact.factId))
      ownership.set(fact.factId, requirePresent(created[0]).assessmentId);
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
    semantics?: FactSemantics;
    expectedRevision: number;
    now: string;
  }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const fact = snapshot.facts.find((item) => item.factId === input.factId);
  if (!fact) throw new StateGuardError("FACT_NOT_FOUND");
  const updated: FactRecord = {
    ...withHumanSemantics(fact, input.semantics),
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
          toValue: input.value,
          ...(fact.humanSemantics ? { fromSemantics: fact.humanSemantics } : {}),
          ...(input.semantics ? { toSemantics: input.semantics } : {})
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

function factForChange(snapshot: CourseSnapshot, change: ChangeRecord): FactRecord {
  const matches = snapshot.facts.filter(
    (item) =>
      (item.assessmentId === change.targetId || item.constraintId === change.targetId) &&
      !item.superseded &&
      (item.factId === change.field || item.field === change.field)
  );
  if (matches.length > 1) throw new StateGuardError("CHANGE_FIELD_AMBIGUOUS");
  const fact = matches[0];
  if (!fact) throw new StateGuardError("FACT_NOT_FOUND");
  return fact;
}
function ruleChange(
  snapshot: CourseSnapshot,
  change: ChangeRecord,
  value: FactValue,
  now: string,
  event: "CHANGE_ACCEPTED" | "CONFLICT_RESOLVED",
  evidenceRefs?: EvidenceReference[]
): MutationResult | null {
  const rule = snapshot.constraints.find(
    (c) => c.constraintId === change.targetId && !c.superseded
  );
  if (!rule || change.field !== "content") return null;
  if (value.state !== "KNOWN" || typeof value.value !== "string" || !value.value.trim())
    throw new StateGuardError("CONSTRAINT_VALUE_UNRESOLVED");
  return withRevision(
    snapshot,
    now,
    {
      constraints: snapshot.constraints.map((c) =>
        c.constraintId === rule.constraintId
          ? {
              ...c,
              content: value.value as string,
              ...(evidenceRefs ? { evidenceRefs } : {}),
              marks: addMark(c.marks, "Changed"),
              updatedAt: now
            }
          : c
      ),
      changes: snapshot.changes.filter((c) => c.changeId !== change.changeId)
    },
    [
      history(snapshot.course.courseId, event, rule.constraintId, now, {
        field: "content",
        fromValue: { state: "KNOWN", value: rule.content },
        toValue: value
      })
    ],
    [
      decision(
        event === "CONFLICT_RESOLVED" ? "ResolveConflict" : "AcceptChange",
        snapshot.course.courseId,
        `change:${change.changeId}`,
        now,
        rule.constraintId
      )
    ]
  );
}

/** Project the accepted independent rule facts; old unstructured Rules keep their own body. */
function clauseRules(
  constraints: ConstraintRecord[],
  facts: FactRecord[],
  now: string
): ConstraintRecord[] {
  return constraints.map((rule) => {
    const clauses = facts.filter(
      (f) =>
        f.constraintId === rule.constraintId &&
        !f.superseded &&
        f.field === "content" &&
        f.semanticClause
    );
    if (!clauses.length) return rule;
    const content = clauses
      .map(
        (f) =>
          `${f.value.state === "UNCERTAIN" ? "UNCERTAIN — " : ""}${operativeSemantics(f)?.modality && operativeSemantics(f)?.modality !== "descriptive" ? `${operativeSemantics(f)?.modality ?? ""}: ` : ""}${f.value.value === undefined ? (f.semanticClause?.content ?? "") : String(f.value.value)}`
      )
      .join("\n");
    return content === rule.content ? rule : { ...rule, content, updatedAt: now };
  });
}

export function acceptChange(
  snapshot: CourseSnapshot,
  input: {
    changeId: string;
    expectedRevision: number;
    now: string;
    value?: FactValue;
    evidenceRefs?: EvidenceReference[];
  }
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
        changes: snapshot.changes.filter(
          (item) => !(item.changeType === "NEW" && item.targetId === change.targetId)
        ),
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
  const constraintResult = ruleChange(snapshot, change, nextValue, input.now, "CHANGE_ACCEPTED");
  if (constraintResult) return constraintResult;
  const existing = snapshot.facts.filter(
    (f) =>
      (f.assessmentId === change.targetId || f.constraintId === change.targetId) &&
      !f.superseded &&
      (f.factId === change.field || f.field === change.field)
  );
  // A new evidenced field on an already trusted owner is still a Human decision.
  // It has no previous fact to update; never fabricate a current value or replace a sibling.
  if (!existing.length && !change.currentValue && change.changeType === "CHANGED") {
    const owner = snapshot.assessments.find(
      (a) => a.assessmentId === change.targetId && !a.supersededBy
    );
    const rule = snapshot.constraints.find(
      (c) => c.constraintId === change.targetId && !c.superseded
    );
    if (
      (!owner && !rule) ||
      nextValue.state !== "KNOWN" ||
      nextValue.value === undefined ||
      !input.evidenceRefs?.length
    )
      throw new StateGuardError("NEW_FIELD_NOT_SUPPORTED");
    const added: FactRecord = {
      factId: randomId("fact"),
      courseId: snapshot.course.courseId,
      ...(owner ? { assessmentId: owner.assessmentId } : { constraintId: change.targetId }),
      field: change.proposedFact?.field ?? change.field,
      value: structuredClone(nextValue),
      evidenceRefs: structuredClone(input.evidenceRefs),
      marks: ["Changed"],
      userEdited: false,
      ...(change.proposedFact?.product
        ? { product: structuredClone(change.proposedFact.product) }
        : {}),
      ...(change.proposedFact?.semanticClause
        ? { semanticClause: structuredClone(change.proposedFact.semanticClause) }
        : {}),
      updatedAt: input.now
    };
    return withRevision(
      snapshot,
      input.now,
      {
        facts: [...snapshot.facts, added],
        constraints: clauseRules(snapshot.constraints, [...snapshot.facts, added], input.now),
        changes: snapshot.changes.filter((c) => c.changeId !== change.changeId)
      },
      [
        history(snapshot.course.courseId, "CHANGE_ACCEPTED", change.targetId, input.now, {
          field: change.field,
          toValue: nextValue
        })
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
  const fact = factForChange(snapshot, change);
  const acceptedBase = structuredClone(fact);
  if (change.proposedFact) delete acceptedBase.humanSemantics;
  const updated: FactRecord = {
    ...acceptedBase,
    value: structuredClone(nextValue),
    ...(input.evidenceRefs ? { evidenceRefs: input.evidenceRefs } : {}),
    marks: addMark(withoutMark(fact.marks, "PossiblyRemoved"), "Changed"),
    userEdited: false,
    ...(change.proposedFact?.product
      ? { product: structuredClone(change.proposedFact.product) }
      : {}),
    ...(change.proposedFact?.semanticClause
      ? { semanticClause: structuredClone(change.proposedFact.semanticClause) }
      : {}),
    updatedAt: input.now
  };

  return withRevision(
    snapshot,
    input.now,
    {
      facts: snapshot.facts.map((item) => (item.factId === fact.factId ? updated : item)),
      constraints: clauseRules(
        snapshot.constraints,
        snapshot.facts.map((item) => (item.factId === fact.factId ? updated : item)),
        input.now
      ),
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
    evidenceRefs?: EvidenceReference[];
    expectedRevision: number;
    now: string;
  }
): MutationResult {
  requireRevision(snapshot, input.expectedRevision);
  const change = snapshot.changes.find((item) => item.changeId === input.changeId);
  if (!change || change.changeType !== "CONFLICT") throw new StateGuardError("CONFLICT_NOT_FOUND");
  const constraintResult = ruleChange(
    snapshot,
    change,
    input.resolution,
    input.now,
    "CONFLICT_RESOLVED",
    input.evidenceRefs
  );
  if (constraintResult) return constraintResult;
  const fact = factForChange(snapshot, change);
  const resolution = { ...structuredClone(input.resolution) };
  const resolvedFacts = snapshot.facts.map((item) =>
    item.factId === fact.factId
      ? {
          ...item,
          value: structuredClone(resolution),
          ...(input.evidenceRefs ? { evidenceRefs: input.evidenceRefs } : {}),
          ...(input.evidenceRefs && change.proposedFact?.product
            ? { product: structuredClone(change.proposedFact.product) }
            : {}),
          ...(input.evidenceRefs && change.proposedFact?.semanticClause
            ? { semanticClause: structuredClone(change.proposedFact.semanticClause) }
            : {}),
          updatedAt: input.now
        }
      : item
  );
  return withRevision(
    snapshot,
    input.now,
    {
      facts: resolvedFacts,
      constraints: clauseRules(snapshot.constraints, resolvedFacts, input.now),
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
      constraints: snapshot.constraints.map((item) =>
        item.constraintId === change.targetId
          ? { ...item, superseded: true, updatedAt: input.now }
          : item
      ),
      facts: snapshot.facts.map((fact) =>
        fact.assessmentId === change.targetId || fact.constraintId === change.targetId
          ? { ...fact, superseded: true, updatedAt: input.now }
          : fact
      ),
      changes: snapshot.changes.filter((item) => item.changeId !== change.changeId)
    },
    [
      history(
        snapshot.course.courseId,
        snapshot.constraints.some((c) => c.constraintId === change.targetId)
          ? "CONSTRAINT_REMOVED"
          : "ASSESSMENT_REMOVED",
        change.targetId,
        input.now
      )
    ],
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
