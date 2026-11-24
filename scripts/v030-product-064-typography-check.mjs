/** Fresh layout and deliberate mid-line scrolling are measured separately, without source writes. */
import fs from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root = resolve("evidence/private/product-064");
const phase = process.argv.includes("--before") ? "before" : "after";
const entry = JSON.parse(
  await fs.readFile(
    join(root, phase === "before" ? "BEFORE_QA_ENTRY.json" : "DIAGNOSTIC_QA_ENTRY.json"),
    "utf8"
  )
);
const results = [];
for (const width of [1280, 380]) {
  const profile = await fs.mkdtemp(join(root, `${phase}-type-${width}-`));
  await fs.cp(entry.profile, profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    reducedMotion: "reduce",
    viewport: { width, height: 900 },
    args: [`--disable-extensions-except=${entry.extension}`, `--load-extension=${entry.extension}`]
  });
  try {
    await context.route(/^https?:\/\//, (r) => r.abort());
    const page = await context.newPage();
    await page.goto(entry.origin + "/preview.html" + (width === 380 ? "?surface=side-panel" : ""));
    await page.locator(".is-summary").first().waitFor();
    const measure = () =>
      page
        .locator(".is-summary")
        .first()
        .evaluate((card) => {
          const region = card.querySelector(".assessment-card-scroll"),
            label = region.querySelector(".fact-label"),
            value = region.querySelector(".fact-value");
          const r = region.getBoundingClientRect(),
            l = label.getBoundingClientRect(),
            v = value.getBoundingClientRect();
          const style = (n) => {
            const s = getComputedStyle(n);
            return {
              family: s.fontFamily,
              size: s.fontSize,
              weight: s.fontWeight,
              lineHeight: s.lineHeight
            };
          };
          return {
            scrollTop: region.scrollTop,
            firstLabelTop: l.top - r.top,
            firstValueTop: v.top - r.top,
            regionHeight: r.height,
            scrollHeight: region.scrollHeight,
            title: style(card.querySelector(".assessment-name")),
            weight: style(card.querySelector(".planning-weight .fact-value")),
            date: style(card.querySelector(".planning-primary:not(.planning-weight) .fact-value")),
            course: style(document.querySelector(".course-name")),
            fonts: document.fonts.status
          };
        });
    const beforeFonts = await measure();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    );
    const fresh = await measure();
    assert(fresh.scrollTop < 1 && fresh.firstLabelTop >= -1, "FRESH_DEFAULT_FIRST_LINE_CLIPPED");
    await page.screenshot({ path: join(root, `${phase}-${width}.png`) });
    if (width === 1280)
      await page.screenshot({ path: join(root, `${phase}-full-${width}.png`), fullPage: true });
    // A shorter viewport supplies genuine overflow without inserting facts or changing card contents.
    await page.setViewportSize({ width, height: 650 });
    const region = page.locator(".is-summary .assessment-card-scroll").first();
    await region.evaluate((n) => {
      const r = n.getBoundingClientRect(),
        v = n.querySelector(".fact-value").getBoundingClientRect();
      n.scrollTop = v.top - r.top + 6;
    });
    const intentional = await measure();
    assert(
      intentional.scrollTop > 0 && intentional.firstValueTop < 0,
      "MID_LINE_SCROLL_REPRO_REQUIRED"
    );
    await page.screenshot({ path: join(root, `${phase}-scrolled-${width}.png`) });
    await page.locator(".is-summary .assessment-name").first().click();
    await page.locator(".assessment-detail").waitFor();
    await page.locator(".back-action").first().click();
    await page.locator(".is-summary").first().waitFor();
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    );
    const restored = await measure();
    assert(
      Math.abs(restored.scrollTop - intentional.scrollTop) < 1,
      "INTENTIONAL_SCROLL_RETURN_LOST"
    );
    await page.locator(".is-summary .assessment-card-scroll").first().focus();
    await page.keyboard.press("Home");
    const home = await measure();
    assert(home.scrollTop === 0 && home.firstLabelTop >= -1, "HOME_DID_NOT_REVEAL_START");
    results.push({
      width,
      freshViewportHeight: 900,
      intentionalViewportHeight: 650,
      beforeFonts,
      fresh,
      intentional,
      restored,
      home,
      semanticWrites: 0
    });
  } finally {
    await context.close();
  }
}
await fs.writeFile(join(root, `${phase}-typography.json`), JSON.stringify(results, null, 2) + "\n");
console.log(
  JSON.stringify({
    phase,
    widths: [1280, 380],
    freshDefaultClipping: false,
    intentionalMidlineReproduced: true,
    returnPositionPreserved: true,
    homeRevealsStart: true
  })
);
