/** Actual Settings Full Replace in a cloned profile; preserves saved semantics, never certifies them. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { waitNativeCondition } from "./qa-native-wait.mjs";
import { verifyCandidateBinding } from "./qa-candidate-binding.mjs";
const priv = resolve("evidence/private/gate5-remediation-056");
const entry = JSON.parse(await fs.readFile(join(priv, "DIAGNOSTIC_QA_ENTRY.json"), "utf8"));
const humanFacets = process.argv.includes("--human-facets");
if (humanFacets) {
  const clicks = JSON.parse(await fs.readFile(join(priv, "diagnostic-interactions.json"), "utf8"));
  entry.profile = clicks.find(
    (r) => r.width === 1280 && r.humanFacetsPersistedAndDisplayed
  )?.profile;
  assert(entry.profile, "VERIFIED_HUMAN_FACET_PROFILE_REQUIRED");
}
const profile = await fs.mkdtemp(join(priv, "backup-click-"));
await fs.cp(entry.profile, profile, { recursive: true });
const context = await chromium.launchPersistentContext(profile, {
  channel: "chromium",
  headless: true,
  reducedMotion: "reduce",
  viewport: { width: 1280, height: 900 },
  args: [`--disable-extensions-except=${entry.extension}`, `--load-extension=${entry.extension}`]
});
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
try {
  await context.route("https://**/*", (r) => r.abort());
  const control = await context.newPage();
  await control.goto(entry.origin + "/control.html");
  const before = await control.evaluate(
    async (id) => ({
      state: await window.inspect054(id),
      archive: await window.archive056(id),
      backup: await window.backup056()
    }),
    entry.courseId
  );
  assert(before.archive?.draft.clauses.length > 0);
  const candidateBinding = verifyCandidateBinding(entry, before.archive);
  if (humanFacets) assert(before.state.snapshot.facts.some((f) => f.humanSemantics));
  assert.equal(before.archive.draft.productVerification, undefined);
  const file = join(
    priv,
    humanFacets ? "diagnostic-human-facet-backup.json" : "diagnostic-backup.json"
  );
  await fs.writeFile(file, JSON.stringify(before.backup));
  await control.evaluate(() => window.clearInterpretationCache056());
  const page = await context.newPage();
  await page.goto(entry.url);
  await page.evaluate(async () => {
    const r = await chrome.runtime.sendMessage({
      contract: 2,
      type: "OPEN_SCREEN",
      surface: "full-page",
      screen: "SET-04"
    });
    if (!r.ok) throw Error(r.error.code);
  });
  await page.reload();
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.getByRole("button", { name: "Replace everything", exact: true }).waitFor();
  const preview = await control.evaluate((id) => window.inspect054(id), entry.courseId);
  assert.deepEqual(preview, before.state, "Restore preview must not mutate state");
  await page.screenshot({ path: join(priv, "backup-restore-preview.png"), fullPage: true });
  await page.getByRole("button", { name: "Replace everything", exact: true }).click();
  await waitNativeCondition(
    control,
    async (id) => (await window.archive056(id))?.draft.clauses.length > 0,
    entry.courseId
  );
  // Wait for the restored route too: archive existence alone cannot prove a completed restore.
  await page
    .getByRole("button", { name: "Replace everything", exact: true })
    .waitFor({ state: "hidden" });
  await page.reload();
  await control.reload();
  const after = await control.evaluate(
    async (id) => ({
      state: await window.inspect054(id),
      archive: await window.archive056(id),
      backup: await window.backup056()
    }),
    entry.courseId
  );
  assert.deepEqual(
    after.archive,
    before.archive,
    "Every clause, condition, exception and native support must survive"
  );
  assert.deepEqual(after.state.snapshot.facts, before.state.snapshot.facts);
  assert.deepEqual(after.state.snapshot.reviewItems, before.state.snapshot.reviewItems);
  assert.deepEqual(after.state.decisions, before.state.decisions);
  assert.deepEqual(after.state.trusted, before.state.trusted);
  if (!humanFacets) assert.equal(after.state.trusted.facts.length, 0);
  assert.equal(after.archive.draft.productVerification, undefined);
  assert.equal(after.backup.digest, before.backup.digest);
  const result = {
    status: "PASS_SETTINGS_RESTORE_ON_DIAGNOSTIC_CANDIDATE",
    humanFacetBackup: humanFacets,
    ...candidateBinding,
    profile,
    clauses: after.archive.draft.clauses.length,
    archiveSHA256: hash(after.archive),
    evidenceRows: after.backup.counts.evidence,
    pendingReviewItems: after.state.snapshot.reviewItems.length,
    durableDigest: after.backup.digest,
    runtimeInterpretationCacheCleared: true,
    paidCalls: 0,
    semanticAcceptance: false,
    humanAcceptance: false
  };
  await fs.writeFile(
    join(priv, humanFacets ? "human-facet-backup-interactions.json" : "backup-interactions.json"),
    JSON.stringify(result, null, 2) + "\n"
  );
  console.log(JSON.stringify(result));
} finally {
  await context.close();
}
