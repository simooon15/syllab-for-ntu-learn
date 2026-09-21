/**
 * Post-capture evidence inventory. Confirms the required screens were implemented and captured,
 * that the screenshots are the product's own rendering, and that the shipped bundle no longer
 * contains the deterministic E2E bridge.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { KEY_SHAPE, forbiddenHits } from "./lib/release-markers.mjs";

const SCREENSHOT_DIRECTORY = resolve("artifacts", "screenshots", "v0.2.0");
const REQUIRED_SCREENS = [
  "SEM-01",
  "SEM-02",
  "SEM-03",
  "SEM-04",
  "SEM-05",
  "SEM-06",
  "SEM-07",
  "CRS-01",
  "CRS-02",
  "CRS-03",
  "CRS-04",
  "CRS-05",
  "CRS-06",
  "ISC-01",
  "ISC-02",
  "ISC-03",
  "ISC-04",
  "ISC-05",
  "ISC-06",
  "IRV-01",
  "IRV-02",
  "IRV-03",
  "IRV-04",
  "IRV-05",
  "CRV-01",
  "CRV-03",
  "CRV-04",
  "CRV-05",
  "RBL-01",
  "RBL-02",
  "RBL-03",
  "CAL-01",
  "SET-01",
  "SET-02",
  "SET-04",
  "SET-05",
  "BKP-01",
  "BKP-02",
  "BKP-04"
];

/** Screens the Spec marks as reuse-only; they have no screenshot of their own. */
const REUSE_ONLY = [
  "CRV-02",
  "RBL-04",
  "IRV-06",
  "CRV-06",
  "CAL-02",
  "BKP-03",
  "BKP-05",
  "SET-03",
  "ISC-06"
];

const failures = [];

async function checkScreens() {
  for (const screen of REQUIRED_SCREENS) {
    const path = resolve(SCREENSHOT_DIRECTORY, `${screen}.png`);
    try {
      const info = await stat(path);
      // An empty or near-empty PNG means the screen rendered nothing worth capturing.
      if (info.size < 4096) failures.push(`${screen}_SCREENSHOT_TOO_SMALL`);
    } catch {
      failures.push(`${screen}_SCREENSHOT_MISSING`);
    }
  }
}

async function checkScreenCoverage() {
  const contract = await readFile(resolve("extension/src/v2/contract.ts"), "utf8");
  const declared = [...contract.matchAll(/"(SEM|CRS|ISC|IRV|CRV|RBL|CAL|SET|BKP)-\d\d"/g)].map(
    (match) => match[0].slice(1, -1)
  );
  const unique = [...new Set(declared)];
  for (const screen of unique) {
    if (REQUIRED_SCREENS.includes(screen) || REUSE_ONLY.includes(screen)) continue;
    failures.push(`${screen}_NOT_IN_SCREENSHOT_MANIFEST`);
  }
}

/** Every file of the shipped bundle, at the paths a reader of the archive would see. */
async function bundleFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory())
      files.push(...(await bundleFiles(join(directory, entry.name), relative)));
    else files.push(relative);
  }
  return files;
}

/**
 * The shipped bundle is checked file by file rather than at its two entry scripts: the E2E bridge
 * reached the archive once through a source map, which no entry-script check would have seen.
 */
async function checkShippedBundle() {
  for (const relative of await bundleFiles(resolve("extension", "dist"))) {
    const text = await readFile(resolve("extension", "dist", relative), "utf8");
    failures.push(...forbiddenHits(text, relative));
    if (KEY_SHAPE.test(text)) failures.push(`BUNDLE_HAS_KEY_SHAPE:${relative}`);
    if (relative.endsWith(".map")) failures.push(`BUNDLE_HAS_SOURCE_MAP:${relative}`);
  }
}

await checkScreens();
await checkScreenCoverage();
await checkShippedBundle();

if (failures.length > 0) {
  process.stderr.write(
    `Evidence inventory failed:\n${failures.map((item) => ` - ${item}`).join("\n")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Evidence inventory passed: ${String(REQUIRED_SCREENS.length)} screens captured, shipped bundle clean.\n`
  );
}
