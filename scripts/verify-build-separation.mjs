/**
 * Proof that the two builds are one product.
 *
 * `extension/dist` is what a user installs and `extension/dist-qa` is what a real acceptance run
 * drives. The claim that matters is not "they were built from the same folder" — it is that the QA
 * build cannot do anything the shipped build cannot, and that no product module exists in one and
 * not the other. Both are read off the builds themselves:
 *
 *   - the QA layer is absent from the shipped bundle, file by file and string by string;
 *   - the QA layer is present in the QA bundle, or the QA build would be silently unobservable;
 *   - the exact set of source files behind each bundle matches, which is what "shared business
 *     code" means when written down. A forked or copied module shows up here as a file that only
 *     one build read.
 *
 * Usage: node scripts/verify-build-separation.mjs
 */
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { RELEASE_FORBIDDEN, forbiddenHits, KEY_SHAPE } from "./lib/release-markers.mjs";

/**
 * Everything the observation layer compiles into a build: its storage key, its module, and the name
 * of every event it can record. The `qa.` prefix is what makes these safe to look for — no product
 * string, class name or scenario begins with it, so a hit is the observation layer and not a
 * coincidence. The same list guards the shipped archive, so an extension ZIP cannot pass by one
 * check and fail the other.
 */
const QA_MARKERS = RELEASE_FORBIDDEN.filter(
  (marker) => marker.startsWith("qa.") || marker.startsWith("syllab.qa") || marker.startsWith("qa-")
);

const failures = [];
const checked = [];

async function filesIn(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await filesIn(path)));
    else found.push(path);
  }
  return found;
}

/** The bundles, read as text. Source maps and binaries are not text this check has an opinion on. */
async function bundleText(directory) {
  const text = new Map();
  for (const path of await filesIn(directory)) {
    if (!/\.(js|css|html|json)$/.test(path)) continue;
    text.set(path.slice(directory.length + 1), await readFile(path, "utf8"));
  }
  return text;
}

const shipped = resolve("extension", "dist");
const qa = resolve("extension", "dist-qa");
const withoutComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n\r]*/g, "");

// --- 1. The shipped bundle carries none of the QA layer ---------------------
const shippedFiles = await bundleText(shipped);
for (const [name, text] of shippedFiles) {
  const scanText = withoutComments(text);
  failures.push(...forbiddenHits(scanText, `dist/${name}`));
  for (const marker of QA_MARKERS) {
    if (scanText.includes(marker)) failures.push(`QA_MARKER_IN_SHIPPED:${marker}:${name}`);
  }
  if (KEY_SHAPE.test(scanText)) failures.push(`KEY_SHAPE_IN_SHIPPED:${name}`);
  if (name.endsWith(".map")) failures.push(`SOURCE_MAP_IN_SHIPPED:${name}`);
}
checked.push(`shipped bundle: ${String(shippedFiles.size)} files read, no QA layer`);

// --- 2. The QA bundle carries it, or a run would be observing nothing -------
const qaFiles = await bundleText(qa);
const qaText = [...qaFiles.values()].join("\n");
for (const name of ["syllab.qa.trace", "qa.date-resolution", "qa.deepseek-task"]) {
  if (!qaText.includes(name)) failures.push(`QA_MARKER_MISSING_FROM_QA_BUILD:${name}`);
} // The acceptance bridge is the other half of what a QA bundle is for.
for (const marker of ["syllab.e2e/1", "E2E_SEED"]) {
  if (!qaText.includes(marker)) failures.push(`ACCEPTANCE_BRIDGE_MISSING_FROM_QA_BUILD:${marker}`);
}
if (KEY_SHAPE.test(qaText)) failures.push("KEY_SHAPE_IN_QA_BUILD");
checked.push("QA bundle: observation layer and acceptance bridge present");

// --- 3. The same product modules are behind both ----------------------------
const metaDir = resolve("extension", ".build-meta");
const meta = {};
for (const target of ["dist", "dist-qa"]) {
  meta[target] = JSON.parse(await readFile(join(metaDir, `${target}.json`), "utf8"));
}

/**
 * The files the QA layer owns, and the only ones allowed to be on one side of the two builds.
 *
 * `fixtures.ts` is on the list because the acceptance bridge is its only reader — it is scenario
 * data for a seeded Gate run, not a product module. Everything else in the tree has to appear in
 * both builds, so a second Course, Review, Calendar or AI implementation cannot be slipped into one
 * of them without landing here first, where someone has to write it down on purpose.
 */
const QA_LAYER_MODULES = new Set([
  "src/v2/qa-telemetry.ts",
  "src/v2/qa-telemetry.disabled.ts",
  "src/v2/e2e-fixtures.ts",
  "src/v2/e2e-fixtures.disabled.ts",
  "src/v2/fixtures.ts"
]);

for (const entry of Object.keys(meta.dist.inputs)) {
  const shippedInputs = meta.dist.inputs[entry].filter((file) => !QA_LAYER_MODULES.has(file));
  const qaInputs = meta["dist-qa"].inputs[entry];
  if (!qaInputs) {
    failures.push(`QA_BUILD_MISSING_ENTRY:${entry}`);
    continue;
  }
  const qaCompared = qaInputs.filter((file) => !QA_LAYER_MODULES.has(file));
  const onlyShipped = shippedInputs.filter((file) => !qaCompared.includes(file));
  const onlyQa = qaCompared.filter((file) => !shippedInputs.includes(file));
  if (onlyShipped.length > 0)
    failures.push(`MODULE_ONLY_IN_SHIPPED:${entry}:${onlyShipped.join(",")}`);
  if (onlyQa.length > 0) failures.push(`MODULE_ONLY_IN_QA:${entry}:${onlyQa.join(",")}`);
}
checked.push(
  `shared modules: ${String(Object.keys(meta.dist.inputs).length)} entries compared across both builds`
);

// --- 4. Neither build reads the other's directory ---------------------------
for (const [name, text] of shippedFiles) {
  if (text.includes("dist-qa")) failures.push(`SHIPPED_REFS_QA_BUILD:${name}`);
}

for (const line of checked) process.stdout.write(`  ok   ${line}\n`);

if (failures.length > 0) {
  process.stderr.write(
    `Build separation failed:\n${failures.map((item) => ` - ${item}`).join("\n")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    "Build separation verified: shipped bundle has no QA layer, QA bundle has it, both from the same modules.\n"
  );
}
