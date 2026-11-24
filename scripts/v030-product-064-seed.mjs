/** Reuse the unchanged P063 source candidate in a fresh typography-only RC2 profile. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const before = JSON.parse(
  await fs.readFile("evidence/private/product-064/before/RC2_MANIFEST.json", "utf8")
);
const hash = (await fs.readFile("evidence/private/product-063/candidate-hash.txt", "utf8")).trim();
assert.equal(hash, before.candidateSHA256);
const child = spawn(
  process.execPath,
  [
    "scripts/v030-product-056-browser.mjs",
    "--diagnostic-ui",
    "--product-preview",
    "--human-gate5",
    `--candidate-repair=${hash}`,
    "--output-dir=evidence/private/product-064"
  ],
  { stdio: "inherit" }
);
await new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0 ? resolve() : reject(Error(`TYPOGRAPHY_SEED_EXIT_${code}`))
  );
});
