import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(extensionRoot, "dist");
const backendBaseUrl = process.env.SYLLAB_BACKEND_URL ?? "http://127.0.0.1:8787";

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const entries = [
  ["src/popup/index.ts", "popup.js", "esm"],
  ["src/background/index.ts", "background.js", "esm"],
  ["src/content/index.ts", "content.js", "iife"],
  ["src/page-bridge/index.ts", "page-bridge.js", "iife"],
  ["src/parser-worker/index.ts", "parser-worker.js", "iife"],
  ["src/offscreen/index.ts", "offscreen.js", "esm"]
];

for (const [entry, outfile, format] of entries) {
  await build({
    entryPoints: [resolve(extensionRoot, entry)],
    outfile: resolve(outputDirectory, outfile),
    bundle: true,
    format,
    platform: "browser",
    target: "chrome120",
    sourcemap: true,
    legalComments: "none",
    define: { __SYLLAB_BACKEND_URL__: JSON.stringify(backendBaseUrl) }
  });
}

await cp(resolve(extensionRoot, "public/manifest.json"), resolve(outputDirectory, "manifest.json"));
await cp(resolve(extensionRoot, "public/fonts"), resolve(outputDirectory, "fonts"), {
  recursive: true
});
await cp(resolve(extensionRoot, "popup.html"), resolve(outputDirectory, "popup.html"));
await cp(resolve(extensionRoot, "offscreen.html"), resolve(outputDirectory, "offscreen.html"));
await cp(resolve(extensionRoot, "src/popup/popup.css"), resolve(outputDirectory, "popup.css"));
await cp(
  resolve(extensionRoot, "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
  resolve(outputDirectory, "pdf.worker.mjs")
);
