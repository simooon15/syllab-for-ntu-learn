/** RC1 failure reproduction from a fresh saved-evidence clone; never reuse the Human session. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(process.cwd());
const entry = JSON.parse(
  await fs.readFile(
    join(root, "evidence/private/goal-driven-052/continuation-054/GATE5_ENTRY.json"),
    "utf8"
  )
);
const recovery = JSON.parse(
  await fs.readFile(join(root, "evidence/private/gate5-remediation-055/RESUME.json"), "utf8")
);
const manifest = JSON.parse(
  await fs.readFile(join(root, "artifacts/v0.3.0/goal-driven-054/RELEASE_CANDIDATE.json"), "utf8")
);
for (const file of manifest.files) {
  const bytes = await fs.readFile(join(entry.extension, file.path));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256, "RC_FILE_CHANGED");
}
assert(recovery.seedProfile !== entry.profile, "HUMAN_PROFILE_NOT_A_SEED");
const directory = join(root, "evidence/private/gate5-remediation-055/acceptance-clones");
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(join(directory, "rc1-unconfirmed-"));
await fs.cp(recovery.seedProfile, profile, {
  recursive: true,
  filter: (source) =>
    ![
      "SingletonLock",
      "SingletonSocket",
      "SingletonCookie",
      "Cache",
      "Code Cache",
      "GPUCache"
    ].includes(basename(source))
});
const verifyOnly = process.argv.includes("--verify-only");
const context = await chromium.launchPersistentContext(profile, {
  channel: "chromium",
  headless: verifyOnly,
  viewport: verifyOnly ? { width: 1280, height: 900 } : null,
  args: ["--disable-extensions-except=" + entry.extension, "--load-extension=" + entry.extension]
});
try {
  await context.route("https://**/*", (route) => route.abort("blockedbyclient"));
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
  assert.equal(
    opened.view.review?.position.total,
    entry.pendingReviewItems,
    "SEED_NOT_UNCONFIRMED"
  );
  await page.reload();
  await page.getByRole("button", { name: "Confirm", exact: true }).waitFor();
  console.log("RC1 failure reproduction opened in a fresh clone. All HTTPS blocked; not RC2.");
  console.log("Clone: " + profile);
  if (!verifyOnly) await new Promise((done) => context.once("close", done));
} finally {
  await context.close();
}
