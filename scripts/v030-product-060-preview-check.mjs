/** Zero-paid display/conservation check against a fresh saved-candidate QA profile. */
import fs from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
const root = resolve(process.cwd()),
  priv = join(root, "evidence/private/product-060");
const entry = JSON.parse(await fs.readFile(join(priv, "DIAGNOSTIC_QA_ENTRY.json"), "utf8"));
const sha = (x) => createHash("sha256").update(x).digest("hex");
async function digestBuild(dir) {
  const entries = [];
  async function visit(p) {
    for (const item of await fs.readdir(p, { withFileTypes: true })) {
      const full = join(p, item.name);
      if (item.isDirectory()) await visit(full);
      else entries.push([relative(dir, full), sha(await fs.readFile(full))]);
    }
  }
  await visit(dir);
  return sha(JSON.stringify(entries.sort((a, b) => a[0].localeCompare(b[0]))));
}
const results = [];
for (const width of [1280, 380]) {
  const profile = await fs.mkdtemp(join(priv, `preview-${width}-`));
  await fs.cp(entry.profile, profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    reducedMotion: "reduce",
    viewport: { width, height: 900 },
    args: [`--disable-extensions-except=${entry.extension}`, `--load-extension=${entry.extension}`]
  });
  try {
    await context.route(/^https?:\/\//, (route) => route.abort());
    const control = await context.newPage();
    await control.goto(entry.origin + "/control.html");
    const inspect = () => control.evaluate((id) => window.inspect054(id), entry.courseId);
    const before = await inspect();
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(entry.origin + "/preview.html" + (width === 380 ? "?surface=side-panel" : ""));
    await page.locator(".assessment-cards").waitFor();
    const names = await page.locator(".is-summary .assessment-name").allTextContents();
    const weights = await page
      .locator(".assessment-cards .fact[data-field='weight']")
      .allTextContents();
    assert(names.length > 0);
    const cardIds = await page
      .locator(".assessment-cards > .assessment")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.assessmentId));
    assert.equal(new Set(cardIds).size, cardIds.length, "DUPLICATE_MAIN_ASSESSMENT");
    assert.equal(await page.locator(".course-body > .assessment").count(), 0, "SECOND_CARD_SET");
    assert.equal(await page.locator(".group-heading").count(), 0, "DUPLICATE_CATEGORY_CATALOG");
    const layout = await page.locator(".assessment-cards > .assessment").evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect(),
          header = node.querySelector(".assessment-card-header").getBoundingClientRect(),
          footer = node.querySelector(".assessment-card-footer").getBoundingClientRect(),
          scroll = node.querySelector(".assessment-card-scroll");
        return {
          id: node.dataset.assessmentId,
          top: r.top,
          bottom: r.bottom,
          height: r.height,
          headerWithin: header.top >= r.top && header.bottom <= r.bottom,
          footerWithin: footer.top >= r.top && footer.bottom <= r.bottom,
          scrollHeight: scroll.scrollHeight,
          clientHeight: scroll.clientHeight
        };
      })
    );
    assert(
      layout.every((r) => r.headerWithin && r.footerWithin && r.clientHeight > 0),
      "CARD_FIXED_REGIONS_CLIPPED"
    );
    if (width === 1280)
      for (let i = 0; i + 1 < layout.length; i += 2) {
        assert(Math.abs(layout[i].top - layout[i + 1].top) < 2);
        assert(Math.abs(layout[i].bottom - layout[i + 1].bottom) < 2);
      }
    if (width === 380)
      assert(
        layout.every((r, i) => !i || r.top >= layout[i - 1].bottom),
        "NARROW_CARD_OVERLAP"
      );
    let overflowing = layout.find((r) => r.scrollHeight > r.clientHeight);
    let overflowViewportHeight = 900;
    if (!overflowing) {
      // A shorter real viewport exercises overflow without inserting fabricated candidate facts.
      await page.setViewportSize({ width, height: 650 });
      overflowViewportHeight = 650;
      const reduced = await page.locator(".assessment-card-scroll").evaluateAll((nodes) =>
        nodes.map((n) => ({
          id: n.closest("[data-assessment-id]").dataset.assessmentId,
          scrollHeight: n.scrollHeight,
          clientHeight: n.clientHeight
        }))
      );
      overflowing = reduced.find((r) => r.scrollHeight > r.clientHeight);
    }
    assert(overflowing, "REAL_SUMMARY_OVERFLOW_CASE_REQUIRED");
    const region = page.locator(`[data-assessment-id="${overflowing.id}"] .assessment-card-scroll`);
    await region.hover();
    const outerBefore = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 300);
    await page.waitForFunction(
      (id) =>
        document.querySelector(`[data-assessment-id="${id}"] .assessment-card-scroll`).scrollTop >
        0,
      overflowing.id
    );
    assert.equal(await page.evaluate(() => scrollY), outerBefore, "INNER_SCROLL_CHAINED_TO_PAGE");
    await region.focus();
    await page.keyboard.press("Home");
    await page.waitForFunction(
      (id) =>
        document.querySelector(`[data-assessment-id="${id}"] .assessment-card-scroll`).scrollTop ===
        0,
      overflowing.id
    );
    await page.keyboard.press("PageDown");
    await page.waitForFunction(
      (id) =>
        document.querySelector(`[data-assessment-id="${id}"] .assessment-card-scroll`).scrollTop >
        0,
      overflowing.id
    );
    await region.evaluate((n) => {
      n.scrollTop = 0;
    });
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: join(priv, `brief-top-${width}.png`) });
    await page.screenshot({ path: join(priv, `brief-full-${width}.png`), fullPage: true });
    const reachable = new Set();
    const record = async () => {
      for (const id of await page
        .locator("[data-fact-id]")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.factId)))
        reachable.add(id);
    };
    await record();
    const summaryStates = await page.locator(".is-summary .fact").evaluateAll((nodes) =>
      nodes.map((n) => ({
        id: n.dataset.factId,
        value: n.querySelector(".fact-value")?.textContent,
        uncertain: !!n.querySelector(".fact-question")
      }))
    );
    if (width === 1280) {
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({
        path: join(priv, "brief-summary.pdf"),
        format: "A4",
        preferCSSPageSize: true,
        printBackground: true
      });
    }
    const detailOpened = [],
      detailGroups = [];
    for (const name of names) {
      await page.locator(".is-summary .assessment-name").filter({ hasText: name }).first().click();
      await page.locator(".assessment-detail").waitFor();
      assert((await page.locator(".assessment-detail").innerText()).includes(name));
      const states = await page.locator(".assessment-summary .fact").evaluateAll((nodes) =>
        nodes.map((n) => ({
          id: n.dataset.factId,
          value: n.querySelector(".fact-value")?.textContent,
          uncertain: !!n.querySelector(".fact-question")
        }))
      );
      for (const state of states)
        assert.deepEqual(
          state,
          summaryStates.find((s) => s.id === state.id),
          "SUMMARY_DETAIL_STATE_MISMATCH"
        );
      detailOpened.push(name);
      const sections = await page.locator(".assessment-detail .section-heading").allTextContents();
      detailGroups.push({ name, sections });
      await page.screenshot({
        path: join(priv, `detail-${detailOpened.length}-${width}.png`),
        fullPage: true
      });
      if (width === 1280 && detailOpened.length === 1) {
        const closedBefore = await page
          .locator("details")
          .evaluateAll((nodes) => nodes.map((n) => n.open));
        await page.pdf({
          path: join(priv, "presentation-full.pdf"),
          format: "A4",
          preferCSSPageSize: true,
          printBackground: true
        });
        assert.deepEqual(
          await page.locator("details").evaluateAll((nodes) => nodes.map((n) => n.open)),
          closedBefore,
          "PRINT_DISCLOSURE_NOT_RESTORED"
        );
        await page.emulateMedia({ media: "print" });
        await page.evaluate(() =>
          document.querySelectorAll("details").forEach((d) => (d.open = true))
        );
        await page.screenshot({ path: join(priv, "presentation-print-flow.png"), fullPage: true });
        await page.emulateMedia({ media: "screen" });
      }
      // Independent fields appear once in this selected detail.
      const visibleIds = await page
        .locator(".assessment-detail .fact")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.factId));
      assert.equal(new Set(visibleIds).size, visibleIds.length, "FACT_DUPLICATED_WITHIN_DETAIL");
      await page.evaluate(() =>
        document.querySelectorAll("details").forEach((d) => (d.open = true))
      );
      await record();
      const evidence = page.locator(".assessment-detail .fact-value.is-swappable").first();
      if (await evidence.count()) {
        await evidence.click();
        await page.locator(".assessment-detail .evidence").first().waitFor({ state: "visible" });
      }
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false
      );
      await page.locator(".back-action").first().click();
      await page.locator(".assessment-cards").waitFor();
      await page.waitForFunction(() =>
        document.activeElement?.classList.contains("assessment-name")
      );
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        name,
        "RETURN_FOCUS_LOST"
      );
    }
    // Keyboard opens the same object; return does not create a decision.
    await page.locator(".is-summary .assessment-name").first().focus();
    await page.keyboard.press("Enter");
    await page.locator(".assessment-detail").waitFor();
    await page.locator(".back-action").first().click();
    await page.locator(".assessment-cards").waitFor();
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    await record();
    const expected = before.snapshot.facts.filter((f) => !f.superseded).map((f) => f.factId);
    const missing = expected.filter((id) => !reachable.has(id));
    assert.deepEqual(missing, [], "FACT_RENDER_CONSERVATION");
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    );
    // Evidence reveal is a view-only action.
    const evidence = page.locator(".fact-value.is-swappable").first();
    if (await evidence.count()) await evidence.click();
    await page.reload();
    await page.locator(".assessment-cards").waitFor();
    assert.deepEqual(await inspect(), before, "PREVIEW_WRITES_OR_REFRESH_DRIFT");
    assert.deepEqual(errors, []);
    results.push({
      width,
      surface: width === 380 ? "side-panel" : "full-page",
      layout,
      overflowViewportHeight,
      internalWheelAndKeyboard: true,
      noPageScrollChaining: true,
      names,
      weights,
      detailOpened,
      cardIds,
      detailGroups,
      summaryDetailStateConsistent: true,
      keyboardOpen: true,
      focusReturn: true,
      noDuplicateCardSet: true,
      allFactsReachable: expected.length,
      missing,
      refreshStateUnchanged: true,
      trustedWrites: 0,
      pageErrors: errors
    });
  } finally {
    await context.close();
  }
}
const out = {
  ...entry,
  previewUrl: entry.origin + "/preview.html",
  productPreview: "UNVERIFIED / NOT RC2 / NOT TRUSTED",
  qaBuildSHA256: await digestBuild(entry.extension),
  productionBuildSHA256: await digestBuild(join(root, "extension/dist")),
  generatedAt: new Date().toISOString(),
  checks: results
};
await fs.writeFile(join(priv, "PREVIEW_ENTRY.json"), JSON.stringify(out, null, 2) + "\n");
await fs.writeFile(join(priv, "preview-proof.json"), JSON.stringify(results, null, 2) + "\n");
console.log(
  JSON.stringify({
    status: "DISPLAY_AND_CONSERVATION_VERIFIED_NOT_SEMANTIC_ACCEPTANCE",
    widths: results.map((r) => r.width),
    paidCalls: 0
  })
);
