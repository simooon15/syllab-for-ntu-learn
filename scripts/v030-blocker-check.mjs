// Offline browser blockers only: synthetic archives and streams, no provider or course workflow.
import { build } from "esbuild";
import { chromium } from "playwright";
import { zipSync, strToU8 } from "fflate";
import { writeFile, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const background = await readFile("extension/src/background/index.ts", "utf8");
for (const type of [
  "E2E_CLEAN_REBUILD",
  "E2E_PROVIDER_PROGRESS",
  "E2E_RETRIEVAL_EVALUATE",
  "E2E_TRIAGE_EVALUATE"
])
  assert.equal(
    background.split(`message.type ${type === "E2E_CLEAN_REBUILD" ? "!==" : "==="} "${type}"`)
      .length - 1,
    1,
    `SINGLE_QA_HANDLER:${type}`
  );
const code = await build({
  stdin: {
    contents: `import * as parser from './extension/src/parser/runtime'; import { StreamTextRenderer } from './extension/src/v2/stream-render'; globalThis.__blocker = { ...parser, StreamTextRenderer };`,
    resolveDir: process.cwd()
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser"
});
const fixtures = [
  [
    "docx",
    "word/document.xml",
    "<w:document><w:body><w:p><w:r><w:t>Office probe</w:t></w:r></w:p></w:body></w:document>",
    "wordprocessingml",
    "paragraph:1"
  ],
  [
    "pptx",
    "ppt/slides/slide1.xml",
    "<p:sld><a:t>Office probe</a:t><p:pic/></p:sld>",
    "presentationml",
    "slide:1"
  ],
  [
    "xlsx",
    "xl/worksheets/sheet1.xml",
    '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Office probe</t></is></c></row></sheetData></worksheet>',
    "spreadsheetml",
    "sheet:1:row:1"
  ]
].map(([format, path, xml, type, locator]) => ({
  format,
  locator,
  bytes: Array.from(
    zipSync({ "[Content_Types].xml": strToU8(`<Types>${type}</Types>`), [path]: strToU8(xml) })
  )
}));
const browser = await chromium.connectOverCDP("http://127.0.0.1:9440");
try {
  const page = browser
    .contexts()[0]
    .pages()
    .find((p) =>
      p.url().startsWith("chrome-extension://jinfkigclgmeopkpkgfegnhgehaefibj/app.html")
    );
  assert(page, "QA_APP_REQUIRED");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(code.outputFiles[0].text);
  const result = await page.evaluate(async (fixtures) => {
    const { parseInIsolatedWorker, extractInIsolatedWorker, StreamTextRenderer } =
      globalThis.__blocker;
    let creates = 0,
      terminations = 0;
    const factory = () => {
      const worker = new Worker(chrome.runtime.getURL("parser-worker.js"));
      creates++;
      const end = worker.terminate.bind(worker);
      worker.terminate = () => {
        terminations++;
        end();
      };
      return worker;
    };
    globalThis.__probePhase = "valid archives";
    const parsed = await Promise.all(
      fixtures.map(async (f) => ({
        expected: f.format,
        locator: f.locator,
        result: await parseInIsolatedWorker(new Uint8Array(f.bytes), factory)
      }))
    );
    globalThis.__probePhase = "corrupt archive";
    let corrupt = false,
      crash = false,
      cancel = false;
    try {
      await extractInIsolatedWorker(new Uint8Array([80, 75, 3, 4, 0]), ["bad"], factory);
    } catch (e) {
      corrupt = e.message === "PARSER_WORKER_FAILED";
    }
    try {
      await parseInIsolatedWorker(
        new Uint8Array([1]),
        () => new Worker(chrome.runtime.getURL("deliberately-missing-worker.js"))
      );
    } catch (e) {
      crash = e.message === "PARSER_WORKER_CRASH";
    }
    globalThis.__probePhase = "cancel";
    const control = new AbortController();
    const pending = parseInIsolatedWorker(new Uint8Array(fixtures[0].bytes), factory, {
      signal: control.signal
    });
    control.abort();
    try {
      await pending;
    } catch (e) {
      cancel = e.name === "AbortError";
    }
    const after = await parseInIsolatedWorker(new Uint8Array(fixtures[0].bytes), factory);
    globalThis.__probePhase = "stream";
    const target = document.createElement("pre");
    target.style.cssText = "height:100px;overflow:auto;white-space:pre-wrap";
    document.body.append(target);
    const frames = new Map();
    let counter = 0,
      layoutReads = 0;
    Object.defineProperty(target, "scrollHeight", {
      configurable: true,
      get() {
        layoutReads++;
        return 1000;
      }
    });
    const view = new StreamTextRenderer(
      target,
      (callback) => {
        frames.set(++counter, callback);
        return counter;
      },
      (id) => frames.delete(id)
    );
    const reasoning = "reasoning line\n".repeat(100),
      output = '{"sourceId":"synthetic"}\n'.repeat(100);
    const target2 = document.createElement("pre");
    document.body.append(target2);
    const out = new StreamTextRenderer(
      target2,
      (callback) => {
        frames.set(++counter, callback);
        return counter;
      },
      (id) => frames.delete(id)
    );
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      view.append(reasoning);
      out.append(output);
    }
    const pendingFrames = frames.size;
    view.flush();
    out.flush();
    const lengths = [view.contents().length, out.contents().length];
    const nodes = [target.childNodes.length, target2.childNodes.length];
    target.scrollTop = 50;
    const scroll = target.scrollTop;
    view.setVisible(false);
    view.append("closed delta");
    const hidden = view.contents().endsWith("closed delta");
    view.setVisible(true);
    const reopened = target.textContent.endsWith("closed delta");
    view.clear();
    out.clear();
    const cleared = view.contents() === "" && out.contents() === "" && frames.size === 0;
    view.dispose();
    out.dispose();
    const disposed = target.childNodes.length === 0 && target2.childNodes.length === 0;
    target.remove();
    target2.remove();
    return {
      parsed,
      corrupt,
      crash,
      cancel,
      otherSource: after.status,
      creates,
      terminations,
      stream: {
        deltaCount: 20000,
        lengths,
        expected: [reasoning.length * 10000, output.length * 10000],
        nodes,
        pendingFrames,
        layoutReads,
        scroll,
        hidden,
        reopened,
        cleared,
        disposed,
        durationMs: performance.now() - start,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches
      }
    };
  }, fixtures);
  for (const f of result.parsed) {
    assert.equal(f.result.format, f.expected);
    assert.equal(f.result.units[0].locator, f.locator);
    assert(f.result.units[0].text.includes("Office probe"));
  }
  assert(result.parsed.find((f) => f.expected === "pptx").result.units[0].partial);
  for (const k of ["corrupt", "crash", "cancel"]) assert(result[k], k);
  assert.equal(result.creates, result.terminations);
  assert.equal(result.otherSource, "parsed");
  assert.deepEqual(result.stream.lengths, result.stream.expected);
  assert.deepEqual(result.stream.nodes, [1, 1]);
  assert.equal(result.stream.pendingFrames, 2);
  assert.equal(result.stream.layoutReads, 0);
  for (const k of ["hidden", "reopened", "cleared", "disposed", "reducedMotion"])
    assert(result.stream[k], k);
  await writeFile(
    ".tmp/v030-015-browser-blockers.json",
    JSON.stringify({ status: "PASS", ...result }, null, 2)
  );
  console.log(
    JSON.stringify({
      status: "PASS",
      archives: 3,
      corrupt: result.corrupt,
      crash: result.crash,
      cancel: result.cancel,
      stream: result.stream
    })
  );
} finally {
  await browser.close();
}
