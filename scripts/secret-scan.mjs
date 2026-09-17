import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([".git", ".spike-backups", "node_modules", "coverage"]);
const allowedExtensions = new Set([
  ".ts",
  ".js",
  ".mjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".html",
  ".css",
  ".example",
  ""
]);
const forbidden = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /DEEPSEEK_API_KEY[ \t]*=[ \t]*[^\s#][^\r\n]*/g,
  /Authorization:\s*Bearer\s+[A-Za-z0-9._~-]{16,}/gi
];

async function walk(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await walk(path)));
    else if (allowedExtensions.has(extname(entry.name))) paths.push(path);
  }
  return paths;
}

const findings = [];
for (const path of await walk(root)) {
  if (path.endsWith(".zip")) continue;
  const content = await readFile(path, "utf8");
  for (const pattern of forbidden) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push(`${relative(root, path)} matched ${pattern.source}`);
  }
}

if (findings.length > 0) {
  throw new Error(`Potential secret material found:\n${findings.join("\n")}`);
}
process.stdout.write("Secret scan passed.\n");
