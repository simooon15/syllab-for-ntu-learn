import { describe, expect, it } from "vitest";

import {
  addPendingOrigin,
  createFetchCheckpoint,
  exactOriginPattern,
  nextPendingOrigin,
  recordPermissionDecision
} from "./permission-planner";

describe("attachment permission planning", () => {
  it("groups sources by the exact discovered HTTPS origin", () => {
    const checkpoint = createFetchCheckpoint(
      "scan_1",
      [
        { sourceId: "a", requestUrl: "https://files-a.blackboard.com/a.pdf?sig=1" },
        { sourceId: "b", requestUrl: "https://files-a.blackboard.com/b.pdf?sig=2" },
        { sourceId: "c", requestUrl: "https://files-b.blackboard.com/c.pdf" },
        { sourceId: "same", requestUrl: "https://ntulearn.ntu.edu.sg/bbcswebdav/a.pdf" }
      ],
      "https://ntulearn.ntu.edu.sg"
    );
    expect(checkpoint.pendingOrigins).toEqual([
      {
        origin: "https://files-a.blackboard.com",
        permissionPattern: "https://files-a.blackboard.com/*",
        sourceIds: ["a", "b"],
        decision: "pending",
        requested: false
      },
      {
        origin: "https://files-b.blackboard.com",
        permissionPattern: "https://files-b.blackboard.com/*",
        sourceIds: ["c"],
        decision: "pending",
        requested: false
      }
    ]);
  });

  it("records one decision and never reopens the same origin", () => {
    const checkpoint = createFetchCheckpoint(
      "scan_1",
      [{ sourceId: "a", requestUrl: "https://files-a.blackboard.com/a.pdf" }],
      "https://ntulearn.ntu.edu.sg"
    );
    const denied = recordPermissionDecision(checkpoint, "https://files-a.blackboard.com", false);
    expect(denied.pendingOrigins[0]).toMatchObject({ requested: true, decision: "denied" });
    expect(nextPendingOrigin(denied)).toBeNull();
    expect(recordPermissionDecision(denied, "https://files-a.blackboard.com", true)).toEqual(
      denied
    );
  });

  it("rejects a wildcard or non-HTTPS permission target", () => {
    expect(() => exactOriginPattern("https://*.blackboard.com")).toThrow();
    expect(() => exactOriginPattern("http://files.blackboard.com")).toThrow();
  });

  it("deduplicates a dynamically observed origin and groups its sources", () => {
    const checkpoint = createFetchCheckpoint("scan_1", [], "https://ntulearn.ntu.edu.sg");
    addPendingOrigin(checkpoint, "https://files-a.blackboard.com", "a");
    const grouped = addPendingOrigin(checkpoint, "https://files-a.blackboard.com", "b");
    expect(grouped.pendingOrigins).toHaveLength(1);
    expect(grouped.pendingOrigins[0]?.sourceIds).toEqual(["a", "b"]);
  });
});
