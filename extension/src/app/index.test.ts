import { describe, expect, it } from "vitest";

import type { AppView, ViewResponse } from "../v2/contract";
import { courseView, currentSemester } from "../v2/screens/fixtures";
import { installAppRoot, installTestDom, type TestDocument } from "../v2/screens/test-dom";
import { uiState } from "../v2/screens/render";

/**
 * The mount contract, driven through the real boot path in `app/index.ts` with a fake chrome.
 * No real extension API is touched: every message the runtime sends is recorded here.
 */

interface FakeChrome {
  messages: unknown[];
  changes: Array<(changes: Record<string, unknown>, area: string) => void>;
  responses: ViewResponse[];
  storage: Record<string, unknown>;
}

let document: TestDocument;
let fake: FakeChrome;
let root: ReturnType<typeof installAppRoot>;

function bootView(): AppView {
  return {
    surface: "full-page",
    screen: "CRS-01",
    courseId: "course-1",
    course: courseView,
    semester: currentSemester
  };
}

function installFakeChrome(initial: ViewResponse[]): FakeChrome {
  const state: FakeChrome = {
    messages: [],
    changes: [],
    responses: initial,
    storage: {}
  };
  const chrome = {
    runtime: {
      getURL: (path: string) => `chrome-extension://fake/${path}`,
      sendMessage: (message: unknown): Promise<unknown> => {
        state.messages.push(message);
        return Promise.resolve(state.responses.shift() ?? { ok: true, view: bootView() });
      }
    },
    storage: {
      local: {
        get: (key: string): Promise<Record<string, unknown>> =>
          Promise.resolve({ [key]: state.storage[key] }),
        set: (values: Record<string, unknown>): Promise<void> => {
          Object.assign(state.storage, values);
          return Promise.resolve();
        }
      },
      onChanged: {
        addListener: (listener: (changes: Record<string, unknown>, area: string) => void): void => {
          state.changes.push(listener);
        },
        removeListener: (
          listener: (changes: Record<string, unknown>, area: string) => void
        ): void => {
          state.changes = state.changes.filter((item) => item !== listener);
        }
      }
    },
    tabs: {
      query: () => Promise.resolve([] as Array<{ id?: number; url?: string }>),
      create: () => Promise.resolve({})
    }
  };
  (globalThis as unknown as { chrome: unknown }).chrome = chrome;
  return state;
}

async function tick(times = 4): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function messagesOf(type: string): Array<Record<string, unknown>> {
  return fake.messages.filter(
    (message): message is Record<string, unknown> =>
      typeof message === "object" &&
      message !== null &&
      (message as { type?: string }).type === type
  );
}

function screenIds(): string[] {
  return root.querySelectorAll("[data-screen]").map((element) => element.dataset.screen ?? "");
}

function clickText(text: string): void {
  const button = root.querySelectorAll("button").find((node) => node.textContent.trim() === text);
  if (!button) throw new Error(`NO_BUTTON:${text}`);
  button.click();
}

describe("mount", () => {
  it("asks for the view on boot and renders what it gets", async () => {
    document = installTestDom("full-page");
    root = installAppRoot(document);
    fake = installFakeChrome([]);
    await import("../app/index");
    await tick();

    const views = messagesOf("GET_VIEW");
    expect(views.length).toBe(1);
    expect(views[0]).toMatchObject({ contract: 2, type: "GET_VIEW", surface: "full-page" });
    expect(screenIds()).toContain("CRS-01");
  });

  it("sends a mutation with the revision it was computed from", async () => {
    await tick();
    expect(messagesOf("MUTATE").length).toBe(0);

    clickText("More");
    clickText("Check for updates");
    await tick();

    const mutations = messagesOf("MUTATE");
    expect(mutations.length).toBe(1);
    expect(mutations[0]).toMatchObject({
      type: "MUTATE",
      surface: "full-page",
      courseId: "course-1",
      expectedRevision: courseView.revision,
      mutation: { kind: "CheckForUpdates", courseId: "course-1" }
    });
  });

  it("dismisses the rebuild confirmation when its mutation response arrives", async () => {
    clickText("More");
    clickText("Rebuild course");
    expect(screenIds()).toContain("RBL-01");

    fake.responses.push({ ok: true, view: bootView() });
    clickText("Rebuild course");
    expect(uiState().rebuildConfirmOpen).toBe(false);
    await tick();
    expect(screenIds()).not.toContain("RBL-01");
    expect(screenIds()).toContain("CRS-01");
  });

  it("re-requests the view when the local revision moves, and ignores its own UI keys", async () => {
    const before = messagesOf("GET_VIEW").length;
    for (const listener of fake.changes) {
      listener({ "syllab.v2.revision": { newValue: 3 } }, "local");
    }
    await tick();
    expect(messagesOf("GET_VIEW").length).toBe(before + 1);

    const quiet = messagesOf("GET_VIEW").length;
    for (const listener of fake.changes) {
      listener({ "syllab.v2.ui.hints": { newValue: { split: true } } }, "local");
      listener({ "syllab.v2.revision": { newValue: 4 } }, "sync");
    }
    await tick();
    expect(messagesOf("GET_VIEW").length).toBe(quiet);
  });

  it("shows the error copy when the service worker refuses, then recovers", async () => {
    fake.responses.push({
      ok: false,
      error: { code: "STORAGE_WRITE", copy: "Syllab could not save that change." }
    });
    for (const listener of fake.changes) {
      listener({ "syllab.v2.revision": { newValue: 9 } }, "local");
    }
    await tick();

    const bar = root.querySelector('[data-pattern="SYS-07"]');
    expect(bar?.textContent).toContain("Syllab could not save that change.");

    for (const listener of fake.changes) {
      listener({ "syllab.v2.revision": { newValue: 10 } }, "local");
    }
    await tick();
    expect(root.querySelector('[data-pattern="SYS-07"]')).toBeNull();
  });
});
