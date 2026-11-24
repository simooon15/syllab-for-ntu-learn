/** Check Product-authorized corrections against their immutable baseline and current seed. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const dir = "evidence/private/product-063";
const change = JSON.parse(await fs.readFile(`${dir}/AUTHORIZED_SOURCE_CHANGES.json`, "utf8"));
const hash = (await fs.readFile(`${dir}/candidate-hash.txt`, "utf8")).trim();
const record = JSON.parse(
  await fs.readFile(
    `evidence/private/gate5-remediation-056/product-real-1/knowledge-repaired-${hash}.json`,
    "utf8"
  )
);
const p = (id) => record.product.propositions.find((v) => v.propositionRef === id);
assert.equal(createHash("sha256").update(JSON.stringify(record.product)).digest("hex"), hash);
assert.equal(record.authorization, "P2E-v0.3.0-2026-11-02-063");
assert.equal(record.trustedConfirm, false);
assert.equal(record.semanticAcceptance, false);
assert.equal(
  record.product.entities.find((e) => e.ownerRef === p("p_litrev_identity").ownerRef).disposition,
  "ISSUE"
);
assert.equal(p("p_litrev_theme_choice").disposition, "BACKGROUND");
for (const id of [
  "p_part1_turnitin_score_scale_issue",
  "p_part1_group_content_config_issue",
  "p_part1_turnitin_late_accept_uncertainty",
  "p_part1_turnitin_due_date_conflict"
])
  assert.equal(p(id).disposition, "BACKGROUND");
assert.equal(p("p_part1_presentation_minutes").value.value, "15 minutes");
assert.match(p("p_part1_qa_minutes").value.value, /around 5/);
assert.equal(p("p_part1_duration").value.state, "UNCERTAIN");
assert.equal(p("p_part1_group_count").predicate, "group_count");
assert.equal(p("p_part1_group_count").value.value, 16);
assert.equal(p("p_part1_project_approval").modality, "should");
assert(!p("p_part1_project_selection").value.value.includes("approved"));
assert.equal(p("p_part1_rubric_content").value.value, 5);
assert.equal(p("p_part1_rubric_peer").value.value, 10);
assert.equal(p("p_part4_duration_issue").value.state, "UNCERTAIN");
assert(!JSON.stringify(record.product).includes("12:00"));
assert.match(p("p_part4_exam_datetime").value.value, /09:00–11:00/);
assert.match(p("p_similarity_bands").value.value, /not covered/);
assert.match(
  p("p_similarity_zero_25").value.value,
  /Likely zero.*directly copied material which is not your own work/
);
assert.equal(p("p_gai_paper_trail_issue").value.state, "UNCERTAIN");
const refs = Array.from(
  (await fs.readFile("evidence/private/product-061/HUMAN_DECISION_TABLE.md", "utf8")).matchAll(
    /^## \d+\. (p_\w+)/gm
  ),
  (m) => m[1]
);
assert.equal(refs.length, 17);
const matrix = refs.map((id) => ({
  id,
  authorization: record.authorization,
  changed: change.changed.some((v) => v.id === id),
  previousValue: change.changed.find((v) => v.id === id)?.before?.value ?? p(id).value,
  candidateValue: p(id).value,
  state: p(id).value.state,
  disposition: p(id).disposition,
  retainedSourceSupport: p(id).support,
  trustedConfirm: false
}));
await fs.writeFile(
  `${dir}/DECISION_MATRIX.json`,
  JSON.stringify({ candidateSHA256: hash, checks: "PASS_NOT_HUMAN_GATE5", matrix }, null, 2) + "\n"
);
console.log(
  JSON.stringify({ productDecisionChecks: "PASS", rows: matrix.length, humanGate5: false })
);
