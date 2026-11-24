import { describe, expect, it } from "vitest";
import { StreamTextRenderer } from "./stream-render";
describe("coalesced stream rendering", () => {
  it("retains hidden deltas, coalesces frames and releases content on clear/dispose", () => {
    const node = {
      data: "",
      appendData(text: string) {
        this.data += text;
      }
    };
    let children: unknown[] = [],
      next = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const target = {
      ownerDocument: { createTextNode: () => node },
      replaceChildren: (...nodes: unknown[]) => {
        children = nodes;
      }
    };
    const view = new StreamTextRenderer(
      target as unknown as HTMLElement,
      (callback) => {
        frames.set(++next, callback);
        return next;
      },
      (id) => {
        frames.delete(id);
      }
    );
    for (let n = 0; n < 10000; n++) view.append("delta\n");
    expect(frames.size).toBe(1);
    expect(children).toHaveLength(1);
    expect(view.contents()).toBe("delta\n".repeat(10000));
    view.setVisible(false);
    expect(frames.size).toBe(0);
    view.append("hidden");
    expect(node.data).toBe("");
    view.setVisible(true);
    expect(node.data).toBe("delta\n".repeat(10000) + "hidden");
    view.append("pending");
    view.clear();
    expect(view.contents()).toBe("");
    expect(frames.size).toBe(0);
    view.dispose();
    view.append("late");
    expect(children).toHaveLength(0);
    expect(view.contents()).toBe("");
  });
});
