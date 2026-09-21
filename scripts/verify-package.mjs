/**
 * Proves the packaged zip is usable by someone who has nothing but the zip: it extracts the
 * archive to a clean directory, loads THAT directory as an unpacked extension in a fresh browser
 * profile, and checks that the extension comes up. Reading the zip would not show this; only
 * loading it does.
 *
 * Usage: node scripts/verify-package.mjs
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { unzipSync } from "fflate";
import { chromium } from "playwright";

import { KEY_SHAPE, forbiddenHits } from "./lib/release-markers.mjs";

const version = JSON.parse(
  await readFile(resolve("extension", "public", "manifest.json"), "utf8")
).version;
const archivePath = resolve("artifacts", "release", `syllab-for-ntu-learn-v${version}.zip`);
const folderName = `Syllab-v${version}`;
// Stable Chrome no longer guarantees support for command-line sideloading. This verifier uses
// Playwright's extension-capable Chromium for a deterministic clean-profile check; release
// closure separately performs the ordinary Chrome UI "Load unpacked" smoke on this exact extract.
const browserExecutable = chromium.executablePath();

const archive = new Uint8Array(await readFile(archivePath));
const entries = unzipSync(archive);
const names = Object.keys(entries);

const failures = [];
const required = [
  "manifest.json",
  "background.js",
  "app.html",
  "sidepanel.html",
  "app.css",
  "icons/syllab-logo-16px.png",
  "icons/syllab-logo-128px.png"
];
for (const relative of required) {
  if (!names.includes(`${folderName}/${relative}`)) failures.push(`MISSING_IN_ZIP:${relative}`);
}
// Everything must sit under the one folder, or unzipping scatters files into the user's folder.
for (const name of names) {
  if (!name.startsWith(`${folderName}/`)) failures.push(`NOT_UNDER_PACKAGE_FOLDER:${name}`);
}
if (names.some((name) => name.includes(".."))) failures.push("SUSPICIOUS_ENTRY_NAME");

// Every entry is read, not only the scripts. A release archive must contain no test-only source
// and no build artifact that could carry one, so the check runs over the bytes of all of them.
for (const [name, bytes] of Object.entries(entries)) {
  const text = Buffer.from(bytes).toString("utf8");
  for (const hit of forbiddenHits(text, name)) failures.push(`FORBIDDEN_IN_ARCHIVE:${hit}`);
  if (KEY_SHAPE.test(text)) failures.push(`KEY_SHAPE_IN_ARCHIVE:${name}`);
  if (name.endsWith(".map")) failures.push(`SOURCE_MAP_IN_ARCHIVE:${name}`);
}

const extracted = await mkdtemp(join(tmpdir(), "syllab-verify-package-"));
const root = join(extracted, folderName);
for (const [name, bytes] of Object.entries(entries)) {
  const relative = name.slice(folderName.length + 1);
  if (relative.length === 0) continue;
  const target = join(root, relative);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, bytes);
}

const profile = await mkdtemp(join(tmpdir(), "syllab-verify-profile-"));
const context = await chromium.launchPersistentContext(profile, {
  executablePath: browserExecutable,
  headless: false,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`, "--no-first-run"]
});

try {
  let worker = context.serviceWorkers()[0];
  if (!worker) {
    worker = await context
      .waitForEvent("serviceworker", { timeout: 20_000 })
      .catch(() => undefined);
  }
  if (!worker) {
    failures.push("EXTENSION_DID_NOT_START");
  } else {
    const extensionId = new URL(worker.url()).host;
    if (!extensionId) failures.push("EXTENSION_ID_MISSING");

    if (extensionId) {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/app.html`);
      await page
        .waitForSelector("#app > *", { timeout: 10_000 })
        .catch(() => failures.push("APP_PAGE_EMPTY"));
      const rendered = await page.locator("#app > *").count();
      if (rendered === 0) failures.push("APP_RENDERED_NOTHING");

      // The packaged build must have no test hook and no key material. This reads the bundle the
      // browser actually loaded, which the archive scan above cannot prove.
      const source = await page.evaluate(async () =>
        (await fetch(chrome.runtime.getURL("background.js"))).text()
      );
      for (const hit of forbiddenHits(source, "background.js(loaded)")) {
        failures.push(`FORBIDDEN_WHEN_LOADED:${hit}`);
      }
      if (KEY_SHAPE.test(source)) failures.push("PACKAGED_BUNDLE_HAS_KEY_SHAPE");

      const panel = await context.newPage();
      await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
      await panel
        .waitForSelector("#app > *", { timeout: 10_000 })
        .catch(() => failures.push("SIDEPANEL_EMPTY"));
    }
  }
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
  await rm(extracted, { recursive: true, force: true });
}

if (failures.length > 0) {
  process.stderr.write(
    `Package verification failed:\n${failures.map((f) => ` - ${f}`).join("\n")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Package verification passed: ${String(names.length)} entries, loads as an unpacked extension in ${browserExecutable}, app and Side Panel render.\n`
  );
}
