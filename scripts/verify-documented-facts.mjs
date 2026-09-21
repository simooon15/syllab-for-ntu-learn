/**
 * Checks facts a document asserts about the implementation against the implementation itself.
 *
 * Two drifts prompted this:
 *
 *   - the Technical Design stated an IndexedDB version the code did not open, and nothing noticed,
 *     because a number written into prose has no way to fail;
 *   - a Gate record quoted a step count that the machine report disagreed with, because the count
 *     was written by hand instead of derived.
 *
 * Both are now read from their source of truth here, so a future change to either has to be made in
 * both places or fail.
 *
 * Usage: node scripts/verify-documented-facts.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const failures = [];

// --- The IndexedDB version the code opens vs the version the design states -------------------

const schemaSource = await readFile(resolve("extension", "src", "v2", "schema.ts"), "utf8");
const declared = /export const V2_DATABASE_VERSION = (\d+) as const;/.exec(schemaSource);
if (!declared) failures.push("CANNOT_READ_V2_DATABASE_VERSION");
const databaseVersion = declared?.[1] ?? "";

const design = await readFile(
  resolve("docs", "versions", "v0.2.0", "TECHNICAL_DESIGN_v0.2.0.md"),
  "utf8"
);
const stated = [...design.matchAll(/IndexedDB v(\d+)/g)].map((match) => match[1]);
if (stated.length === 0) failures.push("TECHNICAL_DESIGN_STATES_NO_INDEXEDDB_VERSION");
for (const version of new Set(stated)) {
  if (version !== databaseVersion) {
    failures.push(`TECHNICAL_DESIGN_SAYS_v${version}_CODE_IS_v${databaseVersion}`);
  }
}

// --- The step counts a Gate record renders vs the machine report it describes -----------------

const gatesDirectory = resolve("artifacts", "gates", "v0.2.0");
let checkedReports = 0;
let gatesPresent = true;
try {
  await readdir(gatesDirectory);
} catch {
  // No Gate has been run in this checkout, so there is no record to disagree with.
  gatesPresent = false;
}
for (const gate of gatesPresent ? await readdir(gatesDirectory, { withFileTypes: true }) : []) {
  if (!gate.isDirectory()) continue;
  let report;
  let markdown;
  try {
    report = JSON.parse(await readFile(resolve(gatesDirectory, gate.name, "report.json"), "utf8"));
    markdown = await readFile(resolve(gatesDirectory, gate.name, "REPORT.md"), "utf8");
  } catch {
    failures.push(`GATE_REPORT_UNREADABLE:${gate.name}`);
    continue;
  }
  const passed = report.steps.filter((step) => step.status === "PASS").length;
  const line = `- Steps executed: **${String(report.steps.length)}**, PASS **${String(
    passed
  )}**, FAIL **${String(report.steps.length - passed)}**`;
  if (!markdown.includes(line)) failures.push(`REPORT_MD_DISAGREES_WITH_JSON:${gate.name}`);
  // Every executed step has to be named in the rendered table too.
  for (const step of report.steps) {
    if (!markdown.includes(`| ${step.name} |`)) {
      failures.push(`STEP_MISSING_FROM_MARKDOWN:${gate.name}:${step.name}`);
    }
  }
  checkedReports += 1;
}
if (gatesPresent && checkedReports === 0) failures.push("NO_GATE_REPORTS_FOUND");

if (failures.length > 0) {
  process.stderr.write(
    `Documented facts failed:\n${failures.map((item) => ` - ${item}`).join("\n")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Documented facts check passed: Technical Design matches IndexedDB v${databaseVersion}, ${String(
      checkedReports
    )} Gate report(s) match their JSON.\n`
  );
}
