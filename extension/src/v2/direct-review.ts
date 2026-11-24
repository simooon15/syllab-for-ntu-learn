import { requirePresent } from "./errors";
/** Mechanical projection into the existing Review frame. No semantic judgment or adoption. */
import { isRecord } from "@syllab/contracts";
import type { EvidenceRecord, ReviewItemRecord } from "./schema";
import type { materializeDirectCourse } from "./direct-course";
type Candidate = Omit<ReturnType<typeof materializeDirectCourse>, "identities"> & {
  identities: Array<{ involvedObjectIds: string[]; relationship: string; judgmentBasis: string }>;
  scopedReview?: boolean;
  readingSummary?: string[];
};
function questions(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((issue) =>
        isRecord(issue) && typeof issue.description === "string" ? [issue.description] : []
      )
    : [];
}
export function directReviewItems(
  candidate: Candidate,
  courseId: string,
  workflowId: string,
  now: string,
  sourceTitles: Map<string, string> = new Map()
): ReviewItemRecord[] {
  if (candidate.bundle.facts?.some((f) => f.product)) {
    const items: ReviewItemRecord[] = [];
    for (const owner of [...candidate.assessments, ...candidate.constraints]) {
      if (owner.productDisposition === "REFERENCE") continue;
      const id = "assessmentId" in owner ? owner.assessmentId : owner.constraintId;
      const name = "name" in owner ? owner.name : "Course rules";
      const facts = (candidate.bundle.facts ?? []).filter(
        (f) =>
          (f.assessmentId === id || f.constraintId === id) &&
          f.product &&
          !["REFERENCE", "BACKGROUND"].includes(f.product.disposition)
      );
      const groups = new Map<string, typeof facts>();
      const base = facts.filter(
        (f) => !f.product?.independentReview && f.product?.disposition !== "ISSUE"
      );
      if ("assessmentId" in owner) groups.set("Assessment", base);
      else if (base.length) groups.set("Key rules", base);
      for (const f of facts.filter(
        (f) => f.product?.independentReview || f.product?.disposition === "ISSUE"
      )) {
        const key = requirePresent(f.product).group;
        groups.set(key, [...(groups.get(key) ?? []), f]);
      }
      if (!groups.size) groups.set("Identity / applicability", []);
      for (const [group, scope] of groups) {
        items.push({
          reviewItemId: `initial_${id}_${group}`,
          courseId,
          workflowId,
          kind: "initial",
          targetId: id,
          payload: {
            productScope: true,
            ownerScope: group === "Assessment",
            scopeGroup: group,
            scopeTitle: group === "Assessment" ? name : `${name} · ${group}`,
            scopeFactIds: scope.map((f) => f.factId),
            scopeVersions: scope.map((f) => ({
              factId: f.factId,
              updatedAt: f.updatedAt,
              sourceVersions: f.product?.sourceVersions
            })),
            scopeBasis: "dispositionBasis" in owner ? owner.dispositionBasis : "",
            unresolvedQuestions: scope
              .filter((f) => f.value.state === "UNCERTAIN")
              .map((f) => requirePresent(f.product).title),
            ...(owner.productDisposition === "ISSUE" ? { identityUncertain: true } : {})
          },
          createdAt: now,
          updatedAt: now
        });
      }
    }
    return items;
  }
  const global = [
    ...questions(candidate.unresolvedIssues),
    ...(candidate.scopedReview
      ? (candidate.readingSummary ?? [])
      : candidate.coverage.flatMap((c) =>
          c.limitations.map((l) => `${sourceTitles.get(c.sourceId) ?? "Source"}: ${l}`)
        )),
    ...(candidate.scopedReview
      ? []
      : candidate.identities
          .filter((r) => r.relationship === "UNCERTAIN")
          .map((r) => r.judgmentBasis))
  ];
  const issues = [
    ...candidate.unresolvedIssues,
    ...candidate.objectIssues.flatMap((o) => o.unresolvedIssues),
    ...candidate.constraintIssues.flatMap((o) => o.unresolvedIssues)
  ];
  const issueEvidence: EvidenceRecord[] = issues.flatMap((issue, i) => {
    if (!isRecord(issue) || !Array.isArray(issue.evidence)) return [];
    return issue.evidence.flatMap((ref, j) => {
      if (
        !isRecord(ref) ||
        typeof ref.sourceId !== "string" ||
        typeof ref.locator !== "string" ||
        typeof ref.excerpt !== "string"
      )
        return [];
      return [
        {
          evidenceId: `issue_${workflowId}_${String(i)}_${String(j)}`,
          courseId,
          sourceId: ref.sourceId,
          locator: ref.locator,
          excerpt: ref.excerpt,
          origin: "native" as const,
          capturedAt: now
        }
      ];
    });
  });
  return [
    ...candidate.assessments.map((a) => ({
      id: a.assessmentId,
      issues: [
        ...questions(
          candidate.objectIssues.find((o) => o.objectId === a.assessmentId)?.unresolvedIssues
        ),
        ...candidate.identities
          .filter(
            (i) => i.relationship === "UNCERTAIN" && i.involvedObjectIds.includes(a.assessmentId)
          )
          .map((i) => i.judgmentBasis)
      ]
    })),
    ...candidate.constraints.map((c) => ({
      id: c.constraintId,
      issues: questions(
        candidate.constraintIssues.find((o) => o.objectId === c.constraintId)?.unresolvedIssues
      )
    }))
  ].map((o, index) => {
    const relevantSources = new Set(
      candidate.bundle.facts
        ?.filter((f) => f.assessmentId === o.id || f.constraintId === o.id)
        .flatMap((f) => f.evidenceRefs.map((e) => e.sourceId))
    );
    const ownLimits = candidate.scopedReview
      ? candidate.coverage
          .filter((c) => relevantSources.has(c.sourceId))
          .flatMap((c) =>
            c.limitations.map((l) => `${sourceTitles.get(c.sourceId) ?? "Source"}: ${l}`)
          )
      : [];
    const evidence =
      candidate.scopedReview && index > 0
        ? issueEvidence.filter((e) => relevantSources.has(e.sourceId))
        : issueEvidence;
    return {
      reviewItemId: `initial_${o.id}`,
      courseId,
      workflowId,
      kind: "initial",
      targetId: o.id,
      payload: {
        unresolvedQuestions: [
          ...new Set([
            ...o.issues,
            ...ownLimits,
            ...(candidate.scopedReview && index > 0 ? [] : global)
          ])
        ],
        evidence,
        issueEvidenceIds: evidence.map((e) => e.evidenceId)
      },
      createdAt: now,
      updatedAt: now
    };
  });
}
