/** Actual UI structural decisions on disposable diagnostic profiles; never semantic acceptance. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { waitNativeCondition } from "./qa-native-wait.mjs";
const priv = resolve(
  process.argv.find((arg) => arg.startsWith("--output-dir="))?.slice("--output-dir=".length) ??
    "evidence/private/gate5-remediation-056"
);
const entry = JSON.parse(await fs.readFile(join(priv, "DIAGNOSTIC_QA_ENTRY.json"), "utf8"));
const results = [];
for (const width of [380, 1280])
  for (const action of ["split", "merge"]) {
    const profile = await fs.mkdtemp(join(priv, `structural-${action}-${String(width)}-`));
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
      const inspect = () => control.evaluate((id) => window.inspect054(id), entry.courseId);
      const before = await inspect();
      assert.equal(before.trusted.facts.length, 0);
      const page = await context.newPage();
      await page.goto(entry.url);
      const open = async (id) => {
        await page.evaluate(
          async (x) => {
            const r = await chrome.runtime.sendMessage({
              contract: 2,
              type: "OPEN_SCREEN",
              surface: "full-page",
              screen: "IRV-01",
              courseId: x.courseId,
              reviewItemId: x.id
            });
            if (!r.ok) throw Error(r.error.code);
          },
          { courseId: entry.courseId, id }
        );
        await page.reload();
      };
      const view = () =>
        page.evaluate(async () => {
          const r = await chrome.runtime.sendMessage({
            contract: 2,
            type: "GET_VIEW",
            surface: "full-page"
          });
          if (!r.ok) throw Error(r.error.code);
          return r.view;
        });
      let target;
      for (const item of before.snapshot.reviewItems) {
        if (!item.payload.ownerScope || !item.payload.scopeFactIds?.length) continue;
        await open(item.reviewItemId);
        const v = await view();
        if (v.review.actions.includes(action === "split" ? "Split" : "SameAssessmentAs")) {
          target = item;
          break;
        }
      }
      assert(target, "NO_STRUCTURAL_REVIEW_SCOPE");
      await page.getByRole("button", { name: "More…", exact: true }).click();
      if (action === "split") {
        await page.getByRole("button", { name: "Split", exact: true }).click();
        await page.locator(".split-parts input").nth(0).fill("Diagnostic part A");
        await page.locator(".split-parts input").nth(1).fill("Diagnostic part B");
        const choices = page.locator('.split-fact [data-part="2"]');
        if (await choices.count()) await choices.first().click();
        await page.getByRole("button", { name: "Split", exact: true }).click();
      } else {
        await page.getByRole("button", { name: "Same assessment as…", exact: true }).click();
        const candidates = page.locator(".merge-candidates button");
        assert((await candidates.count()) > 0, "PENDING_MERGE_TARGETS_INACCESSIBLE");
        await candidates.first().click();
      }
      await waitNativeCondition(
        control,
        async (x) =>
          (await window.inspect054(x.courseId)).snapshot.course.currentRevision > x.revision,
        { courseId: entry.courseId, revision: before.snapshot.course.currentRevision }
      );
      await page.reload();
      const after = await inspect();
      assert.equal(after.trusted.facts.length, 0, "STRUCTURAL_DECISION_IMPLICITLY_APPROVED_FACTS");
      for (const id of before.snapshot.facts.map((f) => f.factId))
        assert(
          after.snapshot.facts.some((f) => f.factId === id),
          "INDEPENDENT_FACT_LOST"
        );
      for (const id of target.payload.scopeFactIds)
        assert(
          after.snapshot.reviewItems.some((r) => r.payload.scopeFactIds?.includes(id)),
          "SELECTED_SCOPE_NOT_PENDING"
        );
      for (const r of after.snapshot.reviewItems)
        for (const id of r.payload.scopeFactIds ?? []) {
          const fact = after.snapshot.facts.find((f) => f.factId === id);
          assert(fact);
          assert.equal(
            fact.assessmentId ?? fact.constraintId,
            r.targetId,
            "PENDING_SCOPE_OWNER_STALE"
          );
        }
      const screenshot = join(priv, `structural-${action}-${String(width)}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      results.push({
        width,
        action,
        profile,
        pendingFactsPreserved: true,
        implicitlyTrustedFacts: 0,
        allOriginalFactIDsRetained: true,
        reload: true,
        paidCalls: 0,
        semanticAcceptance: false,
        humanAcceptance: false,
        screenshot
      });
    } finally {
      await context.close();
    }
  }
await fs.writeFile(
  join(priv, "structural-interactions.json"),
  JSON.stringify(results, null, 2) + "\n"
);
console.log(
  JSON.stringify({
    status: "STRUCTURAL_CLICK_CHECKS_PASS_NOT_SEMANTIC_ACCEPTANCE",
    cases: results.length,
    paidCalls: 0
  })
);
