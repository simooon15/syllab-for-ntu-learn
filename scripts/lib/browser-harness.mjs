/**
 * Shared Playwright harness for the acceptance browser runs. The unpacked extension is loaded
 * into a persistent Chromium profile, synthetic scenarios are seeded through the background
 * E2E bridge, and assertions read the real rendered DOM.
 */
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { access } from "node:fs/promises";

import { chromium } from "playwright";

/**
 * Acceptance runs use Playwright's pinned Chromium, not the machine's Chrome: Chrome 153 dropped
 * `--load-extension` for unpacked extensions, and a pinned build keeps screenshots and E2E results
 * reproducible across machines and across Chrome auto-updates.
 */
export const CHROME_PATH = chromium.executablePath();
export const FULL_PAGE_VIEWPORT = { width: 1180, height: 900 };
export const SIDE_PANEL_VIEWPORT = { width: 380, height: 760 };

export async function launchExtension() {
  await access(CHROME_PATH);
  // The QA build, not the shipped one. It is the same product with the acceptance bridge compiled
  // in, which is the only difference between the two bundles.
  const extensionPath = resolve("extension", "dist-qa");
  await access(resolve(extensionPath, "manifest.json"));
  const profile = await mkdtemp(join(tmpdir(), "syllab-acceptance-"));

  const context = await chromium.launchPersistentContext(profile, {
    executablePath: CHROME_PATH,
    headless: false,
    // Acceptance evidence is captured with reduced motion, which the design system already
    // requires to neutralise every animation. A screenshot taken mid-transition would otherwise
    // record a half-faded page as if it were the design.
    reducedMotion: "reduce",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-first-run",
      "--no-default-browser-check"
    ]
  });

  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  if (!extensionId) throw new Error("EXTENSION_ID_MISSING");

  const fullPage = await context.newPage();
  await fullPage.setViewportSize(FULL_PAGE_VIEWPORT);
  await fullPage.goto(`chrome-extension://${extensionId}/app.html`);
  await fullPage.waitForSelector("#app > *");

  const panel = await context.newPage();
  await panel.setViewportSize(SIDE_PANEL_VIEWPORT);
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await panel.waitForSelector("#app > *");

  return {
    extensionId,
    fullPage,
    panel,
    /** Seeds a synthetic scenario, optionally landing the surfaces on a named screen. */
    async seed(scenario, screen) {
      const result = await fullPage.evaluate(async (name) => {
        return chrome.runtime.sendMessage({
          contract: "syllab.e2e/1",
          type: "E2E_SEED",
          scenario: name
        });
      }, scenario);
      if (!result || result.ok !== true) {
        throw new Error(`E2E_SEED_FAILED:${scenario}:${JSON.stringify(result)}`);
      }
      // UI runtime state (which first-use hints have been seen, scroll position, open menus) is
      // cleared so a scenario starts from the same place every run.
      await fullPage.evaluate(async () => {
        const stored = await chrome.storage.local.get(null);
        const stale = Object.keys(stored).filter((key) => key.startsWith("syllab.v2.ui."));
        if (stale.length > 0) await chrome.storage.local.remove(stale);
      });
      await fullPage.reload();
      await panel.reload();
      await fullPage.waitForSelector("#app > *");
      await panel.waitForSelector("#app > *");
      if (screen) {
        if (!result.courseId) throw new Error(`E2E_SEED_NO_COURSE:${scenario}`);
        await fullPage.evaluate(
          async (input) =>
            chrome.runtime.sendMessage({
              contract: "syllab.e2e/1",
              type: "E2E_OPEN",
              surface: "full-page",
              screen: input.screen,
              courseId: input.courseId
            }),
          { screen, courseId: result.courseId }
        );
        await fullPage.reload();
        await fullPage.waitForSelector("#app > *");
      }
      return result;
    },
    /** The product's own backup document, as a string. */
    async exportBackup() {
      const result = await fullPage.evaluate(async () =>
        chrome.runtime.sendMessage({ contract: "syllab.e2e/1", type: "E2E_BACKUP" })
      );
      if (!result || result.ok !== true || typeof result.backup !== "string") {
        throw new Error(`E2E_BACKUP_FAILED:${JSON.stringify(result)}`);
      }
      return result.backup;
    },
    /** Points a surface at a named screen so acceptance can capture any required state. */
    async route(surface, screen, courseId) {
      const result = await fullPage.evaluate(
        async (input) =>
          chrome.runtime.sendMessage({
            contract: "syllab.e2e/1",
            type: "E2E_OPEN",
            surface: input.surface,
            screen: input.screen,
            ...(input.courseId ? { courseId: input.courseId } : {})
          }),
        { surface, screen, courseId }
      );
      if (!result || result.ok !== true) throw new Error(`E2E_OPEN_FAILED:${screen}`);
      return result;
    },
    /** Drives a real reducer through the background so the UI reflects a real state change. */
    async act(action) {
      const result = await fullPage.evaluate(async (name) => {
        return chrome.runtime.sendMessage({
          contract: "syllab.e2e/1",
          type: "E2E_ACTION",
          action: name
        });
      }, action);
      await fullPage.reload();
      await panel.reload();
      await fullPage.waitForSelector("#app > *");
      await panel.waitForSelector("#app > *");
      return result;
    },
    async screenshot(page, name) {
      const directory = resolve("artifacts", "screenshots", "v0.2.0");
      await mkdir(directory, { recursive: true });
      const path = resolve(directory, `${name}.png`);
      await page.screenshot({ path, fullPage: true });
      return path;
    },
    async close() {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  };
}

/** Waits for a screen id to be on screen, failing with the id so the message is actionable. */
export async function expectScreen(locator, screen) {
  await locator.locator(`[data-screen="${screen}"]`).first().waitFor({ timeout: 10_000 });
}
