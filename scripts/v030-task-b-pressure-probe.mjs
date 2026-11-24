// Historical-size streams in isolated Chrome; no real provider/course/workflow mutation.
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const input = process.argv[2];
if (!input?.startsWith("evidence/private/")) throw Error("PRIVATE_RECORDING_REQUIRED");
const recorded = JSON.parse(await readFile(input, "utf8"));
await build({
  stdin: {
    contents:
      "export {StreamTextRenderer,viewportProjection} from './extension/src/v2/stream-render'; export {archiveQaStream} from './extension/src/v2/qa-stream-archive';",
    resolveDir: process.cwd()
  },
  bundle: true,
  format: "iife",
  globalName: "Pressure",
  outfile: ".tmp/v030-024-pressure.js"
});
const server = createServer((_q, r) => r.end("<!doctype html><body></body>"));
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addScriptTag({ path: ".tmp/v030-024-pressure.js" });
  const proof = await page.evaluate(async ({ channels }) => {
    const renderers = channels.map(() => {
      const p = document.createElement("pre");
      p.style.cssText =
        "width:380px;max-height:160px;font:14px/20px monospace;white-space:pre-wrap";
      document.body.append(p);
      return {
        p,
        view: new globalThis.Pressure.StreamTextRenderer(
          p,
          (c) => requestAnimationFrame(c),
          (id) => cancelAnimationFrame(id),
          (s) => globalThis.Pressure.viewportProjection(p, s)
        )
      };
    });
    const physical = [];
    for (let index = 0; index < 4; index++) {
      const start = performance.now();
      renderers.forEach((r, i) => {
        r.view.clear();
        r.view.append(channels[i]);
        r.view.flush();
      });
      const snapshot = {
        streamId: `synthetic-physical-${index}`,
        system: "Synthetic",
        user: "{}",
        reasoning: renderers[0].view.contents(),
        content: renderers[1].view.contents(),
        finished: true
      };
      await globalThis.Pressure.archiveQaStream(snapshot);
      physical.push({
        reasoningChars: snapshot.reasoning.length,
        outputChars: snapshot.content.length,
        reasoningDOMChars: renderers[0].p.textContent.length,
        outputDOMChars: renderers[1].p.textContent.length,
        textNodes: renderers.map((r) => r.p.childNodes.length),
        renderAndArchiveMs: performance.now() - start
      });
    }
    const db = await new Promise((r, j) => {
      const q = indexedDB.open("syllab.qa.private-streams", 1);
      q.onsuccess = () => r(q.result);
      q.onerror = () => j(q.error);
    });
    const rows = await new Promise((r, j) => {
      const q = db.transaction("streams").objectStore("streams").getAll();
      q.onsuccess = () => r(q.result);
      q.onerror = () => j(q.error);
    });
    db.close();
    const fullRetained =
      rows.length === 4 &&
      rows.every((row) => row.reasoning === channels[0] && row.content === channels[1]);
    renderers[1].view.clear();
    const reasoningIndependent = renderers[0].view.contents() === channels[0];
    return {
      status:
        fullRetained &&
        reasoningIndependent &&
        physical.every(
          (p) =>
            p.textNodes.every((n) => n === 1) &&
            p.reasoningDOMChars < p.reasoningChars &&
            p.outputDOMChars < p.outputChars
        )
          ? "PASS"
          : "FAIL",
      kind: "historical-size/injected streams/native Chrome IDB",
      physical,
      fullRetained,
      reasoningIndependent,
      archiveRows: rows.length,
      models: 0,
      sourceCoverageReduction: 0
    };
  }, recorded);
  await mkdir("artifacts/v0.3.0/task-b-024", { recursive: true });
  await writeFile(
    "artifacts/v0.3.0/task-b-024/ACTIVITY-PRESSURE-GATE.json",
    JSON.stringify(proof, null, 2) + "\n"
  );
  console.log({
    status: proof.status,
    fullRetained: proof.fullRetained,
    archiveRows: proof.archiveRows,
    models: 0
  });
  if (proof.status !== "PASS") throw Error("PRESSURE_FAILED");
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
