import type { CandidateKind, EvidenceReference } from "@syllab/contracts";

import type { ReviewCandidate } from "../review/domain";
import type { BriefFieldState, BriefItem } from "./domain";

function normalizedAssessmentKey(value: string): string {
  return value
    .replace(/^assessment:/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveParentId(
  requestedKey: string | undefined,
  parentIds: ReadonlyMap<string, string>
): string | undefined {
  if (!requestedKey) return undefined;
  const exact = parentIds.get(requestedKey);
  if (exact) return exact;
  const requested = normalizedAssessmentKey(requestedKey);
  if (!requested) return undefined;
  const aliases = [...parentIds.entries()].filter(([key]) => {
    const available = normalizedAssessmentKey(key);
    return (
      available === requested || available.includes(requested) || requested.includes(available)
    );
  });
  return aliases.length === 1 ? aliases[0]?.[1] : undefined;
}

export function briefItemsFromReview(
  courseId: string,
  candidates: readonly ReviewCandidate[],
  unresolvedFields: Readonly<Record<string, Record<string, unknown[]>>> = {},
  now = new Date(),
  existingItems: readonly BriefItem[] = []
): BriefItem[] {
  const confirmed = candidates.filter(
    (candidate) => candidate.status === "Confirmed" || candidate.status === "EditedConfirmed"
  );
  const createItem = (candidate: ReviewCandidate, parentBriefItemId?: string): BriefItem => {
    const unresolved = unresolvedFields[candidate.candidateId] ?? candidate.unresolvedFields ?? {};
    const currentValue = Object.fromEntries(
      Object.entries(structuredClone(candidate.confirmedValue ?? candidate.proposedValue)).filter(
        ([field]) => !(field in unresolved)
      )
    );
    const fieldStates: Record<string, BriefFieldState> = {};
    for (const [field, values] of Object.entries(unresolved)) {
      fieldStates[field] = {
        status: "Unresolved",
        candidateValues: structuredClone(values),
        evidenceRefs: structuredClone(candidate.evidenceRefs)
      };
    }
    return {
      briefItemId: `candidate:${candidate.candidateId}`,
      courseId,
      kind: candidate.kind,
      ...(candidate.scope ? { scope: candidate.scope } : {}),
      ...(parentBriefItemId ? { parentBriefItemId } : {}),
      origin: "candidate",
      status: candidate.status as "Confirmed" | "EditedConfirmed",
      currentValue,
      fieldStates,
      sourceCandidateRefs: [candidate.candidateId],
      evidenceRefs: structuredClone(candidate.evidenceRefs),
      semanticKey: candidate.semanticKey,
      ...(candidate.appliesToAssessmentKey
        ? { parentSemanticKey: candidate.appliesToAssessmentKey }
        : {}),
      updatedAt: now.toISOString()
    };
  };

  const items: BriefItem[] = [];
  const parentIds = new Map<string, string>();
  for (const item of existingItems) {
    if (item.courseId === courseId && item.kind === "assessment" && item.semanticKey) {
      parentIds.set(item.semanticKey, item.briefItemId);
    }
  }
  for (const candidate of confirmed.filter((item) => item.kind === "assessment")) {
    const item = createItem(candidate);
    items.push(item);
    parentIds.set(candidate.semanticKey, item.briefItemId);
  }
  for (const candidate of confirmed.filter((item) => item.kind !== "assessment")) {
    if (candidate.scope === "assessment") {
      const parentId = resolveParentId(candidate.appliesToAssessmentKey, parentIds);
      if (!parentId) continue;
      items.push(createItem(candidate, parentId));
      continue;
    }
    items.push(createItem(candidate));
  }
  return items;
}

export function resolveBriefField(
  items: readonly BriefItem[],
  briefItemId: string,
  field: string,
  value: unknown,
  now = new Date()
): BriefItem[] {
  return items.map((item) => {
    if (item.briefItemId !== briefItemId) return structuredClone(item);
    const state = item.fieldStates[field];
    if (!state || state.status !== "Unresolved") throw new Error("BRIEF_FIELD_NOT_UNRESOLVED");
    return {
      ...structuredClone(item),
      currentValue: { ...structuredClone(item.currentValue), [field]: structuredClone(value) },
      fieldStates: {
        ...structuredClone(item.fieldStates),
        [field]: {
          status: "Confirmed" as const,
          value: structuredClone(value),
          evidenceRefs: structuredClone(state.evidenceRefs)
        }
      },
      updatedAt: now.toISOString()
    };
  });
}

export function editBriefItem(
  items: readonly BriefItem[],
  briefItemId: string,
  value: Record<string, unknown>,
  now = new Date()
): BriefItem[] {
  const targetIndex = items.findIndex((item) => item.briefItemId === briefItemId);
  if (targetIndex < 0) throw new Error("BRIEF_ITEM_NOT_FOUND");
  return items.map((item, index) => {
    if (index !== targetIndex) return structuredClone(item);
    return {
      ...structuredClone(item),
      status: "EditedConfirmed" as const,
      currentValue: structuredClone(value),
      updatedAt: now.toISOString()
    };
  });
}

export function addUserBriefItem(
  items: readonly BriefItem[],
  courseId: string,
  kind: CandidateKind,
  value: Record<string, unknown>,
  now = new Date()
): BriefItem[] {
  return [
    ...structuredClone(items),
    {
      briefItemId: crypto.randomUUID(),
      courseId,
      kind,
      ...(kind === "assessment" ? {} : { scope: "course" as const }),
      origin: "user_added",
      status: "UserAddedConfirmed",
      currentValue: structuredClone(value),
      fieldStates: {},
      sourceCandidateRefs: [],
      evidenceRefs: [] satisfies EvidenceReference[],
      updatedAt: now.toISOString()
    }
  ];
}
