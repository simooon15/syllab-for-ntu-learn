/** Zero-paid display/conservation check against a fresh saved-candidate QA profile. */
import fs from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
const root = resolve(process.cwd()),
  priv = join(root, "evidence/private/product-058");
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
    await page.goto(entry.origin + "/preview.html");
    await page.locator(".assessment-overview").waitFor();
    const names = await page.locator(".overview-item .assessment-name").allTextContents();
    const weights = await page
      .locator(".assessment-overview .fact[data-field='weight']")
      .allTextContents();
    assert(names.length > 0);
    const detailOpened = [];
    for (const name of names) {
      await page
        .locator(".overview-item .assessment-name")
        .filter({ hasText: name })
        .first()
        .click();
      await page.locator(".assessment-detail").waitFor();
      assert((await page.locator(".assessment-detail").innerText()).includes(name));
      detailOpened.push(name);
      await page.reload();
      await page.locator(".assessment-overview").waitFor();
    }

    await page.screenshot({ path: join(priv, `brief-top-${width}.png`) });
    await page.screenshot({ path: join(priv, `brief-full-${width}.png`), fullPage: true });
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    const expected = before.snapshot.facts.filter((f) => !f.superseded).map((f) => f.factId);
    const seen = await page
      .locator("[data-fact-id]")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.factId));
    const missing = expected.filter((id) => !seen.includes(id));
    assert.deepEqual(missing, [], "FACT_RENDER_CONSERVATION");
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    );
    // Evidence reveal is a view-only action.
    const evidence = page.locator(".fact-value.is-swappable").first();
    if (await evidence.count()) await evidence.click();
    await page.reload();
    await page.locator(".assessment-overview").waitFor();
    assert.deepEqual(await inspect(), before, "PREVIEW_WRITES_OR_REFRESH_DRIFT");
    assert.deepEqual(errors, []);
    results.push({
      width,
      names,
      weights,
      detailOpened,
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
