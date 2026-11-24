import { isRecord } from "@syllab/contracts";
import type { CourseDraft } from "./selective-course";

/** Durable source interpretation, explicitly untrusted and separate from Human decisions. */
export interface CourseDraftArchive {
  policy: "course-draft-archive/1";
  status: "UNTRUSTED_CANDIDATE";
  workflowId: string;
  capturedAt: string;
  draft: CourseDraft;
}
export function archiveCourseDraft(
  draft: CourseDraft,
  workflowId: string,
  capturedAt: string
): CourseDraftArchive {
  const archived = structuredClone(draft);
  // A restored archive conserves observations, never an execution certificate.
  delete archived.productVerification;
  delete archived.projectionVerification;
  delete archived.projectionContextVerification;
  return {
    policy: "course-draft-archive/1",
    status: "UNTRUSTED_CANDIDATE",
    workflowId,
    capturedAt,
    draft: archived
  };
}

/** Validate archival shape, never adjudicate the semantic truth of saved observations. */
export function isCourseDraftArchive(value: unknown): value is CourseDraftArchive {
  if (
    !isRecord(value) ||
    value.policy !== "course-draft-archive/1" ||
    value.status !== "UNTRUSTED_CANDIDATE" ||
    typeof value.workflowId !== "string" ||
    typeof value.capturedAt !== "string" ||
    !isRecord(value.draft)
  )
    return false;
  const draft = value.draft;
  if (
    draft.schema !== "syllab.ai.course-draft/1" ||
    draft.productVerification !== undefined ||
    draft.projectionVerification !== undefined ||
    draft.projectionContextVerification !== undefined ||
    !Array.isArray(draft.clauses) ||
    !Array.isArray(draft.links) ||
    !Array.isArray(draft.entities) ||
    !Array.isArray(draft.identities) ||
    !Array.isArray(draft.inspections) ||
    !isRecord(draft.deepLocators) ||
    (draft.retiredClauses !== undefined && !Array.isArray(draft.retiredClauses))
  )
    return false;
  return [
    ...(draft.clauses as unknown[]),
    ...(Array.isArray(draft.retiredClauses) ? (draft.retiredClauses as unknown[]) : [])
  ].every(
    (c) =>
      isRecord(c) &&
      typeof c.clauseId === "string" &&
      typeof c.sourceId === "string" &&
      typeof c.content === "string" &&
      typeof c.modality === "string" &&
      Array.isArray(c.conditions) &&
      c.conditions.every((x) => typeof x === "string") &&
      Array.isArray(c.exceptions) &&
      c.exceptions.every((x) => typeof x === "string") &&
      isRecord(c.value) &&
      Array.isArray(c.evidence) &&
      c.evidence.every(
        (e) =>
          isRecord(e) &&
          typeof e.evidenceId === "string" &&
          typeof e.sourceId === "string" &&
          typeof e.locator === "string" &&
          typeof e.excerpt === "string"
      )
  );
}
