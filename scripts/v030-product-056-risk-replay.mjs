/** Offline-only replay. Never imports a credential adapter or calls fetch. */
import fs from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const root = resolve(process.cwd());
const priv = join(root, "evidence/private/gate5-remediation-056");
const runs = join(priv, "product-real-1");
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
await build({
  stdin: {
    contents:
      'export * from "./extension/src/v2/course-product";export * from "./extension/src/v2/product-audit";export * from "./extension/src/v2/direct-json";',
    resolveDir: root
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(priv, "risk-runtime.mjs"),
  logLevel: "silent"
});
const R = await import(pathToFileURL(join(priv, "risk-runtime.mjs")));
const saved = await read(
  join(
    root,
    "evidence/private/goal-driven-052/continuation-054/selective-real-1/candidate-projected.json"
  )
);
const packet = R.courseProductPacket(saved.draft);
const captures = [];
for (const file of await fs.readdir(runs)) {
  if (!/^[a-f0-9]{64}\.json$/.test(file)) continue;
  const c = await read(join(runs, file));
  if (c.state === "captured" && c.streamDone && c.usage?.usageKnown) captures.push(c);
}
captures.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
const results = [];
for (const c of captures) {
  if (c.finishReason !== "stop") {
    results.push({ hash: c.bodySHA256, stage: c.stage, usable: false, reason: c.finishReason });
    continue;
  }
  try {
    const raw = packet.decode(R.decodeDirectCapture(c.raw).value);
    if (!raw.product && !raw.propositions) continue;
    const product = R.validateCourseProduct(raw, saved.draft);
    const tasks = R.planProductAudits(packet.input, packet.encode(product));
    const record = {
      hash: c.bodySHA256,
      usable: true,
      contractValid: true,
      semanticCertified: false,
      tasks: tasks.map((t) => ({
        taskRef: t.taskRef,
        kind: t.kind,
        requestBytes: Buffer.byteLength(JSON.stringify(t.payload)),
        maxTokens: t.maxTokens,
        checkedCount: t.checkedRefs.length
      })),
      totalOutputReserveTokens: tasks.reduce((s, t) => s + t.maxTokens, 0),
      nativeEvidenceCount: packet.input.evidenceCatalog.length
    };
    results.push(record);
    await fs.writeFile(
      join(priv, "bounded-candidate-replay.json"),
      JSON.stringify({ capturedHash: c.bodySHA256, product, tasks }, null, 2) + "\n",
      { mode: 0o600 }
    );
  } catch (e) {
    results.push({ hash: c.bodySHA256, usable: false, reason: e.message });
  }
}
const report = {
  paidCalls: 0,
  source: "saved authentic captures",
  modelQualityVerified: false,
  results
};
await fs.writeFile(join(priv, "RISK_REPLAY.json"), JSON.stringify(report, null, 2) + "\n", {
  mode: 0o600
});
console.log(
  JSON.stringify(
    results.map(({ tasks, ...r }) => ({
      ...r,
      ...(tasks
        ? { tasks: tasks.length, maxRequestBytes: Math.max(...tasks.map((t) => t.requestBytes)) }
        : {})
    })),
    null,
    2
  )
);
