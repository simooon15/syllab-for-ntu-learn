import { describe, expect, it } from "vitest";

import {
  computeOutputSafetyCeiling,
  contextMargin,
  DEEPSEEK_FLASH_CAPABILITIES,
  estimateInputTokens,
  invocationFingerprint,
  TASK_RUNAWAY_GUARDS
} from "./invocation-policy";

describe("DeepSeek invocation policy", () => {
  it("uses the approved task guard while reserving context", () => {
    const ceiling = computeOutputSafetyCeiling("task-a", "system", "small request");
    expect(ceiling).toBe(TASK_RUNAWAY_GUARDS["task-a"]);
    expect(contextMargin()).toBe(50_000);
  });

  it("never exceeds the provider output capability", () => {
    const huge = "x".repeat(300_000);
    const ceiling = computeOutputSafetyCeiling("task-b", huge, huge);
    expect(ceiling).toBeGreaterThan(0);
    expect(ceiling).toBeLessThanOrEqual(DEEPSEEK_FLASH_CAPABILITIES.providerMaxOutput);
    expect(estimateInputTokens(huge, huge) + contextMargin() + ceiling).toBeLessThanOrEqual(
      DEEPSEEK_FLASH_CAPABILITIES.contextLimit
    );
  });

  it("keeps task guards independent from the expected output size", () => {
    expect(computeOutputSafetyCeiling("task-b", "s", "u")).toBe(TASK_RUNAWAY_GUARDS["task-b"]);
    expect(computeOutputSafetyCeiling("task-c", "s", "u")).toBe(TASK_RUNAWAY_GUARDS["task-c"]);
  });

  it("fingerprints invocation configuration without storing the request", () => {
    const base = {
      task: "task-a" as const,
      promptVersion: "task-a/1",
      schemaVersion: "syllab.ai/task-a/1",
      system: "system",
      user: "request",
      maxTokens: 96_000
    };
    expect(invocationFingerprint(base)).toBe(invocationFingerprint(base));
    expect(invocationFingerprint({ ...base, maxTokens: 95_999 })).not.toBe(
      invocationFingerprint(base)
    );
    expect(invocationFingerprint(base)).not.toContain("request");
  });
});
