import assert from "node:assert/strict";
import { createHash } from "node:crypto";

/** Bind isolated QA to the actual archived model candidate, never a filename or prior result. */
export function verifyCandidateBinding(entry, archive) {
  const expected = process.argv
    .find((arg) => arg.startsWith("--expected-candidate-repair="))
    ?.slice("--expected-candidate-repair=".length);
  if (expected) {
    assert.match(expected, /^[a-f0-9]{64}$/);
    assert.equal(entry.candidateRepairHash, expected, "QA_ENTRY_CANDIDATE_CHANGED");
  }
  if (!entry.candidateRepairHash) {
    assert(!expected, "QA_CANDIDATE_BINDING_REQUIRED");
    return { candidateRepairHash: null, candidateBindingVerified: false };
  }
  assert(archive?.draft?.product, "QA_ARCHIVED_PRODUCT_REQUIRED");
  const hash = createHash("sha256").update(JSON.stringify(archive.draft.product)).digest("hex");
  assert.equal(hash, entry.candidateRepairHash, "QA_ARCHIVED_CANDIDATE_CHANGED");
  return { candidateRepairHash: hash, candidateBindingVerified: true };
}
