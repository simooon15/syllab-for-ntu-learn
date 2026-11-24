/** Open only the isolated P2E-057 preview, with all HTTP(S) requests blocked. */
import fs from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const path = resolve(process.argv[2] ?? "evidence/private/product-063/PREVIEW_ENTRY.json");
const entry = JSON.parse(await fs.readFile(path, "utf8"));
assert.equal(entry.productPreview, "RC2 CANDIDATE / HUMAN GATE 5 PENDING / NOT TRUSTED");
assert(entry.profile.includes("/evidence/private/") && entry.previewUrl.endsWith("/preview.html"));
const context = await chromium.launchPersistentContext(entry.profile, {
  channel: "chromium",
  headless: false,
  reducedMotion: "reduce",
  viewport: { width: 1280, height: 900 },
  args: [`--disable-extensions-except=${entry.extension}`, `--load-extension=${entry.extension}`]
});
await context.route(/^https?:\/\//, (route) => route.abort());
const page = await context.newPage();
await page.goto(entry.previewUrl);
console.log(
  "RC2 CANDIDATE / HUMAN GATE 5 PENDING / NOT TRUSTED. Close this isolated browser to finish."
);
await new Promise((resolve) => context.on("close", resolve));
