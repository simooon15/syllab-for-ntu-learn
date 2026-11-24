import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Pinned LibreOffice Embind bindings use static closures under MV3's no-JavaScript-eval CSP.
 * These adaptations follow Emscripten's DYNAMIC_EXECUTION=0 marshaling path. Package sources
 * stay untouched; build fails closed if an upstream anchor changes. */
function replaceSection(source, start, end, replacement) {
  const at = source.indexOf(start);
  const until = source.indexOf(end, at + start.length);
  if (at < 0 || until < 0 || source.indexOf(start, at + 1) >= 0) {
    throw new Error(`OFFICE_CSP_PATCH_ANCHOR:${start}`);
  }
  return source.slice(0, at) + replacement + source.slice(until);
}

export async function copyOfficeAssets(extensionRoot, outputDirectory) {
  const root = resolve(extensionRoot, "../node_modules/@matbee/libreoffice-converter");
  const metadata = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (metadata.version !== "2.7.2") throw new Error("OFFICE_UNQUALIFIED_VERSION");
  const target = resolve(outputDirectory, "office");
  await mkdir(target, { recursive: true });
  for (const name of ["soffice.wasm", "soffice.data", "soffice.worker.js"]) {
    await cp(resolve(root, "wasm", name), resolve(target, name));
  }
  let source = await readFile(resolve(root, "wasm/soffice.js"), "utf8");
  source = replaceSection(
    source,
    "function craftInvokerFunction(",
    "var heap32VectorToArray",
    `
function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc,isAsync){
if(isAsync)throwBindingError('Async bindings unsupported');
var method=argTypes[1]!==null&&classType!==null,count=argTypes.length-2,
stack=usesDestructorStack(argTypes),returns=argTypes[0].name!=='void';
return createNamedFunction(humanName,function(...args){
checkArgCount(args.length,getRequiredArgCount(argTypes),count,humanName,throwBindingError);
var destructors=[],wire=[cppTargetFunc],wired=[];
try{
if(method){wired[1]=argTypes[1].toWireType(destructors,this);wire.push(wired[1]);}
for(var i=0;i<count;i++){wired[i+2]=argTypes[i+2].toWireType(destructors,args[i]);wire.push(wired[i+2]);}
var rv=cppInvokerFunc(...wire);return returns?argTypes[0].fromWireType(rv):undefined;
}finally{if(stack)runDestructors(destructors);else for(var i=method?1:2;i<argTypes.length;i++){if(argTypes[i].destructorFunction!==null&&wired[i]!==undefined)argTypes[i].destructorFunction(wired[i]);}}
});}
`
  );
  source = replaceSection(
    source,
    "function __emval_get_method_caller(",
    "function __emval_get_property",
    `
function __emval_get_method_caller(argCount,argTypes,kind){
argTypes>>>=0;var types=emval_lookupTypes(argCount,argTypes),retType=types.shift();
return emval_addMethodCaller(function(obj,func,destructors,args){
var values=[];
for(var i=0;i<types.length;i++){values.push(types[i].readValueFromPointer(args));args+=GenericWireTypeSize;}
var rv=kind===1?Reflect.construct(func,values):func.call(obj,...values);
return retType.isVoid?undefined:emval_returnValue(retType,destructors,rv);
});}
`
  );
  if (source.includes("newFunc(Function")) throw new Error("OFFICE_DYNAMIC_BINDING_REMAINS");
  await writeFile(resolve(target, "soffice.js"), source);
  await cp(resolve(root, "dist/browser.worker.global.js"), resolve(target, "browser.worker.js"));
  await cp(resolve(extensionRoot, "public/licenses/MPL-2.0.txt"), resolve(target, "LICENSE"));
  await writeFile(
    resolve(target, "NOTICE.txt"),
    "@matbee/libreoffice-converter 2.7.2, MPL-2.0. Upstream distribution does not include a complete third-party notice inventory; release qualification must verify binary source and notices. soffice.js Embind invokers are adapted to static closures by extension/scripts/office-assets.mjs for Manifest V3 CSP. Modified source is included here.\n"
  );
}
