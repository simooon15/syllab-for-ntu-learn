import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityHub, redactActivity } from "./activity";

afterEach(() => vi.useRealTimers());
describe("ephemeral provider Activity", () => {
  it("redacts credentials including an unfinished streamed prefix and internal references", () => {
    const credential = ["synthetic", "credential", "only"].join("-");
    expect(
      redactActivity(
        `Reading assessments\n${credential}\nsourceId: source_internal\n${credential.slice(0, 8)}`,
        credential
      )
    ).toBe("Reading assessments");
  });
  it("throttles, bounds recent content and clears every completed call", () => {
    vi.useFakeTimers();
    const hub = new ActivityHub();
    const views: string[][] = [];
    hub.subscribe((_scope, view) => views.push(view.snippets));
    const scope = { courseId: "course", workflowId: "workflow", task: "A" };
    hub.start("call", scope, "");
    for (let index = 0; index < 100; index += 1) hub.delta("call", "Reading course assessments. ");
    expect(views).toHaveLength(0);
    vi.advanceTimersByTime(200);
    expect(views).toHaveLength(1);
    expect(views[0]?.[0]?.length).toBeLessThanOrEqual(600);
    hub.end("call");
    expect(views.at(-1)).toEqual([]);
    hub.delta("call", "late output");
    vi.advanceTimersByTime(1000);
    expect(views).toHaveLength(2);
  });
});

it("keeps reasoning visible when streamed JSON contains filtered internal references", () => {
  vi.useFakeTimers();
  const hub = new ActivityHub();
  const views: string[][] = [];
  hub.subscribe((_scope, view) => views.push(view.snippets));
  hub.start("call", { courseId: "course", workflowId: "workflow", task: "A" }, "");
  hub.delta("call", "Comparing assessment requirements.", "reasoning");
  hub.delta("call", '{"sourceId":"src_synthetic","drafts":[]}', "content");
  vi.advanceTimersByTime(200);
  expect(views.at(-1)).toEqual(["Comparing assessment requirements."]);
  const resumed: string[][] = [];
  hub.subscribe((_scope, view) => resumed.push(view.snippets));
  expect(resumed.at(-1)).toEqual(views.at(-1));
  hub.end("call");
  expect(views.at(-1)).toEqual([]);
});

it("bounds the combined view across concurrent streams", () => {
  vi.useFakeTimers();
  const hub = new ActivityHub();
  let snippets: string[] = [];
  hub.subscribe((_scope, view) => {
    snippets = view.snippets;
  });
  for (let i = 0; i < 10; i++) {
    hub.start(String(i), { courseId: "course", workflowId: "workflow", task: "A" }, "");
    hub.delta(String(i), "Reading assessment requirements. ".repeat(100));
  }
  vi.advanceTimersByTime(200);
  expect(snippets).toHaveLength(3);
  expect(snippets.join("").length).toBeLessThanOrEqual(600);
  for (let i = 0; i < 10; i++) hub.end(String(i));
  expect(snippets).toEqual([]);
});

it("preserves full independent logical channels then releases them on completion", () => {
  const hub = new ActivityHub();
  hub.start("long", { courseId: "course", workflowId: "workflow", task: "A" }, "");
  const reasoning = "Measured reasoning. ".repeat(10000);
  const content = '{"sourceId":"synthetic"}'.repeat(10000);
  hub.delta("long", reasoning, "reasoning");
  hub.delta("long", content, "content");
  expect(hub.contents("long")).toEqual({ reasoning, content });
  hub.end("long");
  expect(hub.contents("long")).toBeNull();
});
