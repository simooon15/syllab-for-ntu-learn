/**
 * Automated final-screenshot capture for the Interaction & IA Spec backfill. Every required
 * screen and important state is produced by the real extension bundle through the real render
 * path, then written to a stable versioned path. Side Panel and Full-page are captured
 * separately wherever their layout differs.
 *
 * States that only exist after an interaction (Evidence reveal, structural correction, the
 * first-use hint, the restore summary) are reached by performing that interaction, not by
 * faking the screen: `prepare` runs real clicks and real file selection against the built app.
 *
 * Usage: node scripts/capture-screenshots.mjs [--out <dir>]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { launchExtension } from "./lib/browser-harness.mjs";

const outputIndex = process.argv.indexOf("--out");
export const SCREENSHOT_DIRECTORY =
  outputIndex >= 0 && process.argv[outputIndex + 1]
    ? resolve(process.argv[outputIndex + 1])
    : resolve("artifacts", "screenshots", "v0.2.0");

/**
 * Clicking a fact swaps it for its Evidence in place (CRS-05), so the screenshot is the state
 * after the swap, taken from the Brief the user is actually reading.
 */
async function revealEvidence(page) {
  const fact = page.locator(".fact-value").first();
  await fact.waitFor({ timeout: 10_000 });
  await fact.click();
  await page.locator(".is-evidence").first().waitFor({ timeout: 5_000 });
}

/** `More…` holds the low-frequency structural actions, so both IRV states open through it. */
async function openReviewMore(page) {
  const more = page.getByText("More…").first();
  await more.waitFor({ timeout: 10_000 });
  await more.click();
}

async function openMerge(page) {
  await openReviewMore(page);
  await page.getByText("Same assessment as…").first().click();
}

async function openSplit(page) {
  await openReviewMore(page);
  await page.getByText("Split").first().click();
}

/**
 * The restore summary (BKP-02) appears once a file has been chosen and validated. The file is a
 * real backup produced by the product's own export path, written to disk and selected the way a
 * user selects it.
 */
async function chooseBackupFile(page, harness) {
  const backup = await harness.exportBackup();
  const path = join(tmpdir(), `syllab-acceptance-backup-${String(Date.now())}.json`);
  await writeFile(path, backup, "utf8");
  const input = page.locator(".file-input");
  await input.waitFor({ state: "attached", timeout: 10_000 });
  await input.setInputFiles(path);
  await page.locator('[data-screen="BKP-02"]').first().waitFor({ timeout: 10_000 });
}

/** Keep this list in step with the Screen tables in the Interaction & IA Spec. */
export const REQUIRED_SCREENSHOTS = [
  { id: "SEM-01", scenario: "semester-dashboard", surface: "full-page" },
  { id: "SEM-02", scenario: "semester-dashboard", surface: "side-panel" },
  { id: "SEM-03", scenario: "semester-dashboard", surface: "full-page" },
  { id: "SEM-04", scenario: "historical-semester", surface: "full-page" },
  { id: "SEM-05", scenario: "historical-semester", surface: "side-panel" },
  { id: "SEM-06", scenario: "empty-semester", surface: "full-page" },
  { id: "SEM-07", scenario: "semester-dashboard", surface: "full-page" },
  { id: "CRS-01", scenario: "course-brief", surface: "full-page" },
  { id: "CRS-02", scenario: "course-brief", surface: "side-panel" },
  { id: "CRS-03", scenario: "course-brief", surface: "side-panel" },
  { id: "CRS-04", scenario: "course-brief", surface: "full-page" },
  {
    id: "CRS-05",
    scenario: "course-brief",
    surface: "full-page",
    prepare: revealEvidence
  },
  { id: "CRS-06", scenario: "no-assessments", surface: "full-page" },
  { id: "ISC-01", scenario: "semester-dashboard", surface: "full-page" },
  { id: "ISC-02", scenario: "scan-working", surface: "side-panel" },
  { id: "ISC-03", scenario: "scan-waiting-api-key", surface: "side-panel" },
  { id: "ISC-04", scenario: "scan-waiting-permission", surface: "side-panel" },
  { id: "ISC-05", scenario: "scan-failed", surface: "side-panel" },
  { id: "ISC-06", scenario: "scan-failed", surface: "full-page" },
  { id: "IRV-01", scenario: "initial-review", surface: "side-panel" },
  { id: "IRV-02", scenario: "initial-review", surface: "full-page" },
  { id: "IRV-03", scenario: "initial-review", surface: "full-page", prepare: openMerge },
  { id: "IRV-04", scenario: "initial-review", surface: "full-page", prepare: openSplit },
  {
    id: "IRV-05",
    scenario: "initial-review",
    surface: "full-page",
    // The hint belongs to the first use of a structural action, so it is captured from that same
    // first-use state rather than re-opened later.
    prepare: openSplit
  },
  { id: "CRV-01", scenario: "change-review", surface: "full-page" },
  { id: "CRV-03", scenario: "conflict-review", surface: "full-page" },
  { id: "CRV-04", scenario: "possibly-removed", surface: "full-page" },
  { id: "CRV-05", scenario: "identity-uncertain", surface: "full-page" },
  { id: "RBL-01", scenario: "course-brief", surface: "full-page" },
  { id: "RBL-02", scenario: "scan-working", surface: "side-panel" },
  { id: "RBL-03", scenario: "course-brief", surface: "full-page" },
  { id: "CAL-01", scenario: "course-brief", surface: "full-page" },
  { id: "SET-01", scenario: "settings", surface: "full-page" },
  { id: "SET-02", scenario: "settings", surface: "full-page" },
  { id: "SET-04", scenario: "settings", surface: "full-page" },
  { id: "SET-05", scenario: "settings", surface: "full-page" },
  { id: "BKP-01", scenario: "settings", surface: "full-page" },
  { id: "BKP-02", scenario: "settings", surface: "full-page", prepare: chooseBackupFile },
  { id: "BKP-04", scenario: "settings", surface: "full-page" }
];

async function capture() {
  await mkdir(SCREENSHOT_DIRECTORY, { recursive: true });
  const app = await launchExtension();
  const captured = [];
  const missing = [];
  try {
    for (const entry of REQUIRED_SCREENSHOTS) {
      await app.seed(entry.scenario);
      const page = entry.surface === "side-panel" ? app.panel : app.fullPage;
      await app.route(entry.surface, entry.id, "course_pm");
      await page.reload();
      await page.waitForSelector("#app > *");
      // A prepare step may leave the page on the state it produced; that state is the shot.
      if (entry.prepare) await entry.prepare(page, app);
      const target = page.locator(`[data-screen="${entry.id}"]`).first();
      const present = await target
        .waitFor({ timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (!present) {
        missing.push(entry.id);
        continue;
      }
      const path = resolve(SCREENSHOT_DIRECTORY, `${entry.id}.png`);
      await page.screenshot({ path, fullPage: true });
      captured.push({ id: entry.id, path });
    }
  } finally {
    await app.close();
  }

  if (missing.length > 0) {
    process.stderr.write(
      `Screenshot capture is incomplete. Screens not implemented or not reachable: ${missing.join(", ")}\n`
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Captured ${String(captured.length)} screens into ${SCREENSHOT_DIRECTORY}.\n`
  );
}

await capture();
