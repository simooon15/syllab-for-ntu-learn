import type { DiscoveredSource } from "@syllab/contracts";
import { describe, expect, it, vi } from "vitest";

import type { FetchCheckpoint } from "./domain";
import { runFetch } from "./engine";
import { recordPermissionDecision } from "./permission-planner";

const attachments: DiscoveredSource[] = [
  {
    sourceId: "attachment:1",
    courseId: "course_1",
    scanId: "scan_1",
    nativeItemId: "a1",
    kind: "attachment",
    title: "One",
    requestUrl: "https://ntulearn.ntu.edu.sg/a1",
    discoveryPath: ["root"],
    depth: 1,
    status: "discovered"
  },
  {
    sourceId: "attachment:2",
    courseId: "course_1",
    scanId: "scan_1",
    nativeItemId: "a2",
    kind: "attachment",
    title: "Two",
    requestUrl: "https://ntulearn.ntu.edu.sg/a2",
    discoveryPath: ["root"],
    depth: 1,
    status: "discovered"
  }
];

describe("fetch engine", () => {
  it("waits without requesting permission and groups the exact origin", async () => {
    const checkpoints: FetchCheckpoint[] = [];
    const fetch = vi.fn();
    const result = await runFetch({
      scanId: "scan_1",
      sources: attachments,
      approvedOrigin: "https://ntulearn.ntu.edu.sg",
      ports: {
        containsPermission: () => Promise.resolve(false),
        observeRedirect: () => Promise.resolve("https://files.blackboard.com"),
        fetchAttachment: fetch,
        onCheckpoint: (value) => {
          checkpoints.push(value);
          return Promise.resolve();
        }
      }
    });
    expect(result.outcome).toBe("WaitingForPermission");
    expect(result.checkpoint.pendingOrigins[0]).toMatchObject({
      origin: "https://files.blackboard.com",
      permissionPattern: "https://files.blackboard.com/*",
      sourceIds: ["attachment:1", "attachment:2"],
      requested: false
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(checkpoints.length).toBeGreaterThan(0);
  });

  it("continues other sources after deny and produces Partial", async () => {
    const waiting = await runFetch({
      scanId: "scan_1",
      sources: attachments,
      approvedOrigin: "https://ntulearn.ntu.edu.sg",
      ports: {
        containsPermission: () => Promise.resolve(false),
        observeRedirect: (url) =>
          Promise.resolve(url.endsWith("a1") ? "https://files.blackboard.com" : null),
        fetchAttachment: (sourceId) => Promise.resolve({ sourceId, status: "fetched" }),
        onCheckpoint: () => Promise.resolve()
      }
    });
    const denied = recordPermissionDecision(
      waiting.checkpoint,
      "https://files.blackboard.com",
      false
    );
    const result = await runFetch({
      scanId: "scan_1",
      sources: attachments,
      approvedOrigin: "https://ntulearn.ntu.edu.sg",
      checkpoint: denied,
      ports: {
        containsPermission: () => Promise.resolve(false),
        observeRedirect: () => Promise.resolve(null),
        fetchAttachment: (sourceId) => Promise.resolve({ sourceId, status: "fetched" }),
        onCheckpoint: () => Promise.resolve()
      }
    });
    expect(result.outcome).toBe("Partial");
    expect(result.checkpoint.results).toEqual(
      expect.arrayContaining([
        { sourceId: "attachment:1", status: "permission-denied" },
        { sourceId: "attachment:2", status: "fetched" }
      ])
    );
  });
});
