import { IDBFactory } from "fake-indexeddb";
import { afterEach, expect, it, vi } from "vitest";
import {
  installQaTelemetryReceiver,
  qaProviderStreamStart,
  qaProviderStreamDelta,
  qaProviderStreamEnd,
  qaProviderStreamResult
} from "./qa-telemetry";
afterEach(() => vi.unstubAllGlobals());
it("restores the latest complete channels across observer reopen and clears without owning requests", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  let receiver:
    | ((
        message: unknown,
        sender: chrome.runtime.MessageSender,
        response: (value: unknown) => void
      ) => unknown)
    | undefined;
  const sendMessage = vi.fn(() => Promise.resolve());
  vi.stubGlobal("chrome", {
    runtime: {
      id: "fixture",
      getURL: (path: string) => `chrome-extension://fixture/${path}`,
      sendMessage,
      onMessage: {
        addListener: (listener: typeof receiver) => {
          receiver = listener;
        }
      }
    }
  });
  installQaTelemetryReceiver();
  const sender = { id: "fixture", url: "chrome-extension://fixture/app.html" };
  const read = () => {
    let result: unknown;
    receiver?.({ type: "SYLLAB_QA_AI_STREAM_SNAPSHOT" }, sender, (value) => {
      result = value;
    });
    return result;
  };
  qaProviderStreamStart("probe", { system: "synthetic context", user: "synthetic only" });
  const reasoning = "reasoning".repeat(10000),
    content = '{"sourceId":"fixture"}'.repeat(10000);
  qaProviderStreamDelta("probe", "reasoning", reasoning);
  qaProviderStreamDelta("probe", "content", content);
  expect(read()).toMatchObject({ reasoning, content, finished: false });
  await qaProviderStreamEnd("probe");
  expect(read()).toMatchObject({ reasoning, content, finished: true });
  let external: unknown;
  receiver?.(
    { type: "SYLLAB_QA_AI_STREAM_SNAPSHOT" },
    { id: "other", url: "https://example.invalid" },
    (value) => {
      external = value;
    }
  );
  expect(external).toBeUndefined();
  receiver?.({ type: "SYLLAB_QA_AI_STREAM_CLEAR", streamId: "probe" }, sender, () => undefined);
  expect(read()).toBeNull();
  expect(sendMessage).toHaveBeenLastCalledWith({
    type: "SYLLAB_QA_AI_STREAM",
    event: "clear",
    streamId: "probe"
  });
});

it("archives every overlapping physical stream with independent reasoning, output and usage", async () => {
  const factory = new IDBFactory();
  vi.stubGlobal("indexedDB", factory);
  vi.stubGlobal("chrome", { runtime: { sendMessage: () => Promise.resolve() } });
  qaProviderStreamStart("first", { system: "synthetic", user: "one" });
  qaProviderStreamDelta("first", "reasoning", "first reasoning");
  qaProviderStreamStart("second", { system: "synthetic", user: "two" });
  qaProviderStreamDelta("first", "content", "first output");
  qaProviderStreamDelta("second", "reasoning", "second reasoning");
  qaProviderStreamResult("first", {
    providerUsage: { completion_tokens: 123 },
    finishReason: "stop"
  });
  await qaProviderStreamEnd("first");
  qaProviderStreamDelta("second", "content", "second output");
  await qaProviderStreamEnd("second");
  const db = await new Promise<IDBDatabase>((r) => {
    const q = factory.open("syllab.qa.private-streams");
    q.onsuccess = () => r(q.result);
  });
  const rows = await new Promise<unknown[]>((r) => {
    const q = db.transaction("streams").objectStore("streams").getAll();
    q.onsuccess = () => r(q.result);
  });
  expect(rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        streamId: "first",
        reasoning: "first reasoning",
        content: "first output",
        providerUsage: { completion_tokens: 123 },
        finishReason: "stop",
        finished: true
      }),
      expect.objectContaining({
        streamId: "second",
        reasoning: "second reasoning",
        content: "second output",
        finished: true
      })
    ])
  );
  db.close();
});
