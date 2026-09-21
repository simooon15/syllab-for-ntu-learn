/**
 * Packages the version's delivery set into one zip: the formal documents, the acceptance records,
 * the final screenshots, and the installable extension package.
 *
 * Usage: node scripts/package-delivery.mjs   (run `npm run package` first)
 *
 * The archive mirrors the repository layout, so relative links inside the documents — notably the
 * Interaction & IA Spec's screenshots — resolve after unzipping instead of breaking.
 */
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { cp } from "node:fs/promises";
import { zipSync } from "fflate";

const version = JSON.parse(
  await readFile(resolve("extension", "public", "manifest.json"), "utf8")
).version;
const folderName = `Syllab-v${version}-delivery`;
const outputPath = resolve("artifacts", `Syllab_v${version}_delivery.zip`);
const extensionPackage = `artifacts/release/syllab-for-ntu-learn-v${version}.zip`;

/** Everything a reader of this delivery needs, at the path the documents expect. */
const contents = [
  "README.md",
  "PRD_v0.2.0.md",
  "PRODUCT_HANDOFF_v0.2.0.md",
  "Interaction_and_Information_Architecture_Spec_v0.2.0.md",
  `docs/versions/v${version}/TECHNICAL_DESIGN_v${version}.md`,
  `docs/versions/v${version}/IMPLEMENTATION_PLAN_v${version}.md`,
  `docs/versions/v${version}/DIRECTION_ADJUSTMENTS_v${version}.md`,
  // The visual contract, including the spacing scale. A reader comparing the screenshots against
  // the design needs the rules the screenshots are meant to satisfy.
  "docs/design-system.md",
  `docs/versions/v${version}/gate-1-core-loop-acceptance.md`,
  `docs/versions/v${version}/gate-2-release-acceptance.md`,
  `artifacts/gates/v${version}/gate-1/REPORT.md`,
  `artifacts/gates/v${version}/gate-1/report.json`,
  `artifacts/gates/v${version}/gate-2/REPORT.md`,
  `artifacts/gates/v${version}/gate-2/report.json`,
  extensionPackage,
  // The PRD embeds the Product Mark from this directory, and the SVG Master is the locked source
  // of the PNGs the extension ships. A delivery that omits it cannot show its own brand archive.
  "assets/logo"
];

async function walk(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walk(join(directory, entry.name), relative)));
    else files.push(relative);
  }
  return files;
}

const staging = await mkdtemp(join(tmpdir(), "syllab-delivery-"));
const root = join(staging, folderName);

// 1. Copy the set, failing loudly if a document a reader expects is missing.
const missing = [];
for (const relative of contents) {
  const target = join(root, relative);
  await mkdir(join(target, ".."), { recursive: true });
  try {
    await cp(resolve(relative), target, { recursive: true });
  } catch {
    missing.push(relative);
  }
}
const images = await walk(resolve(`docs/versions/v${version}/images`));
await mkdir(join(root, `docs/versions/v${version}/images`), { recursive: true });
await cp(
  resolve(`docs/versions/v${version}/images`),
  join(root, `docs/versions/v${version}/images`),
  { recursive: true }
);
if (missing.length > 0) {
  await rm(staging, { recursive: true, force: true });
  process.stderr.write(`Delivery is incomplete, missing: ${missing.join(", ")}\n`);
  process.exitCode = 1;
  throw new Error("DELIVERY_INCOMPLETE");
}

