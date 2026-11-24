/** Disposable QA surface only. Renders pending projection without writing trusted state. */
import fs from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
export async function buildProductPreview(root, extension, courseId, gate5 = false) {
  const label = gate5
    ? "RC2 CANDIDATE / HUMAN GATE 5 PENDING / NOT TRUSTED"
    : "UNVERIFIED PRODUCT PREVIEW / NOT RC2 / NOT TRUSTED";
  await fs.writeFile(
    join(extension, "preview.html"),
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="app.css"></head><body><aside id="preview-label"></aside><main id="app"></main><script type="module" src="preview.js"></script></body></html>'
  );
  await fs.writeFile(
    join(extension, "preview-review-label.js"),
    `const label=document.createElement("aside");label.id="preview-review-label";label.style.cssText="position:sticky;top:0;z-index:100;background:#fff1cf;padding:12px 20px;font:14px/1.5 sans-serif";label.textContent="${label} — 此隔离会话的 Confirm 仅用于测试，不是正式课程认可。 ";const link=document.createElement("a");link.href="preview.html";link.textContent="返回候选 Brief 预览";label.append(link);document.body.prepend(label);`
  );
  // Service-worker requests bypass Playwright page routes: disable fetch in the QA worker too.
  await fs.writeFile(
    join(extension, "preview-network-block.js"),
    'globalThis.fetch = async () => { throw new Error("P057_PREVIEW_NETWORK_DISABLED"); };'
  );
  const backgroundPath = join(extension, "background.js");
  const background = await fs.readFile(backgroundPath, "utf8");
  await fs.writeFile(backgroundPath, 'import "./preview-network-block.js";\n' + background);
  for (const name of ["app.html", "sidepanel.html"]) {
    const appPath = join(extension, name);
    const app = await fs.readFile(appPath, "utf8");
    await fs.writeFile(
      appPath,
      app.replace("</body>", '<script type="module" src="preview-review-label.js"></script></body>')
    );
  }
  await build({
    stdin: {
      resolveDir: root,
      contents: `
import {LocalStore} from "./extension/src/v2/store";
import {LocalDatabase} from "./extension/src/v2/storage";
import {ViewBuilder} from "./extension/src/v2/view";
import {renderCourse} from "./extension/src/v2/screens/course";
import {installPrintDisclosure} from "./extension/src/v2/screens/print";
installPrintDisclosure();
import {createUiState} from "./extension/src/v2/screens/patterns";
const surface=new URLSearchParams(location.search).get("surface")==="side-panel"?"side-panel":"full-page";
const id=${JSON.stringify(courseId)}, store=new LocalStore(new LocalDatabase(indexedDB));
const label=document.getElementById("preview-label");
label.style.cssText="position:sticky;top:0;z-index:100;background:#fff1cf;padding:12px 20px;border-bottom:2px solid #806200;font:14px/1.5 sans-serif";
label.textContent="${label} — 已保存真实模型候选及旧候选修复，未完成整课语义核验。此 Brief 是候选投影，不代表已认可事实。";
const link=document.createElement("a");link.textContent=" 打开实际 Initial Review";link.href=surface==="side-panel"?"sidepanel.html":"app.html";label.append(link);
link.addEventListener("click",async e=>{e.preventDefault();const r=await chrome.runtime.sendMessage({contract:2,type:"OPEN_SCREEN",surface,screen:"IRV-01",courseId:id});if(!r.ok)throw Error(r.error.code);location.href=surface==="side-panel"?"sidepanel.html":"app.html";});
const snapshot=await store.readSnapshot(id);if(!snapshot)throw Error("PREVIEW_SNAPSHOT_REQUIRED");
const settings=async()=>({apiKey:{state:"missing"},privacy:false,apiUsage:false,version:"0.3.0"});
const builder=new ViewBuilder({store,productVersion:"0.3.0",settings});
// QA-only in-memory projection parameter of the production builder. No Confirm or storage promotion.
const course=await builder.buildCourse(snapshot.course,undefined,snapshot);
const ui=createUiState(),runtime={hints:{},notice:undefined,error:undefined,restoreStage:undefined};
let view={surface,screen:"CRS-01",course,settings:await settings()};
const forbidden=()=>{runtime.notice={message:"候选 Brief 预览不保存修改；请到 Initial Review 在隔离资料中操作。"};paint();};
const actions={runtime,onMutation:forbidden,onOpenScreen:forbidden,onOpenSettings:forbidden,onOpenFullPage:forbidden,onExportCalendar:forbidden,onExportBackup:forbidden,onRestoreBackup:forbidden,onConfirmRestore:forbidden,onCancelRestore:forbidden,onSetApiKey:forbidden,onValidateApiKey:forbidden,onSetAuthorization:forbidden,onGrantPermission:forbidden,onHintSeen:()=>{},onNotify:n=>{runtime.notice=n;paint();},onDismissNotice:()=>{runtime.notice=undefined;paint();},onRetry:forbidden};
function paint(){const screen=ui.detailAssessmentId?"CRS-03":"CRS-01";view={...view,screen};document.getElementById("app").replaceChildren(renderCourse({view,surface,ui,actions,repaint:paint,open:forbidden},screen));}
paint();window.preview057={candidateProjection:true,trustedWrites:0,view};
`
    },
    bundle: true,
    platform: "browser",
    format: "esm",
    outfile: join(extension, "preview.js"),
    logLevel: "silent"
  });
}
