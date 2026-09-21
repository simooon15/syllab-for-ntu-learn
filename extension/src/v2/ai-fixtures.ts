/**
 * Synthetic, offline AI regression fixtures.
 *
 * Every byte here is invented for the tests: no NTU Learn content, no real course prose, no
 * student data, no API key (see docs/fixture-policy.md). A fixture pairs the context a task would
 * receive with the response a model recorded against it, plus the deterministic hard checks that
 * must hold for that case.
 */

import { isRecord } from "@syllab/contracts";

import type { AiCourseIndexEntry, AiEvidence } from "./ai-context";
import { type Chunk, planChunks } from "./chunking";
import type { ChangeRecord, FactValue, KnowledgeState } from "./domain";

export interface FixtureSource {
  sourceId: string;
  sourceType: string;
  title: string;
  text: string;
  structure: string[];
}

export interface FixtureExpectation {
  outcome: "succeeded" | "failed";
  /** Fragment the failure detail must contain, for rejected fixtures. */
  detailContains?: string;
  /** Physical calls the unit may spend; pins the chunk / expansion shape. */
  calls?: number;
  sourceResult?: string;
  changeTypes?: string[];
  relationships?: string[];
  expansionRounds?: number;
}

export type HardCheck =
  | "evidence_traceable"
  | "enums_legal"
  | "no_product_instructions"
  | "competing_values_preserved"
  | "uncertain_preserved"
  | "removal_requires_coverage"
  | "index_complete"
  | "evidence_expansion_scope";

interface FixtureBase {
  caseId: string;
  title: string;
  /** Recorded model responses in physical-call order; the last one repeats. */
  responses: unknown[];
  expectation: FixtureExpectation;
  hardChecks: HardCheck[];
}

export interface TaskAFixture extends FixtureBase {
  task: "task-a";
  source: FixtureSource;
}

export interface TaskBFixture extends FixtureBase {
  task: "task-b";
  drafts: unknown[];
  constraintCandidates: unknown[];
  courseIndex: AiCourseIndexEntry[];
  evidence: AiEvidence[];
}

export interface TaskCFixture extends FixtureBase {
  task: "task-c";
  target: AiCourseIndexEntry;
  currentFacts: unknown[];
  currentEvidence: AiEvidence[];
  newEvidence: AiEvidence[];
  identity?: unknown;
  userState?: unknown;
  coverageFacts: unknown;
  coverageSufficient: boolean;
  history?: unknown[];
}

export type AiFixture = TaskAFixture | TaskBFixture | TaskCFixture;

export function chunksFor(source: FixtureSource): Chunk[] {
  return planChunks({
    sourceId: source.sourceId,
    locator: source.title,
    text: source.text,
    structure: source.structure
  });
}