// 2. An index, because a folder of documents does not explain itself.
const index = `Syllab for NTU Learn — v${version} delivery
${"=".repeat(48)}

WHAT IS IN HERE

  artifacts/release/syllab-for-ntu-learn-v${version}.zip
      The extension itself, already built. Download this if you just want to use
      Syllab: unzip it and load the folder in Chrome (see README.md, or the
      HOW-TO-INSTALL.txt inside that zip). No Node, no build, no server.

  README.md
      Where to start, plus the Product Walkthrough built from the screenshots below.

FIRST-PRINCIPLE DOCUMENTS (what the product is)

  PRD_v${version}.md
  PRODUCT_HANDOFF_v${version}.md
  Interaction_and_Information_Architecture_Spec_v${version}.md
      The three formal sources: scope and model, locked AI behaviour, and screens.

TECHNICAL DELIVERY

  docs/versions/v${version}/TECHNICAL_DESIGN_v${version}.md
  docs/versions/v${version}/IMPLEMENTATION_PLAN_v${version}.md
      How it is built, and how the build was phased and verified.

  docs/design-system.md
      The visual contract: the spacing scale and what each step means, layout rhythm,
      typography, colour tokens, and the mechanical rules a test enforces. Read it
      before changing anything visual. The file paths it names are in the source
      repository, not in this archive.

ACCEPTANCE

  docs/versions/v${version}/gate-1-core-loop-acceptance.md
  docs/versions/v${version}/gate-2-release-acceptance.md
      The durable record of each Gate: what was verified, what still needs Product
      Judgment, and what is NOT TESTED.

  artifacts/gates/v${version}/gate-1/REPORT.md  (+ report.json)
  artifacts/gates/v${version}/gate-2/REPORT.md  (+ report.json)
      The machine-generated reports those records describe.

HOW THE VERSION CHANGED WHILE IT WAS BUILT

  docs/versions/v${version}/DIRECTION_ADJUSTMENTS_v${version}.md
      Every instruction and direction change the Product Owner added after work
      started, including the two corrections, with what each one changed.

EVIDENCE

  docs/versions/v${version}/images/
      ${images.length} final screenshots, captured from the real build by the automated
      browser path in \`npm run gate:2\`. They are the same files the Interaction &
      IA Spec embeds, so the document reads with its evidence in place.

BRAND

  assets/logo/
      The locked Product Mark. \`syllab-logo-master.svg\` is the single Master and the
      only source; the four PNGs are exports of it at the sizes the extension ships.
      Nothing in this set is redrawn, recoloured or regenerated.

HOW TO REPRODUCE EVERYTHING

  In the repository:  npm install && npm run ci && npm run gate:1 && npm run gate:2
  \`npm run gate:2\` rebuilds this extension package, re-captures these screenshots,
  backfills them into the Spec and README, and writes the Gate reports.
`;

/** The locked brand set: the SVG Master plus one PNG per size the extension ships. */
const logoFiles = [
  "assets/logo/syllab-logo-master.svg",
  "assets/logo/syllab-logo-16px.png",
  "assets/logo/syllab-logo-32px.png",
  "assets/logo/syllab-logo-48px.png",
  "assets/logo/syllab-logo-128px.png"
];
const missingLogo = [];
for (const relative of logoFiles) {
  try {
    await stat(resolve(relative));
  } catch {
    missingLogo.push(relative);
  }
}
if (missingLogo.length > 0) {
  await rm(staging, { recursive: true, force: true });
  process.stderr.write(`Delivery is missing brand assets: ${missingLogo.join(", ")}\n`);
  process.exitCode = 1;
  throw new Error("DELIVERY_BRAND_INCOMPLETE");
}
await writeFile(join(root, "00_DELIVERY_INDEX.md"), index);

// 3. Zip deterministically so two runs over the same tree produce the same archive.
const files = await walk(root);
const entries = {};
for (const relative of files) {
  entries[`${folderName}/${relative}`] = new Uint8Array(await readFile(join(root, relative)));
}
const archive = zipSync(entries, { level: 9, mtime: new Date("2026-01-01T00:00:00Z") });

await mkdir(resolve("artifacts"), { recursive: true });
await writeFile(outputPath, archive);
await rm(staging, { recursive: true, force: true });

const digest = createHash("sha256").update(archive).digest("hex");
const size = (await stat(outputPath)).size;
process.stdout.write(
  `Packaged the delivery set: ${String(files.length)} files into ${outputPath}\n` +
    `  folder in archive: ${folderName}/\n` +
    `  screenshots: ${String(images.length)}\n` +
    `  size: ${(size / 1024 / 1024).toFixed(1)} MiB\n` +
    `  sha256: ${digest}\n`
);
