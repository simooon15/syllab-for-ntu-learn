/**
 * Builds the distributable extension package: a zip that a user can download from GitHub, unzip,
 * and load in Chrome with "Load unpacked" — no build step on their side.
 *
 * Usage: node scripts/package-extension.mjs
 *
 * The package is produced from a shipping build (no E2E bridge), and the script refuses to write a
 * zip whose bundle could not be handed to a stranger: a test hook or a key-shaped string fails it.
 */
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { zipSync } from "fflate";
import { readdir } from "node:fs/promises";

import { KEY_SHAPE, forbiddenHits } from "./lib/release-markers.mjs";

const manifest = JSON.parse(
  await readFile(resolve("extension", "public", "manifest.json"), "utf8")
);
const version = manifest.version;
const folderName = `Syllab-v${version}`;
const outputPath = resolve("artifacts", "release", `syllab-for-ntu-learn-v${version}.zip`);
const dist = resolve("extension", "dist");

function run(command, args, env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env: { ...process.env, ...env }
    });
    child.on("error", rejectRun);
    child.on("exit", (code) =>
      code === 0 ? resolveRun() : rejectRun(new Error(`${command} exited ${String(code)}`))
    );
  });
}

/** Every file under `directory`, as paths relative to it. */
async function walk(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walk(join(directory, entry.name), relative)));
    else files.push(relative);
  }
  return files;
}

// 1. Ship the real thing: a build without the deterministic E2E bridge.
await run("npm", ["run", "build", "-w", "@syllab/extension"], { SYLLAB_E2E_FIXTURES: "0" });

// 2. Refuse to package something that is not fit to hand out. Every file in the bundle is read,
//    not just the two entry scripts: a source map carries the source of modules the bundle elided,
//    so a leak can sit in a file nobody thinks of as executable.
const bundledFiles = await walk(dist);
const leaks = [];
for (const relative of bundledFiles) {
  const bytes = new Uint8Array(await readFile(join(dist, relative)));
  const text = Buffer.from(bytes).toString("utf8");
  leaks.push(...forbiddenHits(text, relative));
  if (KEY_SHAPE.test(text)) leaks.push(`KEY_SHAPE:${relative}`);
  if (relative.endsWith(".map")) leaks.push(`SOURCE_MAP:${relative}`);
}
if (leaks.length > 0) {
  throw new Error(`Refusing to package:\n${leaks.map((leak) => ` - ${leak}`).join("\n")}`);
}

// 3. Collect the bundle under one top-level folder, so unzipping does not scatter files.
const staging = await mkdtemp(join(tmpdir(), "syllab-package-"));
const root = join(staging, folderName);
await cp(dist, root, { recursive: true });

const readme = `Syllab for NTU Learn — v${version}
${"=".repeat(40)}

This folder is the whole extension, already built. Nothing else is needed to try it:
you do not have to install Node, run a build, or run any server.

INSTALL (about 60 seconds)

1. Unzip this folder somewhere you will keep it. Do not delete it afterwards —
   Chrome loads the extension from this folder every time it starts.

2. Open Chrome and go to:   chrome://extensions

3. Turn on "Developer mode" (top-right corner).

4. Click "Load unpacked" and choose THIS folder (the one containing manifest.json).

5. Pin Syllab to the toolbar (puzzle-piece icon -> pin).

FIRST USE

6. Open your NTU Learn course page and click the Syllab mark in the toolbar.
   The Side Panel opens on that course.

7. Add your own DeepSeek API key when Syllab asks for it (Settings -> AI).
   The key is stored in this Chrome profile and sent directly to DeepSeek for
   validation and AI inference. It is never included in a backup or repository.

8. Choose "Scan course" on a course that has not been set up yet, then review the
   assessments Syllab found. After that, Syllab maintains the course quietly in
   the background while you use NTU Learn normally.

NOTES

- Syllab reads your NTU Learn pages using the session you are already signed in to.
  It never asks for your password and never writes to NTU Learn.
- Course data lives in this browser profile. Use Settings -> Data -> Export backup
  to move it, and Restore to bring it back.
- If you rebuild or reload the extension, refresh any already-open NTU Learn tabs,
  otherwise those tabs keep the previous version's page script.

中文说明

1. 解压到一个你之后不会删掉的位置（Chrome 每次启动都从这个文件夹加载扩展）。
2. 打开 chrome://extensions，右上角开启「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择包含 manifest.json 的这个文件夹。
4. 打开 NTU Learn 课程页，点击工具栏上的 Syllab 图标，侧边栏会打开该课程。
5. 在 Settings → AI 填入你自己的 DeepSeek API Key。Key 保存在当前 Chrome profile，
   仅在校验与 AI 推理时直接发送给 DeepSeek，不进入 Backup 或代码仓库。
6. 选择 "Scan course" 建立课程；之后的日常使用中 Syllab 会在后台安静维护。

若重新构建或重新加载了扩展，请刷新所有已打开的 NTU Learn 标签页。
`;
await writeFile(join(root, "HOW-TO-INSTALL.txt"), readme);

// 4. Zip deterministically: a fixed timestamp keeps the archive stable across runs.
const files = await walk(root);
const entries = {};
for (const relative of files) {
  const path = join(root, relative);
  entries[`${folderName}/${relative}`] = new Uint8Array(await readFile(path));
}
const archive = zipSync(entries, { level: 9, mtime: new Date("2026-01-01T00:00:00Z") });

await mkdir(resolve("artifacts", "release"), { recursive: true });
await writeFile(outputPath, archive);
await rm(staging, { recursive: true, force: true });

const digest = createHash("sha256").update(archive).digest("hex");
const size = (await stat(outputPath)).size;
process.stdout.write(
  `Packaged ${String(files.length)} files into ${outputPath}\n` +
    `  folder in archive: ${folderName}/\n` +
    `  size: ${(size / 1024).toFixed(0)} KiB\n` +
    `  sha256: ${digest}\n`
);
