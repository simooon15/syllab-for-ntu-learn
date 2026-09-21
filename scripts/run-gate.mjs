/**
 * One-command Gate acceptance: Build → Automated Tests → Integration / E2E → AI Evaluation /
 * Regression → Data Integrity → Evidence Collection → Gate Acceptance Report.
 *
 * Usage: node scripts/run-gate.mjs gate-1|gate-2 [--live-deepseek] [--real-course]
 *
 * `--live-deepseek` and `--real-course` are opt-in: without them those evidence rows stay
 * NOT TESTED, which is the truthful result for an environment that cannot supply them.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { runGate } from "./lib/gate-report.mjs";

const gate = process.argv[2];
if (gate !== "gate-1" && gate !== "gate-2") {
  process.stderr.write("Usage: node scripts/run-gate.mjs gate-1|gate-2\n");
  process.exit(2);
}

const liveDeepSeek = process.argv.includes("--live-deepseek");
const realCourse = process.argv.includes("--real-course");
const evidenceDirectory = resolve("artifacts", "gates", "v0.2.0", gate);

/**
 * Screenshot and E2E runs drive the QA build. It is the same product source as the shipped bundle
 * with the acceptance bridge and the observation layer compiled in, which is why the browser
 * evidence proves something about what a user installs.
 */
const acceptanceEnv = {};

const buildStep = (name, command, args, options = {}) => ({
  name,
  command,
  args,
  ...options
});

const analysisSteps = [
  buildStep("v2-contract-tests", "npx", ["vitest", "run", "--root", "extension", "src/v2"], {
    produces: ["domain, schema, workflow, AI-contract and reducers"]
  }),
  buildStep(
    "ai-regression",
    "npx",
    [
      "vitest",
      "run",
      "--root",
      "extension",
      "src/v2/ai-regression.test.ts",
      "src/v2/ai-pipeline.test.ts",
      "src/v2/ai-context.test.ts"
    ],
    {
      env: { SYLLAB_LIVE_AI: liveDeepSeek ? "1" : "0" },
      produces: [
        "Task A/B/C recorded regression",
        "deterministic hard checks",
        "live provider run when enabled"
      ]
    }
  ),
  buildStep(
    "data-integrity",
    "npx",
    [
      "vitest",
      "run",
      "--root",
      "extension",
      "src/v2/migration.test.ts",
      "src/v2/restore.test.ts",
      "src/v2/calendar-export.test.ts",
      "src/v2/workflow.test.ts"
    ],
    {
      produces: [
        "v0.1.0 migration and idempotency",
        "backup/restore Full Replace atomicity",
        "calendar event consolidation and KR-07",
        "resumable workflow and Coverage Facts"
      ]
    }
  )
];

/**
 * The download a user gets from the repository, and proof that it loads: the archive is extracted
 * and loaded as an unpacked extension in a clean profile, not merely inspected.
 */
const packagingSteps = [
  buildStep("package-extension", "npm", ["run", "package"], {
    produces: ["artifacts/Syllab_Extension_v0.2.0.zip — unzip and load unpacked"]
  }),
  buildStep("verify-package", "npm", ["run", "package:verify"], {
    produces: ["the packaged zip extracts and loads in a clean browser profile"]
  })
];

/**
 * Rebuilds the shipped bundle after browser evidence runs.
 *
 * The two builds no longer take turns over one directory: `dist` is never written by an acceptance
 * step, so the archive a user downloads cannot be a leftover acceptance bundle. The rebuild stays
 * as the belt to that braces — it costs seconds and it makes "the shipped bundle is the shipped
 * configuration" true at the end of the run as well as the start.
 */
const cleanBundleStep = buildStep(
  "shipping-bundle",
  "npm",
  ["run", "build", "-w", "@syllab/extension"],
  {
    env: acceptanceEnv,
    produces: ["extension/dist — the shipped bundle, rebuilt in its own configuration"]
  }
);

const browserSteps = [
  buildStep("core-loop-e2e", "node", ["scripts/browser-e2e.mjs"], {
    env: acceptanceEnv,
    produces: [
      "one-start scan through Initial Review to Current State",
      "Source change through Change Review to updated Current State"
    ]
  }),
  buildStep("screenshot-capture", "node", ["scripts/capture-screenshots.mjs"], {
    env: acceptanceEnv,
    produces: ["final UI screenshot set for the Interface Spec backfill"]
  })
];

const acceptanceSteps = gate === "gate-1" ? [...browserSteps.slice(0, 1)] : [...browserSteps];

