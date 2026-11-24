/** Controlled hidden MV3 PDF pipeline. Synthetic inputs and mock provider; no course or credential. */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, cp } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";
function makePdf(pageTexts) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageTexts.map((_, index) => `${String(3 + index)} 0 R`).join(" ")}] /Count ${String(pageTexts.length)} >>`
  ];
  const fontObject = 3 + pageTexts.length;
  const firstStreamObject = fontObject + 1;
  for (const [index] of pageTexts.entries()) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${String(fontObject)} 0 R >> >> /Contents ${String(firstStreamObject + index)} 0 R >>`
    );
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  for (const text of pageTexts) {
    const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
    objects.push(`<< /Length ${String(stream.length)} >>\nstream\n${stream}\nendstream`);
  }
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${String(index + 1)} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xref)}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

const bytes = Array.from(
  makePdf(["Synthetic page one", "Synthetic page two", "Synthetic page three"])
);
await mkdir(".tmp", { recursive: true });
const extension = await mkdtemp(resolve(".tmp/runtime-probe-"));
const profile = await mkdtemp(resolve(".tmp/runtime-profile-"));
await writeFile(
  resolve(extension, "worker.js"),
  `chrome.runtime.onMessage.addListener((m,s,r)=>{if(m.type!=='START')return false;chrome.offscreen.createDocument({url:'test.html',reasons:['WORKERS'],justification:'Controlled synthetic pipeline probe'}).then(()=>r({ok:true}),()=>r({ok:false}));return true;});`
);
await writeFile(
  resolve(extension, "control.html"),
  "<!doctype html><title>Syllab runtime probe</title>"
);
await writeFile(resolve(extension, "test.html"), '<script type="module" src="test.js"></script>');
await writeFile(
  resolve(extension, "manifest.json"),
  JSON.stringify({
    manifest_version: 3,
    name: "Syllab runtime probe",
    version: "0.0.1",
    permissions: ["offscreen"],
    background: { service_worker: "worker.js" }
  })
);
await cp(
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  resolve(extension, "pdf.worker.mjs")
);
await build({
  stdin: {
    resolveDir: process.cwd(),
    sourcefile: "runtime-probe.ts",
    contents: `
import {visualCompletion} from './extension/src/offscreen/visual-completion';
import {schedulePackages} from './extension/src/v2/package-scheduler';
import {buildTaskACalls} from './extension/src/v2/ai-pipeline';
import {planChunks} from './extension/src/v2/chunking';
import {DeepSeekTransport} from './extension/src/v2/deepseek';
import {ActivityHub} from './extension/src/v2/activity';
const bytes = new Uint8Array(${JSON.stringify(bytes)});
window.result={status:'running'};
chrome.runtime.onMessage.addListener((m,s,r)=>{if(m.type!=='STATUS')return false;r(window.result);return false;});
const events=[]; const counts={package:0,render:0,ai:0};const peak={package:0,render:0,ai:0};
const span=(kind,id)=>{events.push({kind,id,phase:'start',at:performance.now()});peak[kind]=Math.max(peak[kind],++counts[kind]);return()=>{counts[kind]--;events.push({kind,id,phase:'end',at:performance.now()});};};
(async()=>{try{
const units=[1,2,3].map(i=>({locator:'page:'+i,text:'Synthetic page '+i,partial:true,visualGaps:['probe']}));
const receipts=[];
const transport = new DeepSeekTransport(async (_url,init)=>{
 const body=JSON.parse(init.body); const user=body.messages[1].content;
 const id=JSON.parse(user[0].text).source.sourceId;
 const end=span('ai',id);
 await new Promise(r=>setTimeout(r,1200));
 end();
 return new Response(JSON.stringify({choices:[{message:{content:'{}'},finish_reason:'stop'}]}),{headers:{'content-type':'application/json'}});
});
const started=performance.now();
await schedulePackages([0,1,2,3,4,5],async(index)=>{
 const id='probe-'+index,endPackage=span('package',id),endRender=span('render',id);
 let rendered;
 try{rendered=await visualCompletion(bytes,'pdf',units);}finally{endRender();}
 if(rendered.unresolved.length||rendered.parts.length!==3)throw Error('VISUAL_CONSERVATION');
 const text=units.map(u=>u.locator+'\\n'+u.text).join('\\n');
 const source={sourceId:id,sourceType:'attachment',title:'Synthetic',text,structure:units.map(u=>u.locator),pageImages:rendered.parts};
 const calls=buildTaskACalls({source,course:{courseCode:'TEST',courseName:'Probe'},chunks:planChunks({sourceId:id,text,structure:source.structure})});
 for(const call of calls)await transport.complete('',call);
 receipts.push({id,pages:rendered.parts.map(p=>p.locator),calls:calls.length,textConserved:calls.every(c=>JSON.parse(c.user).content===text)});
 endPackage();
},{initialConcurrency:3,maxConcurrency:3});
const activity=new ActivityHub();let view=[];activity.subscribe((_s,v)=>view=v.snippets);activity.start('synthetic',{courseId:'probe',workflowId:'probe',task:'A'},'');activity.delta('synthetic','Comparing assessment requirements.','reasoning');activity.delta('synthetic','{"sourceId":"private","drafts":[]}','content');await new Promise(r=>setTimeout(r,250));const reasoningRetained=view.includes('Comparing assessment requirements.');activity.end('synthetic');
const lifecycleReleased=receipts.every(r=>events.find(e=>e.id===r.id&&e.kind==='render'&&e.phase==='end').at<=events.find(e=>e.id===r.id&&e.kind==='ai'&&e.phase==='start').at);
const overlap=events.some(e=>e.kind==='render'&&e.phase==='start'&&events.some(a=>a.kind==='ai'&&a.phase==='start'&&a.at<e.at&&events.find(b=>b.kind==='ai'&&b.phase==='end'&&b.id===a.id).at>e.at));
window.result={status:peak.package===3&&peak.ai>1&&lifecycleReleased&&overlap&&reasoningRetained&&receipts.every(r=>r.textConserved)?'PASS':'FAIL',synthetic:true,provider:'mock',wallClockMs:performance.now()-started,peak,lifecycleReleased,renderAiOverlap:overlap,reasoningRetained,receipts,events};
}catch(error){window.result={status:'FAIL',error:String(error),events};}})();
`
  },
  outfile: resolve(extension, "test.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  define: { __SYLLAB_QA__: "false", __SYLLAB_E2E_FIXTURES__: "false" }
});
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const page = await context.newPage();
  await page.goto(`chrome-extension://${new URL(worker.url()).host}/control.html`);
  assert.equal((await page.evaluate(() => chrome.runtime.sendMessage({ type: "START" }))).ok, true);
  let result;
  const deadline = Date.now() + 60_000;
  do {
    result = await page.evaluate(() => chrome.runtime.sendMessage({ type: "STATUS" }));
    if (["PASS", "FAIL"].includes(result?.status)) break;
    await new Promise((r) => setTimeout(r, 250));
  } while (Date.now() < deadline);
  await mkdir("artifacts/v0.3.0/runtime-repair", { recursive: true });
  await writeFile(
    "artifacts/v0.3.0/runtime-repair/REPORT.json",
    JSON.stringify(result, null, 2) + "\n"
  );
  assert.equal(result?.status, "PASS", result?.error ?? JSON.stringify(result));
  console.log(JSON.stringify({ ...result, events: undefined, receipts: undefined }));
} finally {
  await context.close();
  await rm(extension, { recursive: true, force: true });
  await rm(profile, { recursive: true, force: true });
}
