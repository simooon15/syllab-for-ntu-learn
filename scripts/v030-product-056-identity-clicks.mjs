/** Same/Different on actual production UI, controlled identity pair; no model quality claim. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { waitNativeCondition } from "./qa-native-wait.mjs";
const priv = resolve(
    process.argv.find((arg) => arg.startsWith("--output-dir="))?.slice("--output-dir=".length) ??
      "evidence/private/gate5-remediation-056"
  ),
  entry = JSON.parse(await fs.readFile(join(priv, "DIAGNOSTIC_QA_ENTRY.json"), "utf8"));
const results = [];
for (const width of [380, 1280])
  for (const action of ["Same assessment", "Different assessment"]) {
    const profile = await fs.mkdtemp(join(priv, `identity-${width}-`));
    await fs.cp(entry.profile, profile, { recursive: true });
    const context = await chromium.launchPersistentContext(profile, {
      channel: "chromium",
      headless: true,
      viewport: { width, height: 900 },
      args: [
        `--disable-extensions-except=${entry.extension}`,
        `--load-extension=${entry.extension}`
      ]
    });
    try {
      await context.route("https://**/*", (r) => r.abort());
      const control = await context.newPage();
      await control.goto(entry.origin + "/control.html");
      const before = await control.evaluate((id) => window.inspect054(id), entry.courseId);
      const change = await control.evaluate((id) => window.prepareIdentity056(id), entry.courseId);
      const page = await context.newPage();
      await page.goto(entry.url);
      await page.evaluate(
        async (x) => {
          const r = await chrome.runtime.sendMessage({
            contract: 2,
            type: "OPEN_SCREEN",
            surface: "full-page",
            screen: "CRV-01",
            courseId: x.courseId,
            reviewItemId: x.id
          });
          if (!r.ok) throw Error(r.error.code);
        },
        { courseId: entry.courseId, id: change.changeId }
      );
      await page.reload();
      await page.getByText("DIAGNOSTIC_IDENTITY_A", { exact: true }).waitFor();
      await page.getByText("DIAGNOSTIC_IDENTITY_B", { exact: true }).waitFor();
      await page.screenshot({
        path: join(
          priv,
          `identity-${width}-${action.startsWith("Same") ? "same" : "different"}.png`
        ),
        fullPage: true
      });
      await page.getByRole("button", { name: action, exact: true }).click();
      await waitNativeCondition(
        control,
        async (x) =>
          (await window.inspect054(x.courseId)).decisions.some(
            (d) => d.details?.reviewedChange?.changeId === x.id
          ),
        { courseId: entry.courseId, id: change.changeId }
      );
      await page.reload();
      await control.reload();
      const after = await control.evaluate((id) => window.inspect054(id), entry.courseId),
        decision = after.decisions.find(
          (d) => d.details?.reviewedChange?.changeId === change.changeId
        );
      assert(decision);
      assert.equal(decision.kind, action.startsWith("Same") ? "KeepIdentity" : "DifferentIdentity");
      assert.deepEqual(decision.details.reviewedChange, change);
      assert.deepEqual(decision.details.sourceDependencies, change.reviewSourceDependencies);
      assert.deepEqual(after.snapshot.facts, before.snapshot.facts);
      assert.deepEqual(after.snapshot.reviewItems, before.snapshot.reviewItems);
      assert.deepEqual(after.trusted.facts, before.trusted.facts);
      assert.equal(after.trusted.facts.length, 0);
      assert.equal(after.snapshot.changes.length, before.snapshot.changes.length);
      results.push({
        width,
        action,
        profile,
        distinctIdentitiesVisible: true,
        decisionAndSourcesPersisted: true,
        pendingBaseScopesRetained: true,
        trustedFacts: 0,
        paidCalls: 0,
        semanticAcceptance: false,
        humanAcceptance: false
      });
    } finally {
      await context.close();
    }
  }
await fs.writeFile(
  join(priv, "identity-interactions.json"),
  JSON.stringify(results, null, 2) + "\n"
);
console.log(JSON.stringify(results));
