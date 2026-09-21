import { stableStringify } from "./crypto";
import { stableDigest } from "./chunking";

/**
 * Versioned, local capability facts for the v0.2.0 DeepSeek baseline.
 *
 * The values are taken from DeepSeek's Chat Completions/model documentation reviewed on
 * 2026-09-20. They are intentionally local and versioned: changing provider capability facts must
 * be an explicit code change, not an unobserved runtime fetch.
 */
export const DEEPSEEK_FLASH_CAPABILITIES = {
  capabilityVersion: "deepseek-flash-2026-09-20",
  provider: "DeepSeek",
  model: "deepseek-flash",
  contextLimit: 1_000_000,
  providerMaxOutput: 384_000,
  thinking: "enabled" as const,
  reasoningEffort: "high" as const
};

// Keep the version token free of credential-shaped substrings so the repository secret scan does
// not mistake an ordinary `task-*` phrase for an API key prefix.
export const OUTPUT_CEILING_POLICY_VERSION = "ceiling_context_aware_v1" as const;
export const RETRY_POLICY_VERSION = "failure-specific-v1" as const;

export type InvocationTask =
  "task-a" | "task-a-consolidate" | "task-b" | "task-b-expand" | "task-c";

export const TASK_RUNAWAY_GUARDS: Record<InvocationTask, number> = {
  "task-a": 96_000,
  "task-a-consolidate": 96_000,
  "task-b": 192_000,
  "task-b-expand": 192_000,
  "task-c": 96_000
};

export const CONTEXT_MARGIN_MINIMUM = 32_000;

/**
 * A deliberately conservative preflight estimate. The provider remains authoritative for usage;
 * this estimate exists only to avoid choosing a ceiling that could collide with the context limit.
 * UTF-8 bytes / 2 is conservative for the JSON/text payloads used by this extension.
 */
export function estimateInputTokens(system: string, user: string): number {
  const bytes = new TextEncoder().encode(`${system}\n${user}`).byteLength;
  return Math.max(1, Math.ceil(bytes / 2) + 256);
}

export function contextMargin(): number {
  return Math.max(
    CONTEXT_MARGIN_MINIMUM,
    Math.ceil(DEEPSEEK_FLASH_CAPABILITIES.contextLimit * 0.05)
  );
}

export function computeOutputSafetyCeiling(
  task: InvocationTask,
  system: string,
  user: string
): number {
  const estimatedInput = estimateInputTokens(system, user);
  const availableGeneration = Math.max(
    1,
    DEEPSEEK_FLASH_CAPABILITIES.contextLimit - estimatedInput - contextMargin()
  );
  return Math.max(
    1,
    Math.min(
      DEEPSEEK_FLASH_CAPABILITIES.providerMaxOutput,
      availableGeneration,
      TASK_RUNAWAY_GUARDS[task]
    )
  );
}

export interface InvocationFingerprintInput {
  task: InvocationTask;
  promptVersion: string;
  schemaVersion: string;
  system: string;
  user: string;
  maxTokens: number;
}

/** No secrets or raw prompt text are returned; only a short deterministic digest is persisted. */
export function invocationFingerprint(input: InvocationFingerprintInput): string {
  const normalized = stableStringify({
    provider: DEEPSEEK_FLASH_CAPABILITIES.provider,
    model: DEEPSEEK_FLASH_CAPABILITIES.model,
    capabilityVersion: DEEPSEEK_FLASH_CAPABILITIES.capabilityVersion,
    task: input.task,
    promptVersion: input.promptVersion,
    schemaVersion: input.schemaVersion,
    thinking: DEEPSEEK_FLASH_CAPABILITIES.thinking,
    reasoningEffort: DEEPSEEK_FLASH_CAPABILITIES.reasoningEffort,
    outputCeilingPolicyVersion: OUTPUT_CEILING_POLICY_VERSION,
    retryPolicyVersion: RETRY_POLICY_VERSION,
    maxTokens: input.maxTokens,
    requestDigest: stableDigest(`${input.system}\u0000${input.user}`)
  });
  return `invocation_${stableDigest(normalized)}`;
}
