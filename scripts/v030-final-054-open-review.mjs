/** Open the isolated, unconfirmed Human Gate 5 snapshot with the single production RC. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { chromium } from "playwright";

const root = resolve(process.cwd());
const entry = JSON.parse(
  await fs.readFile(
    join(root, "evidence/private/goal-driven-052/continuation-054/GATE5_ENTRY.json"),
    "utf8"
  )
);
const manifest = JSON.parse(
  await fs.readFile(join(root, "artifacts/v0.3.0/goal-driven-054/RELEASE_CANDIDATE.json"), "utf8")
);
assert.equal(entry.initialTrustedFacts, 0);
assert.equal(entry.extension, join(root, ".tmp/syllab-v0.3.0-rc1"));
for (const file of manifest.files) {
  const bytes = await fs.readFile(join(entry.extension, file.path));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256, "RC_FILE_CHANGED");
}
const context = await chromium.launchPersistentContext(entry.profile, {
  channel: "chromium",
  headless: false,
  viewport: null,
  args: ["--disable-extensions-except=" + entry.extension, "--load-extension=" + entry.extension]
});
// This saved-evidence acceptance entry is offline for provider calls. Human operations
// remain native; a click cannot spend the wallet or touch the original formal profile.
await context.route("https://api.deepseek.com/**", (route) => route.abort("blockedbyclient"));
const page = await context.newPage();
await page.goto(entry.url);
const opened = await page.evaluate(
  (courseId) =>
    chrome.runtime.sendMessage({
      contract: 2,
      type: "OPEN_SCREEN",
      surface: "full-page",
      courseId,
      screen: "IRV-01"
    }),
  entry.courseId
);
assert(opened?.ok, "NATIVE_REVIEW_ROUTE_NOT_RESTORED");
await page.reload();
await page.getByRole("button", { name: "Confirm", exact: true }).waitFor();
console.log("Isolated Human Gate 5 Review opened. Production RC verified; provider calls blocked.");
await new Promise((done) => context.once("close", done));
