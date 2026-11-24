/** Recreate only the authorized private RC2 candidate in a fresh network-disabled profile. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const hash = (await fs.readFile("evidence/private/product-063/candidate-hash.txt", "utf8")).trim();
assert(/^[a-f0-9]{64}$/.test(hash));
const child = spawn(
  process.execPath,
  [
    "scripts/v030-product-056-browser.mjs",
    "--diagnostic-ui",
    "--product-preview",
    "--human-gate5",
    `--candidate-repair=${hash}`,
    "--output-dir=evidence/private/product-063"
  ],
  { stdio: "inherit" }
);
await new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", (code) => (code === 0 ? resolve() : reject(Error(`RC2_SEED_EXIT_${code}`))));
});
