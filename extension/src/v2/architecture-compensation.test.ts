import { expect, it } from "vitest";
import { authorizeB2Compensation } from "./architecture-compensation";
import { newSession } from "./architecture-session";
it("preserves ambiguous attempt, frozen delivery and one-shot authorization across restart", () => {
  const session = newSession("s", "B2", "snapshot");
  const original = {
    id: "p",
    roundId: "r",
    segmentId: "g",
    request: "frozen",
    state: "dispatched" as const
  };
  session.requests.push(original);
  const request = authorizeB2Compensation(session, "039");
  expect(session.requests[0]).toEqual(original);
  expect(request).toMatchObject({
    request: "frozen",
    roundId: "r",
    segmentId: "g",
    state: "prepared",
    compensation: { replacesRequestId: "p" }
  });
  const restored = structuredClone(session);
  expect(authorizeB2Compensation(restored, "039")).toEqual(request);
  expect(restored.requests).toHaveLength(2);
  expect(() => authorizeB2Compensation(restored, "040")).toThrow("COMPENSATION_NOT_ELIGIBLE");
});
it("cannot compensate a known response or a different stage", () => {
  for (const stage of ["A", "B1", "C"] as const) {
    const s = newSession("s", stage, "x");
    s.requests.push({ id: "p", roundId: "r", segmentId: "g", request: "x", state: "dispatched" });
    expect(() => authorizeB2Compensation(s, "039")).toThrow();
  }
  const s = newSession("s", "B2", "x");
  s.requests.push({
    id: "p",
    roundId: "r",
    segmentId: "g",
    request: "x",
    state: "dispatched",
    response: { known: true }
  });
  expect(() => authorizeB2Compensation(s, "039")).toThrow();
});
