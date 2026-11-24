import { isRecord } from "@syllab/contracts";
import { stableDigest } from "./chunking";
import { stableStringify } from "./crypto";

/** One source for response identity. Versions are contract identities, never capacity limits. */
export const AI_SCHEMAS = {
  product: "syllab.ai.course-product/1",
  facetsLegacy: "syllab.ai.semantic-facets/1",
  facets: "syllab.ai.semantic-facets/2",
  session: "syllab.ai/session/1",
  courseDraft: "syllab.ai.course-draft/1",
  a: "syllab.ai.task-a/1",
  b: "syllab.ai.task-b/1",
  groundedB: "syllab.ai.task-b/2",
  c: "syllab.ai.task-c/1",
  teaching: "syllab.ai.teaching-deferral/1",
  routing: "syllab.ai.exhaustive-routing/1",
  triage: "syllab.ai.source-triage/3",
  coarse: "syllab.ai.source-triage-coarse/1",
  physical: "syllab.ai.physical-work/1"
} as const;
const ALIASES: Readonly<Record<string, string>> = {
  "syllab.ai/task-a/1": AI_SCHEMAS.a,
  "syllab.ai/task-b/1": AI_SCHEMAS.b,
  "syllab.ai/task-c/1": AI_SCHEMAS.c,
  "syllab.ai/task-b/2": AI_SCHEMAS.groundedB
};
export interface CompatibilityRepair {
  kind: "deterministic_compat_repair";
  from: string;
  to: string;
  originalHash: string;
  repairedHash: string;
}
/** Only observed, unique aliases; no enum/field/Evidence/semantic repair. */
export function canonicalEnvelope(
  value: unknown,
  expected: string
): {
  value: unknown;
  repair?: CompatibilityRepair;
} {
  if (!isRecord(value) || typeof value.schema !== "string" || value.schema === expected)
    return { value };
  if (ALIASES[value.schema] !== expected) return { value };
  const repaired = { ...value, schema: expected };
  return {
    value: repaired,
    repair: {
      kind: "deterministic_compat_repair",
      from: value.schema,
      to: expected,
      originalHash: stableDigest(stableStringify(value)),
      repairedHash: stableDigest(stableStringify(repaired))
    }
  };
}