/** A deterministic filler block; long Sources in these fixtures are built only from this. */
function block(seed: string, length: number): string {
  const unit = `Synthetic fixture sentence ${seed} used only for chunking behaviour. `;
  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

const SOURCE_ASSIGNMENT: FixtureSource = {
  sourceId: "src-assignment",
  sourceType: "assignment",
  title: "Synthetic assignment page",
  text: "Synthetic fixture only." + " The group project report is worth 30% and is due 12 Oct.",
  structure: []
};

const SOURCE_NOT_ASSESSMENT: FixtureSource = {
  sourceId: "src-material",
  sourceType: "course-content-item",
  title: "Synthetic materials page",
  text:
    "Synthetic fixture only." +
    " Week 4 slides, the recording link, the reading list and consultation hours are listed here." +
    " No submission, weight or deadline is described on this page.",
  structure: []
};

const SOURCE_CONSTRAINT: FixtureSource = {
  sourceId: "src-policy",
  sourceType: "announcement",
  title: "Synthetic policy notice",
  text:
    "Synthetic fixture only." +
    " Late submissions across all assessments are accepted for 48 hours with a 10% deduction.",
  structure: []
};

const SOURCE_VISUAL: FixtureSource = {
  sourceId: "src-visual",
  sourceType: "attachment",
  title: "Synthetic scanned schedule",
  text:
    "Synthetic fixture only." +
    " Quiz 2 appears in the scanned table; the weight column could not be read from the image.",
  structure: []
};

const SOURCE_LONG: FixtureSource = {
  sourceId: "src-long",
  sourceType: "attachment",
  title: "Synthetic long handout",
  text: `${block("first", 7_000)}\n\n${block("second", 7_000)}`,
  structure: []
};

const EVIDENCE_LONG: AiEvidence = {
  evidenceId: "ev-long-1",
  sourceId: SOURCE_LONG.sourceId,
  locator: "handout body",
  excerpt: "Synthetic fixture sentence first used only for chunking behaviour."
};

const DRAFT_LONG = {
  draftId: "draft-long",
  name: "Handout Project",
  type: "project",
  role: "assessment",
  aliases: [],
  fields: [{ fieldName: "weight", state: "KNOWN", value: "30%", evidence: [EVIDENCE_LONG] }],
  requirements: [],
  unresolvedIssues: []
};

const INDEX_ASSESSMENT: AiCourseIndexEntry = {
  objectId: "assessment-1",
  kind: "assessment",
  name: "Group Project Report",
  type: "project",
  role: "assessment",
  aliases: ["Project"],
  fields: [{ fieldName: "weight", display: "30%" }],
  flags: []
};

const INDEX_QUIZ: AiCourseIndexEntry = {
  objectId: "assessment-2",
  kind: "assessment",
  name: "Weekly Quiz",
  type: "quiz_test",
  role: "series",
  aliases: [],
  fields: [{ fieldName: "weight", display: "10%" }],
  flags: ["identity unresolved"]
};

const INDEX_CONSTRAINT: AiCourseIndexEntry = {
  objectId: "constraint-1",
  kind: "constraint",
  name: "Late submission rule",
  aliases: [],
  fields: [{ fieldName: "content", display: "48 hours, 10% deduction" }],
  flags: []
};

const EVIDENCE_DRAFT: AiEvidence = {
  evidenceId: "ev-draft-1",
  sourceId: SOURCE_ASSIGNMENT.sourceId,
  locator: "assignment body",
  excerpt: "The group project report is worth 30% and is due 12 Oct."
};

const EVIDENCE_OBJECT: AiEvidence = {
  evidenceId: "ev-object-1",
  sourceId: "src-earlier",
  locator: "page 2",
  excerpt: "Synthetic earlier notice for the same group project report.",
  objectId: INDEX_ASSESSMENT.objectId
};

const DRAFT_PROJECT = {
  draftId: "draft-project",
  name: "Group Project Report",
  type: "project",
  role: "assessment",
  aliases: ["Project"],
  fields: [
    {
      fieldName: "weight",
      state: "KNOWN",
      value: "30%",
      evidence: [EVIDENCE_DRAFT]
    },
    {
      fieldName: "deadline",
      state: "KNOWN",
      value: "12 Oct",
      evidence: [EVIDENCE_DRAFT]
    }
  ],
  requirements: [],
  unresolvedIssues: []
};

const DRAFT_REPORT = {
  draftId: "draft-report",
  name: "Project write-up",
  type: "project",
  role: "assessment",
  aliases: [],
  fields: [
    {
      fieldName: "weight",
      state: "KNOWN",
      value: "30%",
      evidence: [EVIDENCE_DRAFT]
    }
  ],
  requirements: [{ requirementId: "req-1", content: "PDF submission", evidence: [EVIDENCE_DRAFT] }],
  unresolvedIssues: []
};

export const AI_FIXTURES: AiFixture[] = [
  // --------------------------------------------------------------------- Task A
  {
    caseId: "A1",
    title: "Assessment extraction keeps one draft per assessment",
    task: "task-a",
    source: SOURCE_ASSIGNMENT,
    responses: [
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_ASSIGNMENT.sourceId,
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [DRAFT_PROJECT],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, sourceResult: "RELEVANT_INFORMATION_FOUND" },
    hardChecks: ["evidence_traceable", "enums_legal", "no_product_instructions"]
  },
  {
    caseId: "A2",
    title: "Ordinary course information is not turned into an Assessment",
    task: "task-a",
    source: SOURCE_NOT_ASSESSMENT,
    responses: [
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_NOT_ASSESSMENT.sourceId,
        sourceResult: "NO_RELEVANT_INFORMATION",
        assessmentDrafts: [],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, sourceResult: "NO_RELEVANT_INFORMATION" },
    hardChecks: ["evidence_traceable", "enums_legal", "no_product_instructions"]
  },
  {
    caseId: "A3",
    title: "A Course-wide Constraint stays a candidate, not an Assessment",
    task: "task-a",
    source: SOURCE_CONSTRAINT,
    responses: [
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_CONSTRAINT.sourceId,
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [],
        courseWideConstraintCandidates: [
          {
            candidateId: "cand-1",
            content: "Late submissions accepted for 48 hours with a 10% deduction",
            evidence: [
              {
                evidenceId: "ev-c1",
                sourceId: SOURCE_CONSTRAINT.sourceId,
                locator: "notice body",
                excerpt:
                  "Late submissions across all assessments are accepted for 48 hours with a 10% deduction."
              }
            ]
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, sourceResult: "RELEVANT_INFORMATION_FOUND" },
    hardChecks: ["evidence_traceable", "enums_legal", "no_product_instructions"]
  },
  {
    caseId: "A4",
    title: "PARTIALLY_UNDERSTOOD is a real outcome with field-level uncertainty",
    task: "task-a",
    source: SOURCE_VISUAL,
    responses: [
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_VISUAL.sourceId,
        sourceResult: "PARTIALLY_UNDERSTOOD",
        assessmentDrafts: [
          {
            draftId: "draft-quiz",
            name: "Quiz 2",
            type: "quiz_test",
            role: "assessment",
            aliases: [],
            fields: [
              {
                fieldName: "weight",
                state: "UNCERTAIN",
                competingValues: ["10%", "15%"],
                evidence: [
                  {
                    evidenceId: "ev-visual-1",
                    sourceId: SOURCE_VISUAL.sourceId,
                    locator: "scanned table row 2",
                    excerpt: "Quiz 2 appears in the scanned table"
                  }
                ]
              }
            ],
            requirements: [],
            unresolvedIssues: []
          }
        ],
        courseWideConstraintCandidates: [],
        unresolvedIssues: [
          {
            issueId: "issue-1",
            issueType: "unreadable_visual",
            affectedObjectOrField: "draft-quiz.weight",
            description: "The weight column could not be read reliably from the scanned image.",
            relevantEvidence: [
              {
                evidenceId: "ev-visual-2",
                sourceId: SOURCE_VISUAL.sourceId,
                locator: "scanned table header",
                excerpt: "the weight column could not be read from the image"
              }
            ]
          }
        ]
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, sourceResult: "PARTIALLY_UNDERSTOOD" },
    hardChecks: [
      "evidence_traceable",
      "enums_legal",
      "no_product_instructions",
      "competing_values_preserved",
      "uncertain_preserved"
    ]
  },
  {
    caseId: "A5",
    title: "A response with the wrong schema is rejected",
    task: "task-a",
    source: SOURCE_ASSIGNMENT,
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        sourceId: SOURCE_ASSIGNMENT.sourceId,
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "failed", detailContains: "task_a" },
    hardChecks: []
  },
  {
    caseId: "A6",
    title: "An auto_apply instruction is never accepted",
    task: "task-a",
    source: SOURCE_ASSIGNMENT,
    responses: [
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_ASSIGNMENT.sourceId,
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [DRAFT_PROJECT],
        courseWideConstraintCandidates: [],
        unresolvedIssues: [],
        auto_apply: true
      }
    ],
    expectation: { outcome: "failed", detailContains: "forbidden_key" },
    hardChecks: ["no_product_instructions"]
  },
  {
    caseId: "A7",
    title: "Two relevant chunks are consolidated without gaining Evidence",
    task: "task-a",
    source: SOURCE_LONG,
    responses: [
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_LONG.sourceId,
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [DRAFT_LONG],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      },
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_LONG.sourceId,
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [DRAFT_LONG],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      },
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_LONG.sourceId,
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [DRAFT_LONG],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 3, sourceResult: "RELEVANT_INFORMATION_FOUND" },
    hardChecks: ["evidence_traceable", "enums_legal", "no_product_instructions"]
  },
  {
    caseId: "A8",
    title: "Consolidation may not introduce Evidence the chunks never had",
    task: "task-a",
    source: SOURCE_LONG,
    responses: [
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_LONG.sourceId,
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [DRAFT_LONG],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      },
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_LONG.sourceId,
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [DRAFT_LONG],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      },
      {
        schema: "syllab.ai.task-a/1",
        sourceId: SOURCE_LONG.sourceId,
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [
          {
            ...DRAFT_LONG,
            fields: [
              {
                fieldName: "weight",
                state: "KNOWN",
                value: "40%",
                evidence: [
                  {
                    evidenceId: "ev-invented",
                    sourceId: SOURCE_LONG.sourceId,
                    locator: "not supplied",
                    excerpt: "Synthetic text the chunk results never contained."
                  }
                ]
              }
            ]
          }
        ],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "failed", detailContains: "consolidation_evidence" },
    hardChecks: ["evidence_traceable"]
  },

  // --------------------------------------------------------------------- Task B
  {
    caseId: "B1",
    title: "Collective Evidence supports the Same Assessment",
    task: "task-b",
    drafts: [DRAFT_PROJECT, DRAFT_REPORT],
    constraintCandidates: [],
    courseIndex: [INDEX_ASSESSMENT, INDEX_QUIZ, INDEX_CONSTRAINT],
    evidence: [EVIDENCE_DRAFT, EVIDENCE_OBJECT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-project", "draft-report"],
            relationship: "SAME_ASSESSMENT",
            supportingEvidence: [EVIDENCE_DRAFT],
            contradictoryEvidence: [],
            judgmentBasis:
              "Matching weight, matching deliverable type and one shared submission requirement."
          }
        ],
        canonicalAssessmentProposals: [
          {
            proposalId: "proposal-1",
            canonicalName: "Group Project Report",
            type: "project",
            role: "assessment",
            aliases: ["Project"],
            consolidatedFields: [
              {
                fieldName: "weight",
                state: "KNOWN",
                value: "30%",
                evidence: [EVIDENCE_DRAFT]
              }
            ],
            requirements: [],
            seriesInstances: [],
            supportingEvidence: [EVIDENCE_DRAFT],
            unresolvedIssues: []
          }
        ],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, relationships: ["SAME_ASSESSMENT"] },
    hardChecks: ["evidence_traceable", "enums_legal", "index_complete", "no_product_instructions"]
  },
  {
    caseId: "B2",
    title: "Separate assessment roles stay Different",
    task: "task-b",
    drafts: [DRAFT_PROJECT, DRAFT_REPORT],
    constraintCandidates: [],
    courseIndex: [INDEX_ASSESSMENT],
    evidence: [EVIDENCE_DRAFT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-project", "draft-report"],
            relationship: "DIFFERENT_ASSESSMENT",
            supportingEvidence: [EVIDENCE_DRAFT],
            contradictoryEvidence: [],
            judgmentBasis:
              "Separate deliverables, separate submission mechanisms, no continuity wording."
          }
        ],
        canonicalAssessmentProposals: [],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, relationships: ["DIFFERENT_ASSESSMENT"] },
    hardChecks: ["evidence_traceable", "enums_legal", "index_complete", "no_product_instructions"]
  },
  {
    caseId: "B3",
    title: "Insufficient Evidence stays Uncertain",
    task: "task-b",
    drafts: [DRAFT_REPORT],
    constraintCandidates: [],
    courseIndex: [INDEX_ASSESSMENT, INDEX_QUIZ],
    evidence: [EVIDENCE_DRAFT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-report", "assessment-2"],
            relationship: "UNCERTAIN",
            supportingEvidence: [EVIDENCE_DRAFT],
            contradictoryEvidence: [],
            judgmentBasis: "One weak field agrees; nothing else is comparable."
          }
        ],
        canonicalAssessmentProposals: [],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: [
          {
            issueId: "issue-2",
            issueType: "insufficient_evidence",
            affectedObjectOrField: "draft-report",
            description: "Cannot tell whether this draft belongs to an existing object.",
            relevantEvidence: [EVIDENCE_DRAFT]
          }
        ]
      }
    ],
    expectation: {
      outcome: "succeeded",
      calls: 2,
      relationships: ["UNCERTAIN"],
      expansionRounds: 1
    },
    hardChecks: ["evidence_traceable", "enums_legal", "index_complete", "no_product_instructions"]
  },
  {
    caseId: "B4",
    title: "A meaningful part of a larger Assessment is a Component",
    task: "task-b",
    drafts: [
      DRAFT_PROJECT,
      {
        ...DRAFT_REPORT,
        draftId: "draft-component",
        role: "component",
        parentDraftId: "draft-project"
      }
    ],
    constraintCandidates: [],
    courseIndex: [INDEX_ASSESSMENT],
    evidence: [EVIDENCE_DRAFT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-project", "draft-component"],
            relationship: "SAME_ASSESSMENT",
            supportingEvidence: [EVIDENCE_DRAFT],
            contradictoryEvidence: [],
            judgmentBasis: "The write-up is one deliverable of the same project assessment."
          }
        ],
        canonicalAssessmentProposals: [
          {
            proposalId: "proposal-2",
            canonicalName: "Group Project Report",
            type: "project",
            role: "assessment",
            aliases: [],
            consolidatedFields: [],
            requirements: [],
            seriesInstances: [],
            supportingEvidence: [EVIDENCE_DRAFT],
            unresolvedIssues: []
          }
        ],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [
          {
            parentObjectId: "proposal-2",
            childObjectId: "draft-component",
            relationship: "COMPONENT"
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, relationships: ["SAME_ASSESSMENT"] },
    hardChecks: ["evidence_traceable", "enums_legal", "index_complete", "no_product_instructions"]
  },
  {
    caseId: "B5",
    title: "Repeated instances form an Assessment Series",
    task: "task-b",
    drafts: [
      { ...DRAFT_REPORT, draftId: "draft-quiz-1", name: "Quiz 1", type: "quiz_test" },
      { ...DRAFT_REPORT, draftId: "draft-quiz-2", name: "Quiz 2", type: "quiz_test" }
    ],
    constraintCandidates: [],
    courseIndex: [INDEX_QUIZ],
    evidence: [EVIDENCE_DRAFT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-quiz-1", "draft-quiz-2", "assessment-2"],
            relationship: "SAME_ASSESSMENT",
            supportingEvidence: [EVIDENCE_DRAFT],
            contradictoryEvidence: [],
            judgmentBasis: "The course treats the weekly quizzes as one coherent mechanism."
          }
        ],
        canonicalAssessmentProposals: [
          {
            proposalId: "proposal-3",
            canonicalName: "Weekly Quiz",
            type: "quiz_test",
            role: "series",
            aliases: [],
            consolidatedFields: [],
            requirements: [],
            seriesInstances: [
              { instanceId: "instance-1", name: "Quiz 1", fields: [] },
              { instanceId: "instance-2", name: "Quiz 2", fields: [] }
            ],
            supportingEvidence: [EVIDENCE_DRAFT],
            unresolvedIssues: []
          }
        ],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [
          {
            parentObjectId: "proposal-3",
            childObjectId: "instance-2",
            relationship: "SERIES_INSTANCE"
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: {
      outcome: "succeeded",
      calls: 2,
      relationships: ["SAME_ASSESSMENT"],
      expansionRounds: 1
    },
    hardChecks: ["evidence_traceable", "enums_legal", "index_complete", "no_product_instructions"]
  },
  {
    caseId: "B6",
    title: "Same identity with an unresolved field conflict keeps both values",
    task: "task-b",
    drafts: [DRAFT_PROJECT],
    constraintCandidates: [],
    courseIndex: [INDEX_ASSESSMENT],
    evidence: [EVIDENCE_DRAFT, EVIDENCE_OBJECT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-project", "assessment-1"],
            relationship: "SAME_ASSESSMENT",
            supportingEvidence: [EVIDENCE_OBJECT, EVIDENCE_DRAFT],
            contradictoryEvidence: [],
            judgmentBasis: "Explicit continuity wording plus matching deliverable and weight."
          }
        ],
        canonicalAssessmentProposals: [
          {
            proposalId: "proposal-4",
            canonicalName: "Group Project Report",
            type: "project",
            role: "assessment",
            aliases: ["Project"],
            consolidatedFields: [
              {
                fieldName: "deadline",
                state: "UNCERTAIN",
                competingValues: ["12 Oct", "19 Oct"],
                evidence: [EVIDENCE_OBJECT, EVIDENCE_DRAFT]
              }
            ],
            requirements: [],
            seriesInstances: [],
            supportingEvidence: [EVIDENCE_DRAFT],
            unresolvedIssues: [
              {
                issueId: "issue-3",
                issueType: "field_conflict",
                affectedObjectOrField: "deadline",
                description: "Two Sources give different deadlines and neither replaces the other.",
                relevantEvidence: [EVIDENCE_OBJECT, EVIDENCE_DRAFT]
              }
            ]
          }
        ],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: []
      }
    ],
    expectation: {
      outcome: "succeeded",
      calls: 2,
      relationships: ["SAME_ASSESSMENT"],
      expansionRounds: 1
    },
    hardChecks: [
      "evidence_traceable",
      "enums_legal",
      "index_complete",
      "competing_values_preserved",
      "uncertain_preserved",
      "evidence_expansion_scope",
      "no_product_instructions"
    ]
  },
  {
    caseId: "B7",
    title: "Evidence expansion supplies only the named object's original Evidence",
    task: "task-b",
    drafts: [DRAFT_PROJECT],
    constraintCandidates: [],
    courseIndex: [INDEX_ASSESSMENT, INDEX_QUIZ],
    evidence: [EVIDENCE_DRAFT, EVIDENCE_OBJECT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-project", "assessment-1"],
            relationship: "UNCERTAIN",
            supportingEvidence: [EVIDENCE_DRAFT],
            contradictoryEvidence: [],
            judgmentBasis:
              "The canonical object's own Evidence is needed before judging continuity."
          }
        ],
        canonicalAssessmentProposals: [],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: []
      },
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-project", "assessment-1"],
            relationship: "SAME_ASSESSMENT",
            supportingEvidence: [EVIDENCE_OBJECT, EVIDENCE_DRAFT],
            contradictoryEvidence: [],
            judgmentBasis: "The earlier notice describes the same project role and continuity."
          }
        ],
        canonicalAssessmentProposals: [],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: []
      }
    ],
    expectation: {
      outcome: "succeeded",
      calls: 2,
      relationships: ["SAME_ASSESSMENT"],
      expansionRounds: 1
    },
    hardChecks: [
      "evidence_traceable",
      "enums_legal",
      "index_complete",
      "evidence_expansion_scope",
      "no_product_instructions"
    ]
  },
  {
    caseId: "B8",
    title: "An unknown object id fails the unit",
    task: "task-b",
    drafts: [DRAFT_PROJECT],
    constraintCandidates: [],
    courseIndex: [INDEX_ASSESSMENT],
    evidence: [EVIDENCE_DRAFT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-project", "assessment-does-not-exist"],
            relationship: "SAME_ASSESSMENT",
            supportingEvidence: [EVIDENCE_DRAFT],
            contradictoryEvidence: [],
            judgmentBasis: "Merged with an object that was never supplied."
          }
        ],
        canonicalAssessmentProposals: [],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "failed", detailContains: "unknown_object_id" },
    hardChecks: ["enums_legal"]
  },
  {
    caseId: "B9",
    title: "Evidence that was never supplied fails the unit",
    task: "task-b",
    drafts: [DRAFT_PROJECT],
    constraintCandidates: [],
    courseIndex: [INDEX_ASSESSMENT],
    evidence: [EVIDENCE_DRAFT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-project"],
            relationship: "SAME_ASSESSMENT",
            supportingEvidence: [
              {
                evidenceId: "ev-invented",
                sourceId: SOURCE_ASSIGNMENT.sourceId,
                locator: "not supplied",
                excerpt: "Synthetic text that was never part of any supplied Evidence."
              }
            ],
            contradictoryEvidence: [],
            judgmentBasis: "Merged on Evidence the call never received."
          }
        ],
        canonicalAssessmentProposals: [],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "failed", detailContains: "evidence_not_supplied" },
    hardChecks: ["enums_legal"]
  },
  {
    caseId: "B10",
    title: "A Same Assessment judgment with no Evidence fails the unit",
    task: "task-b",
    drafts: [DRAFT_PROJECT, DRAFT_REPORT],
    constraintCandidates: [],
    courseIndex: [INDEX_ASSESSMENT],
    evidence: [EVIDENCE_DRAFT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [
          {
            involvedObjectIds: ["draft-project", "draft-report"],
            relationship: "SAME_ASSESSMENT",
            supportingEvidence: [],
            contradictoryEvidence: [],
            judgmentBasis: "Index summaries looked similar."
          }
        ],
        canonicalAssessmentProposals: [],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "failed", detailContains: "same_assessment_without_evidence" },
    hardChecks: ["enums_legal"]
  },
  {
    caseId: "B11",
    title: "Auto-merge and confidence instructions are never accepted",
    task: "task-b",
    drafts: [DRAFT_PROJECT],
    constraintCandidates: [],
    courseIndex: [INDEX_ASSESSMENT],
    evidence: [EVIDENCE_DRAFT],
    responses: [
      {
        schema: "syllab.ai.task-b/1",
        identityResolutions: [],
        canonicalAssessmentProposals: [],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: [],
        auto_merge: true,
        confidence: 0.92
      }
    ],
    expectation: { outcome: "failed", detailContains: "forbidden_key" },
    hardChecks: ["no_product_instructions"]
  },

  // --------------------------------------------------------------------- Task C
  {
    caseId: "C1",
    title: "Reworded text with the same facts is no meaningful change",
    task: "task-c",
    target: INDEX_ASSESSMENT,
    currentFacts: [{ field: "weight", state: "KNOWN", value: "30%" }],
    currentEvidence: [EVIDENCE_OBJECT],
    newEvidence: [EVIDENCE_DRAFT],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: [] },
    coverageFacts: { checked: 1, succeeded: 1, failed: 0, partialCoverage: false },
    coverageSufficient: true,
    responses: [
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "NO_MEANINGFUL_CHANGE",
            targetObjectId: INDEX_ASSESSMENT.objectId,
            judgmentBasis: "The wording changed; weight and deadline are unchanged.",
            currentValue: { state: "KNOWN", value: "30%" },
            proposedOrCompetingValue: { state: "KNOWN", value: "30%" },
            currentEvidence: [EVIDENCE_OBJECT],
            newEvidence: [EVIDENCE_DRAFT]
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, changeTypes: ["NO_MEANINGFUL_CHANGE"] },
    hardChecks: ["evidence_traceable", "enums_legal", "no_product_instructions"]
  },
  {
    caseId: "C2",
    title: "A genuinely new assessment is NEW",
    task: "task-c",
    target: INDEX_ASSESSMENT,
    currentFacts: [{ field: "weight", state: "KNOWN", value: "30%" }],
    currentEvidence: [EVIDENCE_OBJECT],
    newEvidence: [EVIDENCE_DRAFT],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: [] },
    coverageFacts: { checked: 1, succeeded: 1, failed: 0, partialCoverage: false },
    coverageSufficient: true,
    responses: [
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "NEW",
            targetObjectId: INDEX_ASSESSMENT.objectId,
            judgmentBasis: "A new graded in-class activity is introduced next to the project.",
            proposedOrCompetingValue: { state: "KNOWN", value: "In-class activity" },
            currentEvidence: [],
            newEvidence: [EVIDENCE_DRAFT]
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, changeTypes: ["NEW"] },
    hardChecks: ["evidence_traceable", "enums_legal", "no_product_instructions"]
  },
  {
    caseId: "C3",
    title: "Replacement evidence makes a value CHANGED",
    task: "task-c",
    target: INDEX_ASSESSMENT,
    currentFacts: [{ field: "deadline", state: "KNOWN", value: "12 Oct" }],
    currentEvidence: [EVIDENCE_OBJECT],
    newEvidence: [EVIDENCE_DRAFT],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: [] },
    coverageFacts: { checked: 1, succeeded: 1, failed: 0, partialCoverage: false },
    coverageSufficient: true,
    responses: [
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "CHANGED",
            targetObjectId: INDEX_ASSESSMENT.objectId,
            affectedFieldOrRequirement: "deadline",
            judgmentBasis:
              "The new notice states the deadline was moved and replaces the earlier one.",
            currentValue: { state: "KNOWN", value: "12 Oct" },
            proposedOrCompetingValue: { state: "KNOWN", value: "19 Oct" },
            currentEvidence: [EVIDENCE_OBJECT],
            newEvidence: [EVIDENCE_DRAFT]
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, changeTypes: ["CHANGED"] },
    hardChecks: ["evidence_traceable", "enums_legal", "no_product_instructions"]
  },
  {
    caseId: "C4",
    title: "Competing values without replacement stay CONFLICT",
    task: "task-c",
    target: INDEX_ASSESSMENT,
    currentFacts: [{ field: "deadline", state: "KNOWN", value: "12 Oct" }],
    currentEvidence: [EVIDENCE_OBJECT],
    newEvidence: [EVIDENCE_DRAFT],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: [] },
    coverageFacts: { checked: 1, succeeded: 1, failed: 0, partialCoverage: false },
    coverageSufficient: true,
    responses: [
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "CONFLICT",
            targetObjectId: INDEX_ASSESSMENT.objectId,
            affectedFieldOrRequirement: "deadline",
            judgmentBasis:
              "Two values disagree and nothing establishes which one replaced the other.",
            currentValue: { state: "KNOWN", value: "12 Oct" },
            proposedOrCompetingValue: {
              state: "UNCERTAIN",
              competingValues: ["12 Oct", "19 Oct"]
            },
            currentEvidence: [EVIDENCE_OBJECT],
            newEvidence: [EVIDENCE_DRAFT]
          }
        ],
        unresolvedIssues: [
          {
            issueId: "issue-4",
            issueType: "field_conflict",
            affectedObjectOrField: "deadline",
            description: "Both deadlines remain possible.",
            relevantEvidence: [EVIDENCE_OBJECT, EVIDENCE_DRAFT]
          }
        ]
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, changeTypes: ["CONFLICT"] },
    hardChecks: [
      "evidence_traceable",
      "enums_legal",
      "competing_values_preserved",
      "uncertain_preserved",
      "no_product_instructions"
    ]
  },
  {
    caseId: "C5",
    title: "Removal may be proposed only on semantically sufficient coverage",
    task: "task-c",
    target: INDEX_ASSESSMENT,
    currentFacts: [{ field: "weight", state: "KNOWN", value: "30%" }],
    currentEvidence: [EVIDENCE_OBJECT],
    newEvidence: [],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: [] },
    coverageFacts: { checked: 4, succeeded: 4, failed: 0, partialCoverage: false },
    coverageSufficient: true,
    responses: [
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "POSSIBLY_REMOVED",
            targetObjectId: INDEX_ASSESSMENT.objectId,
            judgmentBasis:
              "Every relevant Source was checked successfully and the object is gone from all of them, with no rename or restructure.",
            currentEvidence: [EVIDENCE_OBJECT],
            newEvidence: [],
            relevantCoverageFacts: { checked: 4, succeeded: 4, failed: 0, partialCoverage: false }
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, changeTypes: ["POSSIBLY_REMOVED"] },
    hardChecks: [
      "evidence_traceable",
      "enums_legal",
      "removal_requires_coverage",
      "no_product_instructions"
    ]
  },
  {
    caseId: "C6",
    title: "A removal proposal on insufficient coverage is rejected",
    task: "task-c",
    target: INDEX_ASSESSMENT,
    currentFacts: [{ field: "weight", state: "KNOWN", value: "30%" }],
    currentEvidence: [EVIDENCE_OBJECT],
    newEvidence: [],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: [] },
    coverageFacts: { checked: 4, succeeded: 3, failed: 1, partialCoverage: true },
    coverageSufficient: false,
    responses: [
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "POSSIBLY_REMOVED",
            targetObjectId: INDEX_ASSESSMENT.objectId,
            judgmentBasis:
              "One Source could not be fetched, but the item is missing from the rest.",
            currentEvidence: [EVIDENCE_OBJECT],
            newEvidence: [],
            relevantCoverageFacts: { checked: 4, succeeded: 3, failed: 1, partialCoverage: true }
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "failed", detailContains: "removal_without_coverage" },
    hardChecks: ["enums_legal", "removal_requires_coverage", "no_product_instructions"]
  },
  {
    caseId: "C7",
    title: "A material identity contradiction returns IDENTITY_UNCERTAIN",
    task: "task-c",
    target: INDEX_ASSESSMENT,
    currentFacts: [{ field: "weight", state: "KNOWN", value: "30%" }],
    currentEvidence: [EVIDENCE_OBJECT],
    newEvidence: [EVIDENCE_DRAFT],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: [] },
    coverageFacts: { checked: 1, succeeded: 1, failed: 0, partialCoverage: false },
    coverageSufficient: true,
    responses: [
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "IDENTITY_UNCERTAIN",
            targetObjectId: INDEX_ASSESSMENT.objectId,
            judgmentBasis:
              "The new Evidence places this deliverable in a different course structure, contradicting the established identity.",
            currentEvidence: [EVIDENCE_OBJECT],
            newEvidence: [EVIDENCE_DRAFT]
          }
        ],
        unresolvedIssues: [
          {
            issueId: "issue-5",
            issueType: "identity_contradiction",
            affectedObjectOrField: INDEX_ASSESSMENT.objectId,
            description: "The identity relation must be decided by the user.",
            relevantEvidence: [EVIDENCE_OBJECT, EVIDENCE_DRAFT]
          }
        ]
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, changeTypes: ["IDENTITY_UNCERTAIN"] },
    hardChecks: ["evidence_traceable", "enums_legal", "no_product_instructions"]
  },
  {
    caseId: "C8",
    title: "An unknown target object fails the unit",
    task: "task-c",
    target: INDEX_ASSESSMENT,
    currentFacts: [],
    currentEvidence: [EVIDENCE_OBJECT],
    newEvidence: [EVIDENCE_DRAFT],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: [] },
    coverageFacts: { checked: 1, succeeded: 1, failed: 0, partialCoverage: false },
    coverageSufficient: true,
    responses: [
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "CHANGED",
            targetObjectId: "assessment-not-supplied",
            currentEvidence: [EVIDENCE_OBJECT],
            newEvidence: [EVIDENCE_DRAFT],
            judgmentBasis: "Changed an object this call never received."
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "failed", detailContains: "unknown_object_id" },
    hardChecks: ["enums_legal"]
  },
  {
    caseId: "C9",
    title: "Evidence this call never received fails the unit",
    task: "task-c",
    target: INDEX_ASSESSMENT,
    currentFacts: [],
    currentEvidence: [EVIDENCE_OBJECT],
    newEvidence: [EVIDENCE_DRAFT],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: [] },
    coverageFacts: { checked: 1, succeeded: 1, failed: 0, partialCoverage: false },
    coverageSufficient: true,
    responses: [
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "CHANGED",
            targetObjectId: INDEX_ASSESSMENT.objectId,
            currentEvidence: [
              {
                evidenceId: "ev-invented",
                sourceId: SOURCE_ASSIGNMENT.sourceId,
                locator: "not supplied",
                excerpt: "Synthetic text that was never supplied to this call."
              }
            ],
            newEvidence: [],
            judgmentBasis: "Judged on Evidence that was never supplied."
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "failed", detailContains: "evidence_not_supplied" },
    hardChecks: ["enums_legal"]
  },
  {
    caseId: "C10",
    title: "A user-edited value is analysed, never silently replaced",
    task: "task-c",
    target: INDEX_ASSESSMENT,
    currentFacts: [{ field: "deadline", state: "KNOWN", value: "12 Oct", userEdited: true }],
    currentEvidence: [EVIDENCE_OBJECT],
    newEvidence: [EVIDENCE_DRAFT],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: ["Edited"], previousDecision: "KeepCurrent" },
    coverageFacts: { checked: 1, succeeded: 1, failed: 0, partialCoverage: false },
    coverageSufficient: true,
    responses: [
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "CONFLICT",
            targetObjectId: INDEX_ASSESSMENT.objectId,
            affectedFieldOrRequirement: "deadline",
            judgmentBasis:
              "The user-edited value and the new value disagree; no replacement is established.",
            currentValue: { state: "KNOWN", value: "12 Oct" },
            proposedOrCompetingValue: { state: "KNOWN", value: "19 Oct" },
            currentEvidence: [EVIDENCE_OBJECT],
            newEvidence: [EVIDENCE_DRAFT],
            relevantUserState: "Edited"
          }
        ],
        unresolvedIssues: []
      }
    ],
    expectation: { outcome: "succeeded", calls: 1, changeTypes: ["CONFLICT"] },
    hardChecks: ["evidence_traceable", "enums_legal", "no_product_instructions"]
  }
];

