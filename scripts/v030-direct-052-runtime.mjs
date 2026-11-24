import { build } from "esbuild";
import { resolve, join } from "node:path";
const canonical = resolve(process.argv[2] ?? process.cwd());
await build({
  stdin: {
    contents:
      'export * from "./extension/src/v2/direct-course.ts";export * from "./extension/src/v2/direct-json.ts";export * from "./extension/src/v2/direct-course-runner.ts";export * from "./extension/src/v2/direct-wallet-budget.ts";export * from "./extension/src/v2/provider-request.ts";',
    resolveDir: process.cwd()
  },
  outfile: join(canonical, "evidence/private/goal-driven-052/candidate-runtime.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  logLevel: "silent"
});
