import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The observation layer's one hard obligation: it may watch the product, and it may not change it.
 *
 * The failing case is specific and was real. Both UI surfaces re-read their whole view when anything
 * in `chrome.storage.local` changes — that is how they follow Course State — so a trace kept there
 * made every recorded line repaint both surfaces. In a real run it replaced the Restore file input
 * between the click and the change event, and the screen stopped being the screen the user was on.
 * The trace therefore lives in session storage, and this is the test that keeps it there.
 */

interface FakeArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

/** A `chrome` with both storage areas, so a write can be attributed to the one that made it. */
function fakeChrome(): { storage: { local: FakeArea; session: FakeArea }; localWrites: string[] } {
  const stores = { local: new Map<string, unknown>(), session: new Map<string, unknown>() };
  const localWrites: string[] = [];
  const area = (name: "local" | "session"): FakeArea => ({
    get: (key) => {
      const store = stores[name];
      return Promise.resolve(store.has(key) ? { [key]: store.get(key) } : {});
    },
    set: (items) => {
      const store = stores[name];
      for (const key of Object.keys(items)) {
        if (name === "local") localWrites.push(key);
        store.set(key, items[key]);
      }
      return Promise.resolve();
    }
  });
  return { storage: { local: area("local"), session: area("session") }, localWrites };
}

describe("the QA trace", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("records into session storage and leaves the product's area untouched", async () => {
    const chrome = fakeChrome();
    vi.stubGlobal("chrome", chrome);
    const { qaTrace, QA_TRACE_KEY } = await import("./qa-telemetry");

    qaTrace("qa.date-resolution", {
      rawValue: "18 Oct",
      semester: "AY2026/27 · Semester 1",
      resolved: true,
      canonicalDate: "2026-10-18",
      resolutionSource: "semester"
    });

    await vi.waitFor(async () => {
      const stored = await chrome.storage.session.get(QA_TRACE_KEY);
      const trace = stored[QA_TRACE_KEY];
      expect(Array.isArray(trace) ? trace.length : 0).toBe(1);
    });
    expect(chrome.localWrites).toEqual([]);
    vi.unstubAllGlobals();
  });

  it("drops a field that looks like a credential instead of writing it", async () => {
    const chrome = fakeChrome();
    vi.stubGlobal("chrome", chrome);
    const { qaTrace, QA_TRACE_KEY } = await import("./qa-telemetry");

    // A value shaped like a provider key, short enough that the repository's own secret scanner
    // does not mistake this file for a leak. `KEY_SHAPE` is a shape test, not a length one.
    qaTrace("qa.deepseek-task", {
      task: "task-a",
      apiKey: "sk-0123456789abcdef",
      authorization: "Bearer something",
      note: "sk-0123456789abcdef"
    });

    const stored = await vi.waitFor(async () => {
      const value = await chrome.storage.session.get(QA_TRACE_KEY);
      const trace = value[QA_TRACE_KEY] as Array<{ fields: Record<string, unknown> }> | undefined;
      expect(trace?.length).toBe(1);
      return trace;
    });
    const fields = stored?.[0]?.fields ?? {};
    expect(fields).not.toHaveProperty("apiKey");
    expect(fields).not.toHaveProperty("authorization");
    expect(fields.task).toBe("task-a");
    expect(fields.note).toBe("[redacted]");
    vi.unstubAllGlobals();
  });

  it("keeps numeric token-usage evidence while still dropping token-shaped secrets", async () => {
    const chrome = fakeChrome();
    vi.stubGlobal("chrome", chrome);
    const { qaTrace, QA_TRACE_KEY } = await import("./qa-telemetry");

    qaTrace("qa.ai-contract-failure", {
      maxTokens: 8_000,
      inputTokens: 1_234,
      outputTokens: 8_000,
      accessToken: "private-value",
      maxTokensText: "8000"
    });

    const stored = await vi.waitFor(async () => {
      const value = await chrome.storage.session.get(QA_TRACE_KEY);
      const trace = value[QA_TRACE_KEY] as Array<{ fields: Record<string, unknown> }> | undefined;
      expect(trace?.length).toBe(1);
      return trace;
    });
    expect(stored?.[0]?.fields).toEqual({
      maxTokens: 8_000,
      inputTokens: 1_234,
      outputTokens: 8_000
    });
    vi.unstubAllGlobals();
  });
});
