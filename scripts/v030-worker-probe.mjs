/** Synthetic MV3 idle-window probe without attaching a debugger to the service worker. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function evaluate(target, expression) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(Error("PAGE_PROBE_TIMEOUT"));
    }, 10000);
    ws.addEventListener("message", (e) => {
      const x = JSON.parse(e.data);
      if (x.id === 1) {
        clearTimeout(timer);
        ws.close();
        if (x.result?.exceptionDetails) reject(Error(JSON.stringify(x.result.exceptionDetails)));
        else resolve(x.result?.result?.value);
      }
    });
    ws.send(
      JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: { expression, awaitPromise: true, returnByValue: true }
      })
    );
  });
}
await mkdir(".tmp", { recursive: true });
async function probe(guard) {
  const extension = await mkdtemp(resolve(".tmp/worker-probe-")),
    profile = await mkdtemp(resolve(".tmp/worker-profile-"));
  await writeFile(
    resolve(extension, "control.html"),
    "<!doctype html><title>Worker idle probe</title>"
  );
  await writeFile(
    resolve(extension, "manifest.json"),
    JSON.stringify({
      manifest_version: 3,
      name: "Syllab idle-window probe",
      version: "0.0.1",
      permissions: ["storage"],
      background: { service_worker: "worker.js" }
    })
  );
  await build({
    stdin: {
      resolveDir: process.cwd(),
      sourcefile: "worker-probe.ts",
      contents: `import {withActiveWorker} from './extension/src/v2/worker-lifecycle';
chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m.type!=='START')return false;const started=Date.now();const origin=performance.timeOrigin;
const operation=async()=>{await new Promise(r=>setTimeout(r,55_000));await chrome.storage.session.set({probe:{completed:true,elapsedMs:Date.now()-started,sameWorker:origin===performance.timeOrigin}});};
void (${guard ? "withActiveWorker(operation,()=>chrome.runtime.getPlatformInfo(),()=>undefined)" : "operation()"});reply({started:true});return false;});`
    },
    bundle: true,
    platform: "browser",
    outfile: resolve(extension, "worker.js")
  });
  const child = spawn(
    chromium.executablePath(),
    [
      `--user-data-dir=${profile}`,
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      "--remote-debugging-port=0",
      "--no-first-run",
      "--enable-unsafe-extension-debugging",
      "--no-default-browser-check",
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  let endpoint;
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      try {
        port = Number(
          (await readFile(resolve(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]
        );
        break;
      } catch {
        await pause(100);
      }
    }
    if (!port) throw Error("BROWSER_START_FAILED");
    const base = "http://127.0.0.1:" + port;
    endpoint = base;
    let worker;
    for (let i = 0; i < 100; i++) {
      worker = (await (await fetch(base + "/json/list")).json()).find(
        (t) =>
          t.type === "service_worker" &&
          t.url.startsWith("chrome-extension://") &&
          t.url.endsWith("/worker.js")
      );
      if (worker) break;
      await pause(100);
    }
    assert(worker, "worker loaded");
    const id = new URL(worker.url).host;
    const page = await (
      await fetch(
        base + "/json/new?" + encodeURIComponent("chrome-extension://" + id + "/control.html"),
        { method: "PUT" }
      )
    ).json();
    await pause(1000);
    assert.equal(
      (await evaluate(page, "chrome.runtime.sendMessage({type:'START'})")).started,
      true
    );
    // No worker debugger, no extension messages, no extension API polling during the operation.
    await pause(57_000);
    const outcome = await evaluate(page, "chrome.storage.session.get('probe')");
    return {
      guard,
      workerDebuggerAttached: false,
      fixtureLatencyMs: 55000,
      ...(outcome.probe ?? { completed: false })
    };
  } finally {
    if (endpoint) {
      try {
        const version = await (await fetch(endpoint + "/json/version")).json();
        const socket = new WebSocket(version.webSocketDebuggerUrl);
        await new Promise((r) => socket.addEventListener("open", r, { once: true }));
        socket.send(JSON.stringify({ id: 1, method: "Browser.close" }));
        await new Promise((r) => {
          socket.addEventListener("close", r, { once: true });
          setTimeout(r, 2000);
        });
      } catch {
        /* The isolated browser may have already closed. */
      }
    }
    if (child.exitCode === null) {
      const exited = new Promise((r) => child.once("exit", r));
      child.kill("SIGTERM");
      await exited;
    }
    await rm(extension, { recursive: true, force: true });
    await rm(profile, { recursive: true, force: true });
  }
}
const results = await Promise.all([probe(true), probe(false)]);
await mkdir("artifacts/v0.3.0/runtime-repair", { recursive: true });
await writeFile(
  "artifacts/v0.3.0/runtime-repair/WORKER.json",
  JSON.stringify({ results }, null, 2) + "\n"
);
assert.equal(results[0].completed, true);
assert.equal(results[0].sameWorker, true);
assert.equal(results[1].completed, false, "negative control must reproduce idle termination");
console.log(JSON.stringify({ status: "PASS", results }));
