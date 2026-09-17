import { describe, expect, it } from "vitest";

import type { DiscoveryCheckpoint } from "./domain";
import { summarizeDiscovery } from "./summary";

describe("summarizeDiscovery", () => {
  it("reports only aggregate coverage evidence", () => {
    const checkpoint: DiscoveryCheckpoint = {
      scanId: "scan_1",
      courseId: "course_1",
      queue: [],
      visitedContainerIds: ["ROOT", "folder_1"],
      visitedItemIds: ["folder_1", "assignment_1"],
      visitedPageUrls: [
        "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/course_1/contents/ROOT/children",
        "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/course_1/contents/ROOT/children?page=2",
        "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/course_1/contents/folder_1/children",
        "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/course_1/announcements"
      ],
      detailQueue: [],
      visitedDetailItemIds: ["folder_1", "assignment_1"],
      sources: [
        {
          sourceId: "content:folder_1",
          courseId: "course_1",
          scanId: "scan_1",
          nativeItemId: "folder_1",
          kind: "course-content-item",
          title: "redacted",
          discoveryPath: ["content-root", "content:folder_1"],
          depth: 0,
          status: "discovered"
        },
        {
          sourceId: "content:assignment_1",
          courseId: "course_1",
          scanId: "scan_1",
          nativeItemId: "assignment_1",
          kind: "assignment",
          title: "redacted",
          discoveryPath: ["content-root", "content:folder_1", "content:assignment_1"],
          depth: 2,
          status: "discovered"
        },
        {
          sourceId: "announcement:1",
          courseId: "course_1",
          scanId: "scan_1",
          nativeItemId: "1",
          kind: "announcement",
          title: "redacted",
          discoveryPath: ["announcements", "announcement:1"],
          depth: 0,
          status: "discovered"
        }
      ],
      issues: [],
      pagesProcessed: 4,
      announcementsComplete: true,
      complete: true
    };

    expect(summarizeDiscovery(checkpoint)).toEqual({
      detailCoverageComplete: true,
      complete: true,
      sourceCount: 3,
      issueCount: 0,
      contentPageCount: 3,
      contentDetailCount: 0,
      announcementPageCount: 1,
      paginationDetected: true,
      contentMaxDepth: 2,
      contentItemCount: 2,
      assignmentCount: 1,
      announcementCount: 1,
      attachmentCount: 0,
      attachmentOrigins: [],
      attachmentsMissingRequestUrl: 0
    });
  });
});
