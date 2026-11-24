/** Parser-only measurement from explicitly acquired private bytes. No network, workflow, render or AI. */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const privateRoot = resolve("evidence/private/v030-parser-measurement");
const manifest = JSON.parse(await readFile(resolve(privateRoot, "FETCH_MANIFEST.json"), "utf8"));
if (manifest.length !== 19 || new Set(manifest.map((r) => r.sourceId)).size !== 19)
  throw Error("EXACT_MEASUREMENT_MANIFEST_MISMATCH");
await build({
  stdin: {
    contents: "export {parseDocument} from './extension/src/parser/index.ts';",
    resolveDir: process.cwd()
  },
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: ".tmp/v030-parser-measure-native.mjs"
});
const { parseDocument } = await import(resolve(".tmp/v030-parser-measure-native.mjs"));
const rows = [];
for (const row of manifest) {
  const sourceAlias = createHash("sha256").update(row.sourceId).digest("hex");
  const bytes = await readFile(resolve(privateRoot, sourceAlias + ".bin"));
  if (createHash("sha256").update(bytes).digest("hex") !== row.expectedContentHash)
    throw Error("MEASUREMENT_CONTENT_IDENTITY_MISMATCH:" + sourceAlias);
  const started = performance.now();
  const parsed = await parseDocument(new Uint8Array(bytes));
  if (!["parsed", "partial"].includes(parsed.status))
    throw Error("MEASUREMENT_PARSE_FAILED:" + sourceAlias + ":" + parsed.diagnosticsCode);
  const previous = new Map(row.oldUnits.map((u) => [u.locator, u]));
  const oldGap = (u) => !!u && (!!u.partial || !!u.visualGaps?.length);
  const newGaps = parsed.units.filter(oldGap);
  const nativeIdentityConserved =
    parsed.units.length === row.oldUnits.length &&
    parsed.units.every((u) => previous.get(u.locator)?.text === u.text);
  if (!nativeIdentityConserved)
    throw Error("MEASUREMENT_NATIVE_CONSERVATION_MISMATCH:" + sourceAlias);
  const triggerBreakdown = {};
  for (const u of newGaps)
    for (const cause of u.visualGaps ?? [])
      triggerBreakdown[cause] = (triggerBreakdown[cause] ?? 0) + 1;
  rows.push({
    sourceAlias,
    format: parsed.format,
    bytes: bytes.length,
    parserWallClockMs: performance.now() - started,
    nativeUnits: parsed.units.length,
    oldVisualGapUnits: row.oldUnits.filter(oldGap).length,
    visualGapUnits: newGaps.length,
    triggerBreakdown,
    nativeIdentityConserved,
    nativeCompleteAfterRepair: parsed.units
      .filter((u) => oldGap(previous.get(u.locator)) && !oldGap(u))
      .map((u) => u.locator),
    remainingGaps: newGaps.map((u) => ({ locator: u.locator, triggers: u.visualGaps ?? [] }))
  });
  await writeFile(
    resolve(privateRoot, "PARSER_RESULTS.json"),
    JSON.stringify(rows, null, 2) + "\n"
  );
  console.log(
    JSON.stringify({
      parsed: rows.length,
      nativeUnits: parsed.units.length,
      gaps: newGaps.length,
      nativeIdentityConserved
    })
  );
}
const report = {
  stage: "parser-only-real-measurement",
  attachments: rows.length,
  nativeUnits: rows.reduce((n, r) => n + r.nativeUnits, 0),
  oldVisualGapUnits: rows.reduce((n, r) => n + r.oldVisualGapUnits, 0),
  visualGapUnits: rows.reduce((n, r) => n + r.visualGapUnits, 0),
  newNativeCompleteUnits: rows.reduce((n, r) => n + r.nativeCompleteAfterRepair.length, 0),
  nativeIdentityConserved: rows.every((r) => r.nativeIdentityConserved),
  visionCalls: 0,
  modelCalls: 0,
  workflowStarted: false,
  rows
};
await mkdir("artifacts/v0.3.0/parser-measurement", { recursive: true });
await writeFile(
  "artifacts/v0.3.0/parser-measurement/REPORT.json",
  JSON.stringify(report, null, 2) + "\n"
);
console.log(
  JSON.stringify({
    attachments: report.attachments,
    nativeUnits: report.nativeUnits,
    oldGaps: report.oldVisualGapUnits,
    newGaps: report.visualGapUnits,
    nativeCompleteAfterRepair: report.newNativeCompleteUnits
  })
);