const gate1Steps = [
  buildStep("build+ci", "npm", ["run", "ci"], {
    produces: [
      "formatting",
      "build",
      "strict typecheck",
      "lint",
      "unit tests",
      "manifest",
      "secret scan"
    ]
  }),
  buildStep("qa-bundle", "npm", ["run", "build:qa", "-w", "@syllab/extension"], {
    env: acceptanceEnv,
    produces: [
      "extension/dist-qa — the same product with the acceptance bridge and observation layer"
    ]
  }),
  ...acceptanceSteps,
  cleanBundleStep,
  buildStep("evidence-inventory", "node", ["scripts/evidence-inventory.mjs"], {
    produces: ["required screens implemented and captured, shipped bundle free of the test bridge"]
  }),
  ...analysisSteps
];

const gate2Steps = [
  buildStep("build+ci", "npm", ["run", "ci"], {
    produces: [
      "formatting",
      "build",
      "strict typecheck",
      "lint",
      "unit tests",
      "manifest",
      "secret scan"
    ]
  }),
  buildStep("qa-bundle", "npm", ["run", "build:qa", "-w", "@syllab/extension"], {
    env: acceptanceEnv,
    produces: [
      "extension/dist-qa — the same product with the acceptance bridge and observation layer"
    ]
  }),
  ...browserSteps,
  cleanBundleStep,
  ...packagingSteps,
  buildStep("screenshot-backfill", "node", ["scripts/backfill-screenshots.mjs"], {
    produces: ["Interaction & IA Spec screenshots in place", "README Product Walkthrough"]
  }),
  buildStep("readme-backfill-verify", "npm", ["run", "readme:verify"], {
    produces: ["one walkthrough per language; a second backfill changes no byte"]
  }),
  buildStep("evidence-inventory", "node", ["scripts/evidence-inventory.mjs"], {
    produces: ["required screens implemented and captured, shipped bundle free of the test bridge"]
  }),
  ...analysisSteps,
  // Last, so the delivery archive contains the final README, Spec and Gate reports rather than the
  // versions that existed before this run.
  buildStep("package-delivery", "npm", ["run", "package:delivery"], {
    produces: ["artifacts/Syllab_v0.2.0_delivery.zip — documents, screenshots and Gate reports"]
  })
];

const productJudgment =
  gate === "gate-1"
    ? [
        "Course Brief reads as a course, not as a scan result, and the assessment grouping matches how the Course is really structured.",
        "Initial Review asks only for decisions the system genuinely cannot make.",
        "Change Review shows Current → Latest as a single decision rather than a stack of pending items.",
        "Trusted Current State stays believable after a rejected change and after a failed check."
      ]
    : [
        "Semester Dashboard communicates the state of a semester at a glance without becoming a task list.",
        "Side Panel and Full-page feel like one product at two densities, not two products.",
        "Background checking is quiet enough to leave on, and its freshness copy is honest.",
        "Backup → clean environment → Restore reproduces a Course that a student would still trust.",
        "Calendar Export produces one event per real deadline and files that open cleanly in a calendar client.",
        "The Product Mark is legible at 16px and consistent across toolbar, Side Panel and Full-page."
      ];

const notes = [];
if (!existsSync(resolve("extension", "dist", "manifest.json"))) {
  notes.push("Extension bundle was rebuilt as part of this Gate run.");
}

const evidence = {
  liveDeepSeek: liveDeepSeek && process.env.DEEPSEEK_API_KEY ? "PASS" : "NOT TESTED",
  realNtuLearnCourses: "NOT TESTED",
  productJudgment: "PENDING"
};

if (liveDeepSeek && !process.env.DEEPSEEK_API_KEY) {
  notes.push(
    "Live DeepSeek was requested but DEEPSEEK_API_KEY is not present in the environment; the live row stays NOT TESTED."
  );
}
if (realCourse) {
  notes.push(
    "Real NTU Learn validation requires an authenticated browser session and a real course; run scripts/real-course-acceptance.mjs inside that session. Fixtures are never reported as real-course evidence."
  );
}

const report = await runGate({
  gate,
  steps: gate === "gate-1" ? gate1Steps : gate2Steps,
  productJudgment,
  evidence,
  reportDirectory: evidenceDirectory,
  notes
});

process.stdout.write(
  `\n${gate}: ${report.status} — report at ${resolve(evidenceDirectory, "REPORT.md")}\n`
);
process.exitCode = report.status === "AUTOMATED_PASS" ? 0 : 1;
