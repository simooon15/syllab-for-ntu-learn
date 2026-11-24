/** Synthetic MV3 qualification using the production runtime and exact pinned asset builder. */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";
import { copyOfficeAssets } from "../extension/scripts/office-assets.mjs";

const root = resolve(".tmp");
await mkdir(root, { recursive: true });
const extension = await mkdtemp(resolve(root, "office-qualification-"));
const profile = await mkdtemp(resolve(root, "office-profile-"));
await copyOfficeAssets(resolve("extension"), extension);
await build({
  stdin: {
    resolveDir: process.cwd(),
    sourcefile: "office-qa-worker.ts",
    contents: `
import {installQaTelemetryReceiver} from './extension/src/v2/qa-telemetry';
installQaTelemetryReceiver();
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{
if(message.type!=="START_OFFSCREEN_QUALIFICATION")return false;
chrome.offscreen.createDocument({url:"offscreen.html",reasons:["WORKERS"],justification:"Qualify production Office rendering in a hidden document"}).then(()=>reply({ok:true}),()=>reply({ok:false}));return true;
});`
  },
  bundle: true,
  platform: "browser",
  outfile: resolve(extension, "worker.js")
});
await writeFile(
  resolve(extension, "control.html"),
  "<!doctype html><title>Office qualification</title>"
);
await writeFile(
  resolve(extension, "offscreen.html"),
  '<script type="module" src="test.js"></script>'
);
await writeFile(
  resolve(extension, "manifest.json"),
  JSON.stringify({
    manifest_version: 3,
    permissions: ["offscreen", "storage"],
    name: "Syllab synthetic Office qualification",
    version: "0.0.1",
    background: { service_worker: "worker.js" },
    cross_origin_opener_policy: { value: "same-origin" },
    cross_origin_embedder_policy: { value: "require-corp" },
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
    }
  })
);
await build({
  stdin: {
    resolveDir: process.cwd(),
    sourcefile: "office-qualification.ts",
    contents: `
import { withOffice, canonicalizeOffice } from './extension/src/offscreen/office-runtime';
import { visualCompletion } from './extension/src/offscreen/visual-completion';
const encode = (text) => new TextEncoder().encode(text);
const ns = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"';
const inputs = [
  ['doc', 'docx', 'sample.rtf', encode('{\\\\rtf1\\\\ansi Synthetic assessment 40 percent}')],
  ['xls', 'xlsx', 'sample.fods', encode('<?xml version="1.0"?><office:document '+ns+' xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet"><office:body><office:spreadsheet><table:table table:name="Assessment"><table:table-row><table:table-cell office:value-type="string"><text:p>Weight 40 percent</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet></office:body></office:document>')],
  ['ppt', 'pptx', 'sample.fodp', encode('<?xml version="1.0"?><office:document '+ns+' xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.presentation"><office:body><office:presentation><draw:page draw:name="Slide 1"><draw:frame><draw:text-box><text:p>Assessment 40 percent</text:p></draw:text-box></draw:frame></draw:page></office:presentation></office:body></office:document>')]
];
window.result = { status: 'running' };
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{if(message.type!=="OFFSCREEN_QUALIFICATION_STATUS")return false;reply(window.result);return false;});
(async () => {
 const checks = [];
 try {
  for (const [legacy, modern, name, input] of inputs) {
   const original = await withOffice((office) => office.convert(input, {outputFormat:legacy}, name));
   const canonical = await canonicalizeOffice(original.data, 'legacy-'+legacy);
   if (!canonical.byteLength) throw Error('EMPTY_CANONICAL');
   const rendered = await withOffice((office) => office.renderPageFullQuality(canonical, {inputFormat:modern}, 0, {dpi:144,maxDimension:2400}));
   if (rendered.width < 1 || rendered.height < 1 || Math.max(rendered.width,rendered.height) > 2400 || rendered.data.length !== rendered.width*rendered.height*4) throw Error('RENDER_BOUNDS');
   const locator = modern === 'pptx' ? 'slide:1' : modern === 'xlsx' ? 'sheet:1:visual' : 'paragraph:1';
   const visual = await visualCompletion(canonical, modern, [{locator,text:modern === 'docx' ? 'Synthetic assessment 40 percent' : '',partial:true,visualGaps:['synthetic-render-gap']}]);
   if (!visual.parts.length || visual.unresolved.length || !visual.parts.every(part => part.dataUrl.startsWith('data:image/png;base64,'))) throw Error('VISUAL_COVERAGE');
   checks.push({format:legacy,originalBytes:original.data.length,canonicalBytes:canonical.length,width:rendered.width,height:rendered.height,visualParts:visual.parts.length});
  }
  window.result = {status:'PASS',synthetic:true,checks};
 } catch (error) { window.result = {status:'FAIL',synthetic:true,checks,error:String(error)}; }
})();
`
  },
  outfile: resolve(extension, "test.js"),
  bundle: true,
  format: "esm",
  platform: "browser"
});
// PDF.js's worker is the same local asset used by the production offscreen renderer.
const { cp } = await import("node:fs/promises");
await cp(
  resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
  resolve(extension, "pdf.worker.mjs")
);
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`chrome-extension://${new URL(worker.url()).host}/control.html`);
  const started = await page.evaluate(() =>
    chrome.runtime.sendMessage({ type: "START_OFFSCREEN_QUALIFICATION" })
  );
  assert.equal(started.ok, true);
  let result;
  const deadline = Date.now() + 300_000;
  do {
    result = await page.evaluate(() =>
      chrome.runtime.sendMessage({ type: "OFFSCREEN_QUALIFICATION_STATUS" })
    );
    if (["PASS", "FAIL"].includes(result?.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  } while (Date.now() < deadline);
  assert.ok(["PASS", "FAIL"].includes(result?.status), "Offscreen qualification timed out");
  const waits = await page.evaluate(async () => {
    const stored = await chrome.storage.session.get("syllab.qa.trace");
    return (stored["syllab.qa.trace"] ?? [])
      .filter((e) => e.event === "qa.runtime-wait" && e.fields.kind === "office")
      .map((e) => e.fields.waitMs);
  });
  assert(waits.length > 0, "Offscreen queue metadata must reach the background writer");
  result.officeWaitMs = waits;
  const output = resolve("artifacts/v0.3.0/office");
  await mkdir(output, { recursive: true });
  await writeFile(
    resolve(output, "REPORT.json"),
    JSON.stringify({ ...result, errors }, null, 2) + "\n"
  );
  assert.equal(result.status, "PASS", result.error ?? "Office qualification failed");
  assert.deepEqual(errors, []);
  console.log(`Office MV3 qualification passed (${result.checks.length} synthetic formats).`);
} finally {
  await context.close();
  await rm(extension, { recursive: true, force: true });
  await rm(profile, { recursive: true, force: true });
}
