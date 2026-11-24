/** Targeted v0.3 Activity, Review identity, editing continuity and motion qualification. Synthetic only. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchExtension } from "./lib/browser-harness.mjs";

const out = resolve("artifacts", "v0.3.0", "browser");
await mkdir(out, { recursive: true });
const app = await launchExtension();
const checks = [];
const rawAction = (action) =>
  app.fullPage.evaluate(
    (action) =>
      chrome.runtime.sendMessage({ contract: "syllab.e2e/1", type: "E2E_ACTION", action }),
    action
  );
try {
  await app.seed("initial-review", "IRV-02");
  const edit = app.fullPage.locator("input[data-edit-key]").first();
  await edit.fill("Unsubmitted review edit");
  await edit.evaluate((input) => {
    input.focus();
    input.setSelectionRange(4, 10);
  });
  const key = await edit.getAttribute("data-edit-key");
  await app.fullPage.evaluate(() =>
    chrome.storage.local.set({ "syllab.browser.repaint": Date.now() })
  );
  await app.fullPage.waitForTimeout(250);
  assert.equal(await edit.inputValue(), "Unsubmitted review edit");
  assert.deepEqual(
    await edit.evaluate((input) => ({
      focused: document.activeElement === input,
      start: input.selectionStart,
      end: input.selectionEnd
    })),
    { focused: true, start: 4, end: 10 }
  );
  checks.push({ name: "Unsubmitted edit, focus and selection survive asynchronous refresh", key });
  const labels = await app.fullPage.locator(".field-label").allTextContents();
  assert(labels.includes("Deadline") && labels.includes("Group size"));
  assert(
    !(
      await app.fullPage
        .locator("input")
        .evaluateAll((inputs) => inputs.map((input) => input.value))
    ).includes("20%")
  );
  checks.push({ name: "Pending Group Project edits its own fields" });

  await app.seed("scan-working");
  await app.route("full-page", "ISC-02", "course_pm");
  await app.fullPage.reload();
  await app.route("side-panel", "ISC-02", "course_pm");
  await app.panel.reload();
  const action = await rawAction("StartSyntheticActivity");
  assert.equal(action.ok, true);
  for (const page of [app.fullPage, app.panel]) {
    const activity = page.locator("[data-region='ai-activity']");
    await activity.waitFor();
    assert((await activity.textContent()).includes("source evidence"));
    await page.screenshot({
      path: resolve(
        out,
        page === app.fullPage ? "activity-full-page.png" : "activity-side-panel.png"
      ),
      fullPage: true
    });
  }
  await rawAction("EndSyntheticActivity");
  await app.fullPage.locator("[data-region='ai-activity']").waitFor({ state: "detached" });
  await app.panel.locator("[data-region='ai-activity']").waitFor({ state: "detached" });
  const durable = await app.fullPage.evaluate(() => chrome.storage.local.get(null));
  assert(
    !JSON.stringify(durable).includes(
      "Comparing the assessment requirements with the source evidence."
    )
  );
  checks.push({ name: "Activity bridge reaches both surfaces, clears and is not persisted" });

  await app.seed("course-brief", "CRS-01");
  await app.fullPage.locator(".fact-value").first().click();
  await app.fullPage.locator(".is-evidence").first().waitFor();
  assert.equal(
    await app.fullPage.evaluate(() =>
      document.getAnimations().some((animation) => animation.playState === "running")
    ),
    false
  );
  checks.push({
    name: "Reduced motion neutralizes active animation while evidence remains available"
  });
  await app.fullPage.emulateMedia({ reducedMotion: "no-preference" });
  await app.fullPage.locator(".fact-value").first().click();
  const pressDuration = await app.fullPage
    .locator("button")
    .first()
    .evaluate((button) => getComputedStyle(button).transitionDuration);
  assert(pressDuration.includes("0.1s"));
  checks.push({ name: "Normal motion retains shared press feedback", pressDuration });
  await writeFile(
    resolve(out, "REPORT.json"),
    JSON.stringify({ status: "PASS", synthetic: true, checks }, null, 2) + "\n"
  );
  console.log(`v0.3 browser qualification passed (${checks.length} checks).`);
} finally {
  await app.close();
}
