import { describe, expect, it } from "vitest";

import {
  observeFirstUnapprovedRedirectOrigin,
  type RedirectDetails,
  type RedirectEventPort
} from "./redirect-observer";

class FakeRedirectEvent implements RedirectEventPort {
  listener: ((details: RedirectDetails) => void) | undefined;
  filter?: { urls: string[] };

  addListener(listener: (details: RedirectDetails) => void, filter: { urls: string[] }): void {
    this.listener = listener;
    this.filter = filter;
  }

  removeListener(listener: (details: RedirectDetails) => void): void {
    if (this.listener === listener) this.listener = undefined;
  }
}

describe("redirect observer", () => {
  it("returns only the exact HTTPS redirect origin and removes its listener", async () => {
    const event = new FakeRedirectEvent();
    const requestUrl = "https://ntulearn.ntu.edu.sg/bbcswebdav/file.pdf?signed=secret";
    let requestInit: RequestInit | undefined;
    const origin = await observeFirstUnapprovedRedirectOrigin(
      requestUrl,
      new Set(["https://ntulearn.ntu.edu.sg"]),
      event,
      (_url, init) => {
        requestInit = init;
        event.listener?.({
          url: requestUrl,
          redirectUrl: "https://alt-example.blackboard.com/path/file.pdf?token=secret"
        });
        return Promise.reject(new Error("destination permission missing"));
      }
    );
    expect(origin).toBe("https://alt-example.blackboard.com");
    expect(event.filter).toEqual({
      urls: ["https://ntulearn.ntu.edu.sg/bbcswebdav/file.pdf*"]
    });
    expect(event.listener).toBeUndefined();
    expect(requestInit).toMatchObject({ cache: "no-store" });
    expect(requestInit?.headers).toBeUndefined();
  });

  it("does not accept a non-HTTPS destination", async () => {
    const event = new FakeRedirectEvent();
    const requestUrl = "https://ntulearn.ntu.edu.sg/bbcswebdav/file.pdf";
    await expect(
      observeFirstUnapprovedRedirectOrigin(
        requestUrl,
        new Set(["https://ntulearn.ntu.edu.sg"]),
        event,
        () => {
          event.listener?.({ url: requestUrl, redirectUrl: "http://files.example.test/a.pdf" });
          return Promise.resolve(new Response(null, { status: 204 }));
        }
      )
    ).resolves.toBeNull();
  });

  it("skips approved hops and observes the next exact origin", async () => {
    const event = new FakeRedirectEvent();
    const requestUrl = "https://ntulearn.ntu.edu.sg/bbcswebdav/file.pdf";
    const origin = await observeFirstUnapprovedRedirectOrigin(
      requestUrl,
      new Set(["https://ntulearn.ntu.edu.sg", "https://files-a.blackboard.com"]),
      event,
      () => {
        event.listener?.({
          url: requestUrl,
          redirectUrl: "https://files-a.blackboard.com/redirect"
        });
        event.listener?.({
          url: "https://files-a.blackboard.com/redirect",
          redirectUrl: "https://xythos.prod.files.blackboard.com/file.pdf?secret=1"
        });
        return Promise.reject(new Error("next permission missing"));
      }
    );
    expect(origin).toBe("https://xythos.prod.files.blackboard.com");
    expect(event.filter?.urls).toContain("https://files-a.blackboard.com/*");
  });
});
