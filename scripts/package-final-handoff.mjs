/**
 * Creates the compact internal Engineering Freeze / Final Acceptance / Release Readiness handoff.
 * Real-course telemetry and private analysis exports are deliberately excluded.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { zipSync } from "fflate";

const version = JSON.parse(
  await readFile(resolve("extension", "public", "manifest.json"), "utf8")
).version;
const acceptancePath = resolve(`docs/versions/v${version}/FINAL_ACCEPTANCE_v${version}.md`);
if (!existsSync(acceptancePath)) {
  process.stderr.write(
    `Refusing to package Final Closure Handoff for v${version}: ${acceptancePath} does not exist.\n`
  );
  process.exit(1);
}
const acceptanceText = await readFile(acceptancePath, "utf8");
if (
  /FINAL_ACCEPTANCE:\s*FAIL|Human Gate 5.*(?:FAIL|失败|NOT PASSED|尚未通过)|尚未发布/i.test(
    acceptanceText
  )
) {
  process.stderr.write(
    `Refusing to package a RELEASED/PASS Final Closure Handoff for v${version}: Final Acceptance / Human Gate 5 has not passed.\n`
  );
  process.exit(1);
}

const folderName = `Syllab-v${version}-final-handoff`;
const handoffDirectory = resolve("artifacts", "handoffs");
const outputPath = join(handoffDirectory, `Syllab_v${version}_Final_Closure_Handoff.zip`);
const publicPackage = resolve("artifacts", "release", `syllab-for-ntu-learn-v${version}.zip`);
const releaseTag = `v${version}`;
const releaseUrl = `https://github.com/simooon15/syllab-for-ntu-learn/releases/tag/${releaseTag}`;

const candidateDocuments = [
  "README.md",
  `docs/versions/v${version}/PRD_v${version}.md`,
  `docs/versions/v${version}/Interaction_and_Information_Architecture_Spec_v${version}.md`,
  `docs/versions/v${version}/README_v${version}.md`,
  "docs/DOCUMENTATION_GOVERNANCE.md",
  `docs/versions/v${version}/DECISION_LOG_v${version}.md`,
  `docs/versions/v${version}/ENGINEERING_REPORT_v${version}.md`,
  `docs/versions/v${version}/TECHNICAL_DESIGN_v${version}.md`,
  `docs/versions/v${version}/FINAL_ACCEPTANCE_v${version}.md`,
  `docs/versions/v${version}/FINAL_PROJECT_CLOSURE_v${version}.md`,
  `docs/versions/v${version}/RELEASE_NOTES_v${version}.md`,
  `docs/versions/v${version}/images`
];
const documents = candidateDocuments.filter((relative) => existsSync(resolve(relative)));

async function walk(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walk(join(directory, entry.name), relative)));
    else files.push(relative);
  }
  return files;
}

const packageBytes = await readFile(publicPackage);
const packageSha256 = createHash("sha256").update(packageBytes).digest("hex");
const gitHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
const gitStatus = execFileSync("git", ["status", "--short", "--branch"], {
  encoding: "utf8"
}).trimEnd();

const staging = await mkdtemp(join(tmpdir(), "syllab-final-handoff-"));
const root = join(staging, folderName);
for (const relative of documents) {
  const target = join(root, relative);
  await mkdir(join(target, ".."), { recursive: true });
  await cp(resolve(relative), target, { recursive: true });
}

const index = `# Syllab v${version} — Final Closure Handoff Index

## Milestone

- Engineering Freeze: YES
- Final Acceptance: PASS
- Local consolidation: COMPLETE
- Publication: RELEASED
- Version status: CLOSED

## Canonical Git state

- Repository: ${basename(process.cwd())}
- Branch: ${gitBranch}
- HEAD at packaging time: ${gitHead}
- Release tag: ${releaseTag}

## CURRENT AUTHORITATIVE

- README.md
- docs/versions/v${version}/README_v${version}.md
- docs/DOCUMENTATION_GOVERNANCE.md
- PRD_v${version}.md
- PRODUCT_HANDOFF_v${version}.md
- docs/versions/v${version}/AI_DESIGN_v${version}.md
- docs/versions/v${version}/DECISION_LOG_v${version}.md
- docs/versions/v${version}/ENGINEERING_REPORT_v${version}.md
- Interaction_and_Information_Architecture_Spec_v${version}.md
- docs/versions/v${version}/TECHNICAL_DESIGN_v${version}.md
- docs/versions/v${version}/FINAL_ACCEPTANCE_v${version}.md
- docs/versions/v${version}/FINAL_PROJECT_CLOSURE_v${version}.md
- docs/versions/v${version}/RELEASE_NOTES_v${version}.md

## HISTORICAL / REFERENCE

- docs/versions/v${version}/PRD_TO_ENGINEERING_FREEZE_DECISION_DELTA_v${version}.md
- docs/versions/v${version}/ENGINEERING_FREEZE_HANDOFF_INDEX_v${version}.md

These retain historical truth and must not be rewritten as if later decisions were original.

## PUBLIC RELEASE ARTIFACT

- GitHub Release: ${releaseUrl}
- Repository path: artifacts/release/${basename(publicPackage)}
- SHA-256: ${packageSha256}
- Archive root: Syllab-v${version}/
- Download-back hash verification: PASS
- Exact archive validation: see FINAL_PROJECT_CLOSURE_v${version}.md.

## NEXT-VERSION INPUT

Deferred inputs are Mixed/image-only PDF OCR/multimodal support, adaptive parallelism,
multi-source/token-aware packing, and privacy-safe AI progress monitoring. Calendar/F36 remains
NOT TESTED in a real Course and is not represented as a verified v0.2.0 capability.

## Known limitations and cleanup

See FINAL_PROJECT_CLOSURE_v${version}.md for release limitations and
LOCAL_WORKSPACE_CONSOLIDATION_v${version}.md for the post-release cleanup plan. No old repository,
worktree, private QA evidence, or historical artifact is deleted by this handoff.

## Exclusions

This package contains no API key, Authorization header, cookie, browser profile, raw NTU private
content, raw AI prompt/reasoning/output stream, or large local QA/runtime export.
`;
await writeFile(join(root, "00_FINAL_HANDOFF_INDEX.md"), index);
await writeFile(
  join(root, "PUBLIC_RELEASE_ARTIFACT.sha256"),
  `${packageSha256}  ${basename(publicPackage)}\n`
);
await writeFile(join(root, "GIT_STATE.txt"), `${gitStatus}\n`);

const files = await walk(root);
const entries = {};
for (const relative of files) {
  entries[`${folderName}/${relative}`] = new Uint8Array(await readFile(join(root, relative)));
}
const archive = zipSync(entries, { level: 9, mtime: new Date("2026-01-01T00:00:00Z") });
await mkdir(handoffDirectory, { recursive: true });
await writeFile(outputPath, archive);
await rm(staging, { recursive: true, force: true });

const digest = createHash("sha256").update(archive).digest("hex");
await writeFile(`${outputPath}.sha256`, `${digest}  ${basename(outputPath)}\n`);
process.stdout.write(
  `Packaged ${String(files.length)} files into ${outputPath}\n` +
    `  size: ${((await stat(outputPath)).size / 1024).toFixed(0)} KiB\n` +
    `  sha256: ${digest}\n`
);
