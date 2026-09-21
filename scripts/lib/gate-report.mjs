/**
 * Shared Gate acceptance plumbing: every step is a real command with a recorded exit code, and
 * the report separates machine-verified results from the few items that still need Product
 * Judgment. Nothing is reported PASS without an executed step behind it.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export function runStep(step) {
  return new Promise((resolveStep) => {
    const started = Date.now();
    const child = spawn(step.command, step.args, {
      stdio: "inherit",
      shell: false,
      env: { ...process.env, ...step.env }
    });
    child.on("error", () => {
      resolveStep({
        name: step.name,
        status: "FAIL",
        code: null,
        durationMs: Date.now() - started,
        produces: step.produces ?? []
      });
    });
    child.on("exit", (code) => {
      resolveStep({
        name: step.name,
        status: code === 0 ? "PASS" : "FAIL",
        code,
        durationMs: Date.now() - started,
        produces: step.produces ?? []
      });
    });
  });
}

export async function runGate(input) {
  const startedAt = new Date().toISOString();
  const steps = [];
  for (const step of input.steps) {
    const result = await runStep(step);
    steps.push(result);
    // A failed step means the rest of the chain is not evidence, so the run stops there.
    if (result.status === "FAIL") break;
  }

  const automated =
    steps.length === input.steps.length && steps.every((step) => step.status === "PASS")
      ? "PASS"
      : "FAIL";
  const report = {
    gate: input.gate,
    productVersion: "v0.2.0",
    startedAt,
    completedAt: new Date().toISOString(),
    status: automated === "PASS" ? "AUTOMATED_PASS" : "AUTOMATED_FAIL",
    steps,
    evidence: { automated, ...input.evidence },
    productJudgment: input.productJudgment
  };

  await mkdir(input.reportDirectory, { recursive: true });
  await writeFile(
    resolve(input.reportDirectory, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );
  await writeFile(
    resolve(input.reportDirectory, "REPORT.md"),
    renderReport(report, input.notes ?? [])
  );
  return report;
}

export function renderReport(report, notes) {
  // Derived from the executed steps, never written by hand: a summary that disagrees with the
  // machine report is worse than no summary.
  const passed = report.steps.filter((step) => step.status === "PASS").length;
  const lines = [
    `# Syllab v0.2.0 ${report.gate} acceptance report`,
    "",
    `- Started: ${report.startedAt}`,
    `- Completed: ${report.completedAt}`,
    `- Automated result: **${report.status}**`,
    `- Steps executed: **${String(report.steps.length)}**, PASS **${String(passed)}**, FAIL **${String(
      report.steps.length - passed
    )}**`,
    `- Live DeepSeek: **${report.evidence.liveDeepSeek}**`,
    `- Real NTU Learn courses: **${report.evidence.realNtuLearnCourses}**`,
    `- Product Judgment: **${report.evidence.productJudgment}**`,
    "",
    "## Executed steps",
    "",
    "| Step | Result | Exit | Duration | Evidence produced |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const step of report.steps) {
    lines.push(
      `| ${step.name} | ${step.status} | ${step.code === null ? "—" : String(step.code)} | ${String(
        Math.round(step.durationMs / 100) / 10
      )}s | ${step.produces.length > 0 ? step.produces.join(", ") : "—"} |`
    );
  }
  if (notes.length > 0) {
    lines.push("", "## Notes", "");
    for (const note of notes) lines.push(`- ${note}`);
  }
  lines.push(
    "",
    "## Requires Product Judgment",
    "",
    "The automation cannot decide the following. They are listed so the Product Owner can accept",
    "or reject the Gate explicitly; nothing below is reported as PASS by the automation.",
    ""
  );
  for (const item of report.productJudgment) lines.push(`- ${item}`);
  lines.push(
    "",
    "## What a PASS does not claim",
    "",
    "- A `NOT TESTED` item was not exercised in this environment and is not implied by PASS.",
    "- Automated steps use synthetic fixtures and a fake transport; no live provider call is made",
    "  unless the live-DeepSeek step is explicitly enabled with a key present in the environment.",
    "- Real NTU Learn validation needs an authenticated session on a real course and is never",
    "  substituted by fixtures.",
    ""
  );
  return lines.join("\n");
}
