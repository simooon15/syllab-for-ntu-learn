import { afterEach, expect, it, vi } from "vitest";
import { qaTrace } from "./qa-telemetry";
afterEach(() => vi.unstubAllGlobals());
it("forwards scrubbed offscreen resource-wait metadata through its available runtime API", () => {
  const sendMessage = vi.fn((_message: unknown) => Promise.resolve());
  vi.stubGlobal("chrome", { runtime: { sendMessage } });
  qaTrace("qa.runtime-wait", { kind: "office", waitMs: 1234, password: "private-fixture" });
  expect(sendMessage).toHaveBeenCalledOnce();
  expect(sendMessage.mock.calls[0]?.[0]).toEqual({
    type: "SYLLAB_QA_TELEMETRY",
    event: "qa.runtime-wait",
    fields: { kind: "office", waitMs: 1234 }
  });
});
