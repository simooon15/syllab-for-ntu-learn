import { describe, it, expect } from "vitest";
import { serializeProviderRequest } from "./provider-request";
import { readProviderCompletion } from "./deepseek-complete";

describe("Task B external boundary preflight", () => {
  it("omits optional per-request max_tokens rather than adopting an owned output ceiling", () => {
    const request = {
      system: "synthetic JSON",
      user: "{}",
      providerRequestCompatibility: "provider-default" as const
    };
    const small = serializeProviderRequest({ ...request, maxTokens: 1 });
    const large = serializeProviderRequest({ ...request, maxTokens: 999999 });
    expect(small).toBe(large);
    expect(JSON.parse(small)).not.toHaveProperty("max_tokens");
  });
  it("keeps a provider length boundary observable and never labels its incomplete JSON complete", () => {
    const read = readProviderCompletion({
      choices: [
        {
          finish_reason: "length",
          message: { content: '{"schema":"syllab.ai.task-b/2","items":[' }
        }
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1 }
    });
    expect(read.truncated).toBe(true);
    expect(read.ok).toBe(false);
  });
});
