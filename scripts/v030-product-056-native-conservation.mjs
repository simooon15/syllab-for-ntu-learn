/** Zero-paid scope proof over saved sources; no scan, model call or semantic certification. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const root = resolve(),
  priv = join(root, "evidence/private/gate5-remediation-056"),
  runs = join(priv, "product-real-1");
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
await build({
  stdin: {
    contents:
      'export {sourceUnits} from "./extension/src/v2/course-read";export {nativeDeliverySource} from "./extension/src/v2/native-delivery";export {withNativeRiskSources,planProductAudits} from "./extension/src/v2/product-audit";export {courseProductPacket,validateCourseProduct} from "./extension/src/v2/course-product";export {decodeDirectCapture} from "./extension/src/v2/direct-json";',
    resolveDir: root
  },
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: join(priv, "native-conservation-runtime.mjs"),
  logLevel: "silent"
});
const R = await import(pathToFileURL(join(priv, "native-conservation-runtime.mjs")));
const saved = await read(
  join(
    root,
    "evidence/private/goal-driven-052/continuation-054/selective-real-1/candidate-projected.json"
  )
);
const packet = R.courseProductPacket(saved.draft);
const capture = await read(
  join(runs, "7435eb3ffabe86b94a927ed42e6335c06d35aa459a6283017f3ed0f0d57fe4d2.json")
);
const product = R.validateCourseProduct(
  packet.decode(R.decodeDirectCapture(capture.raw).value),
  saved.draft
);
const audit = R.withNativeRiskSources(packet.input, saved.sources),
  tasks = R.planProductAudits(audit, packet.encode(product));
let units = 0,
  available = 0,
  unavailable = 0,
  characters = 0;
for (const source of saved.sources) {
  const native = R.nativeDeliverySource(source),
    actual = R.sourceUnits(native),
    inventory = audit.riskInventory.find((s) => s.sourceId === source.sourceId);
  assert(inventory);
  assert.equal(inventory.units.length, actual.length);
  for (const unit of actual) {
    units++;
    if (!unit.text.trim()) {
      unavailable++;
      continue;
    }
    available++;
    characters += unit.text.length;
  }
}
for (const evidence of audit.riskEvidenceCatalog.filter((e) => e.ref.startsWith("native:"))) {
  const spans = tasks
    .filter((t) => t.kind === "source")
    .flatMap((t) => t.payload.evidence)
    .filter((e) => e.ref === evidence.ref)
    .sort((a, b) => a.start - b.start);
  assert(spans.length);
  let end = 0;
  for (const span of spans) {
    assert.equal(span.start, end);
    assert.equal(span.total, evidence.excerpt.length);
    assert.equal(
      span.excerpt,
      evidence.excerpt.slice(
        Math.max(0, span.start - 512),
        Math.min(evidence.excerpt.length, span.end + 512)
      )
    );
    end = span.end;
  }
  assert.equal(end, evidence.excerpt.length);
}
assert.equal(
  audit.riskEvidenceCatalog.filter((e) => e.ref.startsWith("native:")).length,
  available
);
const proof = {
  sources: saved.sources.length,
  units,
  availableNativeUnits: available,
  unavailableNativeUnits: unavailable,
  nativeCharacters: characters,
  sourceTasks: tasks.filter((t) => t.kind === "source").length,
  totalTasks: tasks.length,
  fullTextWindowConservation: true,
  partialUnits: audit.riskInventory.flatMap((s) => s.units).filter((u) => u.partial).length,
  paidCalls: 0,
  nativeRescan: false,
  semanticAcceptance: false,
  visualUnderstandingVerified: false,
  productDeepPromptExpanded: false
};
await fs.writeFile(
  join(priv, "FULL_NATIVE_WINDOW_CONSERVATION.json"),
  JSON.stringify(proof, null, 2) + "\n"
);
console.log(JSON.stringify(proof));
