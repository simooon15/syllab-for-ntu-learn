import type {
  AssessmentRecord,
  AssessmentRole,
  CurrentMark,
  FactRecord,
  FactValue
} from "./domain";

export type AssessmentKind = AssessmentRecord["kind"];

export const KIND_GROUP_ORDER = [
  "Assignments",
  "Projects",
  "Quizzes & Tests",
  "Exams",
  "Other"
] as const;

export type KindGroup = (typeof KIND_GROUP_ORDER)[number];

const KIND_TO_GROUP: Record<AssessmentKind, KindGroup> = {
  assignment: "Assignments",
  project: "Projects",
  quiz_test: "Quizzes & Tests",
  exam: "Exams",
  other: "Other"
};

export function kindGroup(kind: AssessmentKind): KindGroup {
  return KIND_TO_GROUP[kind];
}

/** Assessment-specific fields get a human label; raw field keys never reach the user. */
const FIELD_LABELS: Record<string, string> = {
  weight: "Weight",
  deadline: "Deadline",
  date: "Date",
  due_date: "Deadline",
  exam_date: "Exam date",
  start_date: "Starts",
  submission_method: "Submission",
  group_size: "Group size",
  word_limit: "Word limit",
  page_limit: "Page limit",
  presentation_duration: "Duration",
  format: "Format",
  duration: "Duration",
  venue: "Venue",
  mode: "Mode"
};

/** Fields that read as short "key · value" chips next to the assessment name. */
const SUMMARY_FIELDS = [
  "weight",
  "deadline",
  "due_date",
  "exam_date",
  "date",
  "group_size",
  "submission_method",
  "word_limit",
  "page_limit",
  "presentation_duration",
  "duration",
  "format"
];

export function fieldLabel(field: string): string {
  return (
    FIELD_LABELS[field] ?? field.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase())
  );
}

export function isSummaryField(field: string): boolean {
  return SUMMARY_FIELDS.includes(field);
}

function renderScalar(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => renderScalar(item))
      .filter((item): item is string => item !== null);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
}

const UNKNOWN_COPY = "To be announced";
const UNCERTAIN_COPY = "Not yet clear";

/**
 * A field's user-facing reading. `Not Mentioned` has no representation at all — an absent
 * field is absent, never a placeholder. Competing values stay visible together; the product
 * never silently picks one.
 */
export function renderFactValue(value: FactValue): string {
  if (value.state === "EXPLICITLY_UNKNOWN") return UNKNOWN_COPY;
  if (value.state === "UNCERTAIN") {
    return renderScalar(value.value) ?? UNCERTAIN_COPY;
  }
  return renderScalar(value.value) ?? UNCERTAIN_COPY;
}

export function competingValues(value: FactValue): string[] {
  const competing = value.competingValues ?? [];
  const rendered = competing
    .map((item) => renderScalar(item))
    .filter((item): item is string => item !== null);
  return [...new Set(rendered)];
}

export interface AssessmentPresentation {
  /** The canonical record behind this presentation. */
  record: AssessmentRecord;
  kind: AssessmentKind;
  name: string;
  kindLabel: string;
  group: KindGroup;
  summary: string[];
  requirements: string[];
  children: AssessmentPresentation[];
  seriesInstances: Array<{ name: string; summary: string[] }>;
  seriesNote?: string;
}

export interface FactPartition {
  summary: FactRecord[];
  requirements: FactRecord[];
  other: FactRecord[];
}

/**
 * An Assessment Series is the top-level object; its repeated instances are lighter rows.
 * Instances are never promoted to top-level Assessments and never re-sorted by the UI.
 */
export function partitionAssessmentFacts(facts: FactRecord[]): FactPartition {
  const summary: FactRecord[] = [];
  const requirements: FactRecord[] = [];
  const other: FactRecord[] = [];
  for (const fact of facts) {
    if (isSummaryField(fact.field)) summary.push(fact);
    else if (fact.field === "requirement" || fact.field.startsWith("requirement_"))
      requirements.push(fact);
    else other.push(fact);
  }
  return { summary, requirements, other };
}

export function presentAssessment(
  assessment: AssessmentRecord,
  facts: FactRecord[],
  children: AssessmentRecord[],
  childFacts: (assessmentId: string) => FactRecord[]
): AssessmentPresentation {
  const own = partitionAssessmentFacts(facts);
  const childPresentations = children.map((child) =>
    presentAssessment(child, childFacts(child.assessmentId), [], () => [])
  );
  const instances = childPresentations
    .filter((child) => child.kindLabel === "Series instance")
    .map((child) => ({ name: child.name, summary: child.summary }));
  return {
    children: childPresentations.filter((child) => child.kindLabel !== "Series instance"),
    seriesInstances: instances,
    ...(assessment.role === "series" && instances.length > 0
      ? { seriesNote: `${String(instances.length)} instances` }
      : {}),
    record: assessment,
    kind: assessment.kind,
    name: assessment.name,
    kindLabel: kindLabel(assessment.kind, assessment.role),
    group: kindGroup(assessment.kind),
    summary: own.summary.map(
      (fact) => `${fieldLabel(fact.field)} · ${renderFactValue(fact.value)}`
    ),
    requirements: [...own.requirements, ...own.other]
      .map((fact) => renderRequirement(fact))
      .filter((text) => text.length > 0)
  };
}

function renderRequirement(fact: FactRecord): string {
  const rendered = renderFactValue(fact.value);
  if (fact.field === "requirement") return rendered;
  return `${fieldLabel(fact.field)}: ${rendered}`;
}

export function kindLabel(kind: AssessmentKind, role: AssessmentRole): string {
  if (role === "component") return "Component";
  if (role === "series_instance") return "Series instance";
  if (role === "series") return "Series";
  switch (kind) {
    case "assignment":
      return "Assignment";
    case "project":
      return "Project";
    case "quiz_test":
      return "Quiz / Test";
    case "exam":
      return "Exam";
    case "other":
      return "Assessment";
  }
}

/** Stable order inside a group: by name, never by AI-perceived importance. */
export function sortAssessments(assessments: AssessmentRecord[]): AssessmentRecord[] {
  return [...assessments].sort((left, right) => left.name.localeCompare(right.name));
}

export function groupAssessments(
  assessments: AssessmentRecord[]
): Array<{ group: KindGroup; items: AssessmentRecord[] }> {
  return KIND_GROUP_ORDER.map((group) => ({
    group,
    items: sortAssessments(assessments.filter((item) => kindGroup(item.kind) === group))
  })).filter((entry) => entry.items.length > 0);
}

export function markFor(marks: CurrentMark[], mark: CurrentMark): boolean {
  return marks.includes(mark);
}
