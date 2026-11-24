import { operativeSemantics } from "./fact-semantics";
import { stableStringify } from "./crypto";
import type { CourseSnapshot } from "./course-state";
import type { StagedCourseState } from "./staging";
import type { ChangeRecord, FactRecord, ReviewItemRecord } from "./schema";

const meaning = (fact: FactRecord) => ({
  value: fact.value,
  field: fact.field,
  semantics: fact.product
    ? {
        predicate: fact.product.predicate,
        unit: fact.product.unit,
        ...operativeSemantics(fact),
        disposition: fact.product.disposition,
        relation: fact.product.relation,
        parentRef: fact.product.parentRef
      }
    : operativeSemantics(fact)
});
/** Adopting structure never approves pending clauses or replaces a saved user value. */
export function prepareProductRebuild(
  snapshot: CourseSnapshot,
  staged: StagedCourseState,
  now: string
) {
  const facts = structuredClone(staged.facts);
  const assessments = structuredClone(staged.assessments),
    constraints = structuredClone(staged.constraints);
  const protectedIDs = new Set<string>(),
    changes: ChangeRecord[] = [];
  const protectOwner = (fact: FactRecord) => {
    if (
      fact.assessmentId &&
      assessments.some(
        (a) => a.assessmentId === fact.assessmentId && a.productDisposition === "REFERENCE"
      )
    ) {
      const old = snapshot.assessments.find((a) => a.assessmentId === fact.assessmentId);
      if (old)
        assessments.splice(
          assessments.findIndex((a) => a.assessmentId === fact.assessmentId),
          1,
          structuredClone(old)
        );
    }
    if (
      fact.constraintId &&
      constraints.some(
        (c) => c.constraintId === fact.constraintId && c.productDisposition === "REFERENCE"
      )
    ) {
      const old = snapshot.constraints.find((c) => c.constraintId === fact.constraintId);
      if (old)
        constraints.splice(
          constraints.findIndex((c) => c.constraintId === fact.constraintId),
          1,
          structuredClone(old)
        );
    }
    if (fact.assessmentId && !assessments.some((a) => a.assessmentId === fact.assessmentId)) {
      const owner = snapshot.assessments.find((a) => a.assessmentId === fact.assessmentId);
      if (owner) assessments.push(structuredClone(owner));
    }
    if (fact.constraintId && !constraints.some((c) => c.constraintId === fact.constraintId)) {
      const owner = snapshot.constraints.find((c) => c.constraintId === fact.constraintId);
      if (owner) constraints.push(structuredClone(owner));
    }
  };
  const extraReviews: ReviewItemRecord[] = [];
  for (const current of snapshot.facts.filter((f) => f.userEdited)) {
    const exact = facts.find((f) => f.factId === current.factId);
    const alternatives = facts.filter(
      (f) =>
        (f.assessmentId ?? f.constraintId) === (current.assessmentId ?? current.constraintId) &&
        f.field === current.field &&
        current.semanticClause?.clauseId &&
        f.semanticClause?.clauseId === current.semanticClause.clauseId
    );
    const latest = exact ?? (alternatives.length === 1 ? alternatives[0] : undefined);
    protectOwner(current);
    if (latest) {
      const index = facts.indexOf(latest);
      facts[index] = structuredClone(current);
      protectedIDs.add(latest.factId);
      if (stableStringify(meaning(current)) !== stableStringify(meaning(latest))) {
        const targetId = current.assessmentId ?? current.constraintId;
        if (!targetId) throw Error("REBUILD_USER_VALUE_OWNER_MISSING");
        const changeId = `rebuild-user:${staged.workflowId}:${current.factId}`;
        changes.push({
          changeId,
          courseId: current.courseId,
          workflowId: staged.workflowId,
          targetId,
          field: current.factId,
          changeType: "CONFLICT",
          currentValue: current.value,
          latestValue: latest.value,
          proposedFact: latest,
          currentEvidenceIds: current.evidenceRefs.flatMap((e) =>
            e.evidenceId ? [e.evidenceId] : []
          ),
          newEvidenceIds: latest.evidenceRefs.flatMap((e) => (e.evidenceId ? [e.evidenceId] : [])),
          judgmentBasis:
            "A rebuilt proposal differs from a saved user-edited value or its operative conditions. Human choice is required.",
          relevantUserState: "userEdited",
          createdAt: now,
          updatedAt: now
        });
        extraReviews.push({
          reviewItemId: changeId,
          courseId: current.courseId,
          workflowId: staged.workflowId,
          targetId,
          kind: "change",
          changeType: "CONFLICT",
          payload: {
            changeId,
            unresolvedQuestions: [
              "Your saved value remains in force until you choose how to resolve this rebuilt proposal."
            ]
          },
          createdAt: now,
          updatedAt: now
        });
      }
    } else {
      facts.push(structuredClone(current));
      const targetId = current.assessmentId ?? current.constraintId;
      if (!targetId) throw Error("REBUILD_USER_VALUE_OWNER_MISSING");
      extraReviews.push({
        reviewItemId: `rebuild-saved:${staged.workflowId}:${current.factId}`,
        courseId: current.courseId,
        workflowId: staged.workflowId,
        targetId,
        kind: "initial",
        payload: {
          productScope: true,
          ownerScope: false,
          scopeTitle: "Saved requirement without a matching rebuilt proposal",
          scopeFactIds: [current.factId],
          scopeVersions: [{ factId: current.factId, updatedAt: current.updatedAt }],
          scopeBasis:
            "This is your saved requirement. The rebuilt candidate has no matching requirement; keep or exclude it explicitly.",
          unresolvedQuestions: [
            "The rebuilt candidate does not account for this saved user requirement."
          ]
        },
        createdAt: now,
        updatedAt: now
      });
    }
  }
  const reviews = staged.reviewItems.map((item) => {
    if (!Array.isArray(item.payload.scopeFactIds)) return structuredClone(item);
    const ids = item.payload.scopeFactIds.filter(
      (id): id is string => typeof id === "string" && !protectedIDs.has(id)
    );
    return {
      ...structuredClone(item),
      payload: {
        ...item.payload,
        scopeFactIds: ids,
        scopeVersions: ids.flatMap((id) => {
          const f = facts.find((f) => f.factId === id);
          return f
            ? [{ factId: id, updatedAt: f.updatedAt, sourceVersions: f.product?.sourceVersions }]
            : [];
        })
      }
    };
  });
  return { facts, assessments, constraints, reviewItems: [...reviews, ...extraReviews], changes };
}
