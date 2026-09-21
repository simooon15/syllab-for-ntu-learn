import { describe, expect, it } from "vitest";

import type { DiscoveredSource } from "@syllab/contracts";

import { BlackboardMachinePort, cacheDiscoveredSources } from "./blackboard";
import type { CourseRecord, SourceRecord } from "./domain";

const course: CourseRecord = {
  courseId: "course-1",
  semesterId: "semester-1",
  courseCode: "MA6081",
  courseName: "Fundamentals of Project Management",
  curriculum: true,
  established: true,
  currentRevision: 1,
  consecutiveCheckFailures: 0,
  updatedAt: "2026-09-20T00:00:00.000Z"
};

function discovered(overrides: Partial<DiscoveredSource>): DiscoveredSource {
  return {
    sourceId: "content:item-1",
    courseId: course.courseId,
    scanId: "scan-1",
    nativeItemId: "item-1",
    kind: "course-content-item",
    title: "Item",
    discoveryPath: ["content-root", "content:item-1"],
    depth: 0,
    status: "discovered",
    ...overrides
  };
}

function stored(source: DiscoveredSource): SourceRecord {
  return {
    sourceId: source.sourceId,
    courseId: source.courseId,
    nativeItemId: source.nativeItemId,
    kind: source.kind,
    title: source.title,
    updatedAt: "2026-09-20T00:00:00.000Z"
  };
}

function machine(sources: DiscoveredSource[]): BlackboardMachinePort {
  cacheDiscoveredSources(course.courseId, sources);
  return new BlackboardMachinePort({
    api: () => ({ get: () => Promise.reject(new Error("UNUSED")) }),
    parseAttachment: () => Promise.reject(new Error("UNUSED")),
    missingPermissionOrigins: () => Promise.resolve([]),
    observeRedirect: () => Promise.resolve(null),
    recordPermissionOrigin: () => Promise.resolve()
  });
}

describe("BlackboardMachinePort empty content classification", () => {
  it("does not use the local Source type to waive empty coverage", async () => {
    const source = discovered({ nativeTypeHint: "resource/x-bb-folder" });
    const result = await machine([source]).fetchAndParse(stored(source), course, 42);
    expect(result).toMatchObject({
      fetchStatus: "failed",
      parseStatus: "not-attempted",
      errorCode: "NO_EXTRACTABLE_TEXT"
    });
  });

  it("keeps an unexplained empty semantic Source as failed coverage", async () => {
    const source = discovered({ kind: "assignment", nativeTypeHint: "resource/x-bb-blti-link" });
    const result = await machine([source]).fetchAndParse(stored(source), course, 42);
    expect(result).toMatchObject({
      fetchStatus: "failed",
      parseStatus: "not-attempted",
      errorCode: "NO_EXTRACTABLE_TEXT"
    });
  });

  it("passes mechanically captured structured metadata through as parsed Source text", async () => {
    const source = discovered({
      nativeTypeHint: "resource/x-bb-blti-link",
      rawText:
        "<p>contentDetail.resource/x-bb-blti-link.title: Final submission</p><p>contentDetail.resource/x-bb-blti-link.dueDate: 2026-10-18</p>"
    });
    const result = await machine([source]).fetchAndParse(stored(source), course, 42);
    expect(result).toMatchObject({
      fetchStatus: "ok",
      parseStatus: "ok"
    });
    expect(result.text).toContain("contentDetail.resource/x-bb-blti-link.title: Final submission");
    expect(result.text).toContain("contentDetail.resource/x-bb-blti-link.dueDate: 2026-10-18");
  });
});
