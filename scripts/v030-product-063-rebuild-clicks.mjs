/** Controlled user/rebuild conflict on real saved candidate; UI-only, no semantic certification. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { waitNativeCondition } from "./qa-native-wait.mjs";
import { verifyCandidateBinding } from "./qa-candidate-binding.mjs";
const priv = resolve("evidence/private/product-063");
const entry = JSON.parse(await fs.readFile(join(priv, "DIAGNOSTIC_QA_ENTRY.json"), "utf8"));
const results = [];
for (const width of [380, 1280]) {
  const profile = await fs.mkdtemp(join(priv, `rebuild-click-${String(width)}-`));
  await fs.cp(entry.profile, profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    reducedMotion: "reduce",
    viewport: { width, height: 900 },
    args: [`--disable-extensions-except=${entry.extension}`, `--load-extension=${entry.extension}`]
  });
  try {
    await context.route("https://**/*", (r) => r.abort());
    const control = await context.newPage();
    await control.goto(entry.origin + "/control.html");
    const inspect = () => control.evaluate((id) => window.inspect054(id), entry.courseId);
    const initial = await inspect();
    const candidateBinding = verifyCandidateBinding(
      entry,
      await control.evaluate((id) => window.archive056(id), entry.courseId)
    );
    const target = initial.snapshot.reviewItems.find(
      (r) => r.payload.ownerScope && r.payload.scopeFactIds?.length
    );
    assert(target);
    const factId = target.payload.scopeFactIds[0];
    const page = await context.newPage();
    await page.goto(entry.url);
    const open = async (screen, id) => {
      await page.evaluate(
        async (x) => {
          const r = await chrome.runtime.sendMessage({
            contract: 2,
            type: "OPEN_SCREEN",
            surface: "full-page",
            screen: x.screen,
            courseId: x.courseId,
            ...(x.id ? { reviewItemId: x.id } : {})
          });
          if (!r.ok) throw Error(r.error.code);
        },
        { screen, id, courseId: entry.courseId }
      );
      await page.reload();
    };
    await open("IRV-01", target.reviewItemId);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .locator(`input[data-edit-key="review:${target.reviewItemId}:fact:${factId}"]`)
      .fill("DIAGNOSTIC_SAVED_VALUE");
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await waitNativeCondition(
      control,
      async (x) =>
        (await window.inspect054(x.courseId)).snapshot.facts.find((f) => f.factId === x.factId)
          ?.userEdited,
      { courseId: entry.courseId, factId }
    );
    await control.evaluate((x) => window.prepareRebuild056(x), {
      courseId: entry.courseId,
      editedFactId: factId,
      originalReviews: initial.snapshot.reviewItems
    });
    await open("RBL-03");
    await page
      .getByText("Assessments and independent requirements still need scoped Review", {
        exact: false
      })
      .waitFor();
    await page.getByRole("button", { name: "Use rebuilt course", exact: true }).click();
    await waitNativeCondition(
      control,
      async (x) =>
        (await window.inspect054(x.courseId)).snapshot.changes.some((c) => c.field === x.factId),
      { courseId: entry.courseId, factId }
    );
    await page.reload();
    const after = await inspect();
    assert.equal(
      after.snapshot.facts.find((f) => f.factId === factId).value.value,
      "DIAGNOSTIC_SAVED_VALUE"
    );
    assert(after.snapshot.reviewItems.length >= initial.snapshot.reviewItems.length);
    const conflict = after.snapshot.changes.find((c) => c.field === factId);
    assert(conflict);
    assert.equal(conflict.latestValue.value, "DIAGNOSTIC_REBUILT_VALUE");
    await open("CRV-01", conflict.changeId);
    await page.getByRole("button", { name: "Keep current", exact: true }).waitFor();
    const base = after.snapshot.reviewItems.find(
      (r) => r.kind === "initial" && r.payload.ownerScope
    );
    assert(base);
    await page.locator(".review-directory").selectOption(base.reviewItemId);
    await waitNativeCondition(
      page,
      async (id) => {
        const r = await chrome.runtime.sendMessage({
          contract: 2,
          type: "GET_VIEW",
          surface: "full-page"
        });
        return r.ok && r.view.review?.reviewItemId === id;
      },
      base.reviewItemId
    );
    await page.getByRole("button", { name: "Confirm", exact: true }).waitFor();
    await page.locator(".review-directory").selectOption(conflict.changeId);
    await waitNativeCondition(
      page,
      async (id) => {
        const r = await chrome.runtime.sendMessage({
          contract: 2,
          type: "GET_VIEW",
          surface: "full-page"
        });
        return r.ok && r.view.review?.reviewItemId === id;
      },
      conflict.changeId
    );
    if (width === 380)
      await page.getByRole("button", { name: "Keep current", exact: true }).click();
    else {
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await page
        .locator(`input[data-edit-key="conflict:${conflict.changeId}"]`)
        .fill("DIAGNOSTIC_UNRESOLVED");
      await page
        .locator(`select[data-edit-key="conflict-state:${conflict.changeId}"]`)
        .selectOption("UNCERTAIN");
      await page.getByRole("button", { name: "Save value", exact: true }).click();
    }
    await waitNativeCondition(
      control,
      async (x) =>
        !(await window.inspect054(x.courseId)).snapshot.changes.some((c) => c.changeId === x.id),
      { courseId: entry.courseId, id: conflict.changeId }
    );
    await page.reload();
    const resolved = (await inspect()).snapshot.facts.find((f) => f.factId === factId);
    if (width === 380) assert.equal(resolved.value.value, "DIAGNOSTIC_SAVED_VALUE");
    else {
      assert.equal(resolved.value.state, "UNCERTAIN");
      assert(resolved.value.competingValues.includes("DIAGNOSTIC_SAVED_VALUE"));
      assert(resolved.value.competingValues.includes("DIAGNOSTIC_REBUILT_VALUE"));
    }
    const screenshot = join(priv, `rebuild-scoped-${String(width)}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    results.push({
      width,
      profile,
      ...candidateBinding,
      savedValuePreserved: true,
      rebuildPendingScopesRetained: true,
      independentConflict: true,
      mixedDirectoryLayoutCorrect: true,
      keepCurrentReload: width === 380,
      uncertainAlternativesReload: width === 1280,
      paidCalls: 0,
      semanticAcceptance: false,
      humanAcceptance: false,
      screenshot
    });
    await fs.writeFile(
      join(priv, "rebuild-interactions.json"),
      JSON.stringify(results, null, 2) + "\n"
    );
  } finally {
    await context.close();
  }
}
await fs.writeFile(
  join(priv, "rebuild-interactions.json"),
  JSON.stringify(results, null, 2) + "\n"
);
console.log(
  JSON.stringify({
    status: "REBUILD_CLICK_CHECKS_PASS_NOT_SEMANTIC_ACCEPTANCE",
    viewports: results.map((r) => r.width),
    paidCalls: 0
  })
);