export function fixtureById(caseId: string): AiFixture {
  const fixture = AI_FIXTURES.find((entry) => entry.caseId === caseId);
  if (!fixture) throw new Error(`FIXTURE_NOT_FOUND:${caseId}`);
  return fixture;
}

function knowledgeState(value: unknown): KnowledgeState {
  return value === "KNOWN" || value === "EXPLICITLY_UNKNOWN" || value === "UNCERTAIN"
    ? value
    : "UNCERTAIN";
}

function scalar(value: unknown): FactValue["value"] | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  return undefined;
}

function competingValues(value: unknown): FactValue["competingValues"] {
  if (!Array.isArray(value)) return undefined;
  const values = value
    .map((item) => scalar(item))
    .filter((item): item is NonNullable<FactValue["value"]> => item !== undefined);
  return values.length > 0 ? values : undefined;
}

/**
 * Projects one recorded Task C change result onto the pending-change shape the reducers consume.
 * Values are read from the recorded response itself, so a collapsed competing value would show up
 * in the reducer inputs instead of being hidden by the validator's envelope.
 */
export function changeRecordFromFixture(
  fixture: TaskCFixture,
  index: number,
  overwrite: { latestValue?: FactValue } = {}
): ChangeRecord {
  const response: unknown = fixture.responses[0];
  if (!isRecord(response) || !Array.isArray(response.changeResults)) {
    throw new Error("FIXTURE_RESPONSE_SHAPE");
  }
  const change: unknown = response.changeResults[index];
  if (!isRecord(change)) throw new Error("FIXTURE_CHANGE_MISSING");
  const current = isRecord(change.currentValue) ? change.currentValue : undefined;
  const proposed = isRecord(change.proposedOrCompetingValue)
    ? change.proposedOrCompetingValue
    : undefined;
  const latest =
    overwrite.latestValue ?? (proposed === undefined ? undefined : factValue(proposed));
  const currentValue = current === undefined ? undefined : factValue(current);
  const competing = proposed === undefined ? undefined : competingValues(proposed.competingValues);
  return {
    changeId: `change-${fixture.caseId}-${String(index)}`,
    courseId: "course-1",
    workflowId: "workflow-1",
    targetId: typeof change.targetObjectId === "string" ? change.targetObjectId : "assessment-1",
    ...(typeof change.affectedFieldOrRequirement === "string"
      ? { field: change.affectedFieldOrRequirement }
      : {}),
    changeType:
      typeof change.changeType === "string"
        ? (change.changeType as ChangeRecord["changeType"])
        : "NO_MEANINGFUL_CHANGE",
    ...(currentValue === undefined ? {} : { currentValue }),
    ...(latest === undefined ? {} : { latestValue: latest }),
    currentEvidenceIds: evidenceIdsOf(change.currentEvidence),
    newEvidenceIds: evidenceIdsOf(change.newEvidence),
    ...(competing === undefined
      ? {}
      : { competingValues: competing.map((value) => ({ state: "KNOWN" as const, value })) }),
    ...(typeof change.judgmentBasis === "string" ? { judgmentBasis: change.judgmentBasis } : {}),
    createdAt: "2026-09-19T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z"
  };
}

function factValue(value: Record<string, unknown>): FactValue {
  const single = scalar(value.value);
  const competing = competingValues(value.competingValues);
  return {
    state: knowledgeState(value.state),
    ...(single === undefined ? {} : { value: single }),
    ...(competing === undefined ? {} : { competingValues: competing })
  };
}

function evidenceIdsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      isRecord(item) && typeof item.evidenceId === "string" ? item.evidenceId : undefined
    )
    .filter((item): item is string => item !== undefined);
}
