import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/**
 * One source, two builds.
 *
 * `dist` is what a user installs. `dist-qa` is the same product with an observation layer added —
 * it runs the same Course, Review, Calendar and AI code, because it *is* that code. The two differ
 * only in which module the QA and acceptance imports resolve to, so a behaviour that passes in one
 * build is the behaviour of the other; there is no second implementation to drift.
 */
const qa = process.argv.includes("--qa") || process.env.SYLLAB_BUILD === "qa";
const outputDirectory = resolve(extensionRoot, qa ? "dist-qa" : "dist");
const metadataDirectory = resolve(extensionRoot, ".build-meta");
const backendBaseUrl = process.env.SYLLAB_BACKEND_URL ?? "http://127.0.0.1:8787";
/**
 * The acceptance bridge belongs to the QA build. It is what lets a Gate seed a scenario, so the
 * Gate runs need it and a shipped build must never have it.
 */
const e2eFixtures = qa;
/**
 * Source maps are a development opt-in, never part of a release.
 *
 * A map carries `sourcesContent` for every module esbuild *traversed*, not only the ones it
 * emitted. A release build elides the E2E fixture module from the code but still reads it, so its
 * full source — including the test-bridge marker — lands in `background.js.map`. Emitting no map
 * is what makes "the shipped archive contains no test-only source" true rather than argued.
 */
const sourceMaps = process.env.SYLLAB_SOURCEMAPS === "1";

/**
 * Swaps a module for an inert stub, so the real one is never read in the build that must not
 * contain it.
 *
 * Dead-code elimination cannot do this job. Swapping the module out means the module's graph is
 * never read, which is a property the bundler enforces rather than one that depends on how well
 * the tree shakes. Every stub exports the same names the real module does, and TypeScript still
 * checks against the real module, which is the one the build that uses it compiles.
 */
function dropFor(stub) {
  return {
    name: `drop-${stub}`,
    setup(build) {
      build.onResolve({ filter: new RegExp(`(?:^|/)${stub}$`) }, () => ({
        path: resolve(extensionRoot, "src/v2", `${stub}.disabled.ts`)
      }));
    }
  };
}

const dropQaTelemetry = dropFor("qa-telemetry");
const dropE2eFixtures = dropFor("e2e-fixtures");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const entries = [
  ["src/app/index.ts", "app.js", "esm"],
  ["src/background/index.ts", "background.js", "esm"],
  ["src/content/index.ts", "content.js", "iife"],
  ["src/page-bridge/index.ts", "page-bridge.js", "iife"],
  ["src/parser-worker/index.ts", "parser-worker.js", "iife"],
  ["src/offscreen/index.ts", "offscreen.js", "esm"]
];

/**
 * Which source files each bundle was built from.
 *
 * Written outside the output directory, because it is evidence about the build rather than part of
 * it. `scripts/verify-build-separation.mjs` compares the two builds' input sets: if the QA build
 * were ever produced by copying or forking product modules, the two sets would stop matching, and
 * that is a fact a build can prove about itself rather than a claim a document makes.
 */
const inputs = {};

for (const [entry, outfile, format] of entries) {
  const result = await build({
    entryPoints: [resolve(extensionRoot, entry)],
    outfile: resolve(outputDirectory, outfile),
    bundle: true,
    format,
    platform: "browser",
    target: "chrome120",
    /**
     * Syntax-level minification only — no identifier renaming, no whitespace stripping, so a stack
     * trace from a real user still names real functions.
     *
     * It is also what removes the QA layer from a shipped build. Every observation call site names
     * its event inline, so the call is real code in the QA build and a call into an empty function
     * in the release build; esbuild inlines that function away and the event name with it. Enabled
     * in every build so the QA bundle differs from the release bundle by the flag alone.
     */
    minifySyntax: true,
    sourcemap: sourceMaps,
    plugins: qa ? [] : [dropQaTelemetry, dropE2eFixtures],
    legalComments: "none",
    metafile: true,
    define: {
      __SYLLAB_BACKEND_URL__: JSON.stringify(backendBaseUrl),
      __SYLLAB_E2E_FIXTURES__: JSON.stringify(e2eFixtures)
    }
  });
  inputs[outfile] = Object.keys(result.metafile.inputs)
    .filter((file) => !file.endsWith(".css") && !file.includes("node_modules"))
    .map((file) => file.replace(/\\/g, "/").replace(/^(\.\.\/)+/, ""))
    .sort();
}

await mkdir(metadataDirectory, { recursive: true });
await writeFile(
  resolve(metadataDirectory, `${qa ? "dist-qa" : "dist"}.json`),
  `${JSON.stringify({ qa, inputs }, null, 2)}\n`
);

await cp(resolve(extensionRoot, "public/manifest.json"), resolve(outputDirectory, "manifest.json"));
await cp(resolve(extensionRoot, "public/fonts"), resolve(outputDirectory, "fonts"), {
  recursive: true
});
await cp(resolve(extensionRoot, "public/icons"), resolve(outputDirectory, "icons"), {
  recursive: true
});
await cp(resolve(extensionRoot, "sidepanel.html"), resolve(outputDirectory, "sidepanel.html"));
await cp(resolve(extensionRoot, "app.html"), resolve(outputDirectory, "app.html"));
await cp(resolve(extensionRoot, "offscreen.html"), resolve(outputDirectory, "offscreen.html"));
await cp(resolve(extensionRoot, "src/app/app.css"), resolve(outputDirectory, "app.css"));
await cp(
  resolve(extensionRoot, "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
  resolve(outputDirectory, "pdf.worker.mjs")
);
