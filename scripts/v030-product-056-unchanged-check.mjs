/** Frozen native Sources through the real workflow. No newly dispatched model requests allowed. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { waitNativeCondition } from "./qa-native-wait.mjs";
import { verifyCandidateBinding } from "./qa-candidate-binding.mjs";
const priv = resolve("evidence/private/gate5-remediation-056"),
  diagnostic = process.argv.includes("--diagnostic-ui"),
  entry = JSON.parse(
    await fs.readFile(join(priv, diagnostic ? "DIAGNOSTIC_QA_ENTRY.json" : "QA_ENTRY.json"), "utf8")
  );
const profile = await fs.mkdtemp(join(priv, "unchanged-check-"));
await fs.cp(entry.profile, profile, { recursive: true });
const context = await chromium.launchPersistentContext(profile, {
  channel: "chromium",
  headless: true,
  reducedMotion: "reduce",
  args: [`--disable-extensions-except=${entry.extension}`, `--load-extension=${entry.extension}`]
});
let attemptedRequests = 0;
try {
  await context.route("https://**/*", (r) => r.abort());
  const control = await context.newPage();
  await control.exposeFunction("captured054", async (body) => {
    attemptedRequests++;
    await fs.writeFile(join(priv, "unchanged-check-blocked-request.json"), body);
    throw Error("ZERO_PAID_CHECK_UNSAVED_CALL");
  });
  await control.goto(entry.origin + "/control.html");
  const initial = await control.evaluate((id) => window.inspect054(id), entry.courseId),
    target = initial.snapshot.reviewItems.find(
      (r) => r.payload.ownerScope && r.payload.scopeFactIds?.length
    );
  assert(target);
  const candidateBinding = verifyCandidateBinding(
    entry,
    await control.evaluate((id) => window.archive056(id), entry.courseId)
  );
  const page = await context.newPage();
  await page.goto(entry.url);
  await page.evaluate(
    async (x) => {
      const r = await chrome.runtime.sendMessage({
        contract: 2,
        type: "OPEN_SCREEN",
        surface: "full-page",
        screen: "IRV-01",
        courseId: x.courseId,
        reviewItemId: x.reviewItemId
      });
      if (!r.ok) throw Error(r.error.code);
    },
    { courseId: entry.courseId, reviewItemId: target.reviewItemId }
  );
  await page.reload();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await waitNativeCondition(
    control,
    async (id) => (await window.inspect054(id)).snapshot.course.established,
    entry.courseId
  );
  const before = await control.evaluate((id) => window.inspect054(id), entry.courseId);
  const workflow = await control.evaluate((id) => window.noChange054(id), entry.courseId);
  const after = await control.evaluate((id) => window.inspect054(id), entry.courseId);
  const result = {
    profile,
    ...candidateBinding,
    scenario: diagnostic
      ? "UNCERTIFIED_DIAGNOSTIC_CANDIDATE_NOT_AN_UNCHANGED_ACCEPTANCE"
      : "FROZEN_SOURCES_CONTROLLED_CONFIRM_NOT_HUMAN_ACCEPTANCE",
    workflow,
    attemptedRequests,
    paidCalls: 0,
    semanticAcceptance: false,
    humanAcceptance: false,
    before: {
      revision: before.snapshot.course.currentRevision,
      facts: before.snapshot.facts.length,
      pending: before.snapshot.reviewItems.length
    },
    after: {
      revision: after.snapshot.course.currentRevision,
      facts: after.snapshot.facts.length,
      pending: after.snapshot.reviewItems.length
    }
  };
  await fs.writeFile(join(priv, "unchanged-check.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  assert.deepEqual(after.snapshot.facts, before.snapshot.facts);
  assert.deepEqual(after.snapshot.reviewItems, before.snapshot.reviewItems);
  assert.deepEqual(after.decisions, before.decisions);
  if (diagnostic) {
    // A contract-valid but unverified seed cannot certify the production zero-call path.
    assert.equal(workflow.state, "failed");
    assert.equal(workflow.lastErrorDetail, "ZERO_PAID_CHECK_UNSAVED_CALL");
  } else {
    assert.equal(attemptedRequests, 0, "Unchanged check must not need model redispatch");
    assert.equal(workflow.state, "complete");
  }
} finally {
  await context.close();
}
