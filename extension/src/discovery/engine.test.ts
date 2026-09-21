import { describe, expect, it } from "vitest";

import { runDiscovery } from "./engine";
import { DiscoveryApiError, type DiscoveryApiPort, type DiscoveryCheckpoint } from "./domain";

class FixtureApi implements DiscoveryApiPort {
  readonly calls: string[] = [];

  constructor(private readonly fixtures: ReadonlyMap<string, object | Error>) {}

  get(endpoint: string): Promise<unknown> {
    this.calls.push(endpoint);
    const fixture = this.fixtures.get(endpoint);
    if (fixture instanceof Error) return Promise.reject(fixture);
    if (fixture === undefined) {
      const detailId = new URL(endpoint).pathname.match(/\/contents\/([^/]+)$/)?.[1];
      if (detailId) return Promise.resolve({ id: decodeURIComponent(detailId) });
      return Promise.reject(new DiscoveryApiError("Missing fixture", 404));
    }
    return Promise.resolve(fixture);
  }
}

const origin = "https://ntulearn.example.test";
const base = `${origin}/learn/api/v1/courses/course_fixture`;

describe("discovery engine", () => {
  it("walks pagination and three levels while deduplicating items and cycles", async () => {
    const api = new FixtureApi(
      new Map<string, object | Error>([
        [
          `${base}/contents/ROOT/children`,
          {
            items: [{ id: "folder_a", title: "Module A", isFolder: true }],
            paging: { next: `${base}/contents/ROOT/children?page=2` }
          }
        ],
        [
          `${base}/contents/ROOT/children?page=2`,
          { items: [{ id: "folder_a", title: "Module A duplicate", isFolder: true }] }
        ],
        [
          `${base}/contents/folder_a/children`,
          { items: [{ id: "folder_b", title: "Module B", isLearningModule: true }] }
        ],
        [
          `${base}/contents/folder_b/children`,
          {
            items: [
              { id: "folder_a", title: "Cycle to Module A", isFolder: true },
              {
                id: "assignment_1",
                title: "Project",
                type: "assignment",
                hasChildren: false
              }
            ]
          }
        ],
        [
          `${base}/contents/assignment_1`,
          {
            id: "assignment_1",
            title: "Project",
            contentHandler: { id: "resource/x-bb-assignment" },
            contentDetail: {
              files: [
                {
                  id: "file_1",
                  fileName: "Brief.pdf",
                  permanentUrl: "https://files.example.test/brief.pdf?signature=redacted"
                }
              ]
            }
          }
        ],
        [`${base}/announcements`, { announcements: [{ id: "announcement_1", title: "Welcome" }] }]
      ])
    );
    const checkpoints: number[] = [];
    const result = await runDiscovery({
      scanId: "scan_fixture",
      courseId: "course_fixture",
      origin,
      api,
      onCheckpoint(state) {
        checkpoints.push(state.pagesProcessed);
        return Promise.resolve();
      }
    });

    expect(result.status).toBe("Complete");
    expect(result.checkpoint.sources.map((source) => source.sourceId)).toEqual([
      "content:folder_a",
      "content:folder_b",
      "content:assignment_1",
      "attachment:assignment_1:file_1",
      "announcement:announcement_1"
    ]);
    expect(result.checkpoint.sources.find((source) => source.kind === "attachment")).toMatchObject({
      parentSourceId: "content:assignment_1",
      canonicalUrl: "https://files.example.test/brief.pdf"
    });
    expect(api.calls.filter((call) => call.includes("folder_a/children"))).toHaveLength(1);
    expect(checkpoints.length).toBeGreaterThan(3);
  });

  it("reads the text out of a body that is an object rather than a string", async () => {
    // The platform sends `body` as `{ rawText, displayText, webLocation, fileLocation }`. Reading
    // only the string-shaped keys — which is what this did — left every announcement with a title
    // and no text: on MA6081 all seven were dropped, and one of them held the presentation schedule.
    // (Gate 3 finding F29.)
    const api = new FixtureApi(
      new Map<string, object | Error>([
        [`${base}/contents/ROOT/children`, { items: [] }],
        [
          `${base}/announcements`,
          {
            announcements: [
              {
                id: "announcement_1",
                title: "Group Presentation schedule and time",
                body: {
                  rawText: "<p>Presentation</p><table><tr><td>18 Oct, 10am</td></tr></table>",
                  displayText: "Presentation · 18 Oct, 10am",
                  webLocation: "https://ntulearn.example.test/courses/1/content/_1_1/embedded/"
                }
              }
            ]
          }
        ]
      ])
    );
    const result = await runDiscovery({
      scanId: "scan_fixture",
      courseId: "course_fixture",
      origin,
      api
    });

    const announcement = result.checkpoint.sources.find((source) => source.kind === "announcement");
    expect(announcement?.rawText).toContain(
      "body.rawText: &lt;p&gt;Presentation&lt;/p&gt;&lt;table&gt;&lt;tr&gt;&lt;td&gt;18 Oct, 10am&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;"
    );
    expect(announcement?.rawText).toContain("body.displayText: Presentation · 18 Oct, 10am");
  });

  it("mechanically captures every structured field without locally judging Assessment meaning", async () => {
    const api = new FixtureApi(
      new Map<string, object | Error>([
        [
          `${base}/contents/ROOT/children`,
          {
            items: [
              {
                id: "folder_assignment",
                title: "Assignment",
                contentHandler: "resource/x-bb-folder"
              },
              {
                id: "quiz_1",
                title: "Final quiz",
                contentHandler: "resource/x-bb-asmt-test-link",
                hasChildren: false
              }
            ]
          }
        ],
        [`${base}/contents/folder_assignment/children`, { items: [] }],
        [
          `${base}/contents/folder_assignment`,
          {
            id: "folder_assignment",
            title: "Assignment",
            contentHandler: "resource/x-bb-folder",
            body: { rawText: "" }
          }
        ],
        [
          `${base}/contents/quiz_1`,
          {
            id: "quiz_1",
            title: "Final quiz",
            contentHandler: "resource/x-bb-asmt-test-link",
            body: { rawText: "" },
            genericReadOnlyData: { dueDate: "2026-10-18T10:00:00Z" },
            contentDetail: {
              "resource/x-bb-asmt-test-link": {
                test: {
                  deployedAssessmentType: "Test",
                  deploymentSettings: {
                    timeLimit: 35,
                    isBacktrackingProhibited: false,
                    isRandomizationOfQuestionsRequired: true,
                    isSecureBrowserRequiredToTake: false,
                    isDueDateEnforced: true
                  },
                  gradingColumn: { possible: 25 },
                  assessment: { title: "Final quiz", questionCount: 25, totalPoints: 25 }
                }
              }
            }
          }
        ],
        [`${base}/announcements`, { announcements: [] }]
      ])
    );

    const result = await runDiscovery({
      scanId: "scan_fixture",
      courseId: "course_fixture",
      origin,
      api
    });

    const folder = result.checkpoint.sources.find(
      (source) => source.sourceId === "content:folder_assignment"
    );
    const quiz = result.checkpoint.sources.find((source) => source.sourceId === "content:quiz_1");
    expect(folder?.kind).toBe("course-content-item");
    expect(quiz).toMatchObject({ kind: "assignment" });
    expect(quiz?.rawText).toContain(
      "contentDetail.resource/x-bb-asmt-test-link.test.assessment.title: Final quiz"
    );
    expect(quiz?.rawText).toContain("genericReadOnlyData.dueDate: 2026-10-18T10:00:00Z");
    expect(quiz?.rawText).toContain(
      "contentDetail.resource/x-bb-asmt-test-link.test.assessment.questionCount: 25"
    );
    expect(quiz?.rawText).toContain(
      "contentDetail.resource/x-bb-asmt-test-link.test.deploymentSettings.timeLimit: 35"
    );
    expect(folder?.rawText).toContain("contentHandler: resource/x-bb-folder");
    expect(folder?.rawText).toContain("body.rawText: ");
  });

  it("isolates a failed branch as Partial and treats a 400 child response as a leaf", async () => {
    const api = new FixtureApi(
      new Map<string, object | Error>([
        [
          `${base}/contents/ROOT/children`,
          {
            items: [
              { id: "unknown_leaf", title: "Unknown type" },
              { id: "broken_branch", title: "Broken folder", isFolder: true }
            ]
          }
        ],
        [
          `${base}/contents/unknown_leaf/children`,
          new DiscoveryApiError("Blackboard declared no children", 400)
        ],
        [
          `${base}/contents/broken_branch/children`,
          new DiscoveryApiError("Temporary API failure", 503)
        ],
        [`${base}/announcements`, { announcements: [] }]
      ])
    );

    const result = await runDiscovery({
      scanId: "scan_fixture",
      courseId: "course_fixture",
      origin,
      api
    });
    expect(result.status).toBe("Partial");
    expect(result.checkpoint.sources).toHaveLength(2);
    expect(result.checkpoint.issues).toEqual([
      expect.objectContaining({
        sourceId: "content:broken_branch",
        code: "API_REQUEST_FAILED",
        retryable: true
      })
    ]);
  });

  it("resumes from the persisted page cursor without replaying the completed page", async () => {
    const fixtures = new Map<string, object | Error>([
      [
        `${base}/contents/ROOT/children`,
        {
          items: [{ id: "first_item", title: "First", hasChildren: false }],
          paging: { next: `${base}/contents/ROOT/children?page=2` }
        }
      ],
      [
        `${base}/contents/ROOT/children?page=2`,
        { items: [{ id: "second_item", title: "Second", hasChildren: false }] }
      ],
      [`${base}/announcements`, { announcements: [] }]
    ]);
    const interruptedApi = new FixtureApi(fixtures);
    let persisted: DiscoveryCheckpoint | undefined;

    await expect(
      runDiscovery({
        scanId: "scan_resume",
        courseId: "course_fixture",
        origin,
        api: interruptedApi,
        onCheckpoint(state) {
          persisted = structuredClone(state);
          return Promise.reject(new Error("simulated service worker stop"));
        }
      })
    ).rejects.toThrow("simulated service worker stop");

    expect(persisted?.queue[0]?.nextPageUrl).toBe(`${base}/contents/ROOT/children?page=2`);
    if (!persisted) throw new Error("Expected a persisted discovery checkpoint");
    const resumedApi = new FixtureApi(fixtures);
    const result = await runDiscovery({
      scanId: "scan_resume",
      courseId: "course_fixture",
      origin,
      api: resumedApi,
      checkpoint: persisted
    });

    expect(result.status).toBe("Complete");
    expect(result.checkpoint.sources.map((source) => source.sourceId)).toEqual([
      "content:first_item",
      "content:second_item"
    ]);
    expect(resumedApi.calls).not.toContain(`${base}/contents/ROOT/children`);
    expect(resumedApi.calls).toContain(`${base}/contents/ROOT/children?page=2`);
  });

  it("rejects pagination that leaves the collection endpoint", async () => {
    const api = new FixtureApi(
      new Map<string, object | Error>([
        [
          `${base}/contents/ROOT/children`,
          { items: [], next: "https://unexpected.example.test/collect" }
        ],
        [`${base}/announcements`, { announcements: [] }]
      ])
    );
    const result = await runDiscovery({
      scanId: "scan_fixture",
      courseId: "course_fixture",
      origin,
      api
    });
    expect(result.status).toBe("Failed");
    expect(result.checkpoint.issues).toContainEqual(
      expect.objectContaining({ code: "OUT_OF_SCOPE_PAGINATION", retryable: false })
    );
  });

  it("marks a collection Partial when more items are declared without a cursor", async () => {
    const api = new FixtureApi(
      new Map<string, object | Error>([
        [
          `${base}/contents/ROOT/children`,
          { items: [{ id: "item_1", title: "Only returned item" }], totalCount: 2 }
        ],
        [`${base}/contents/item_1/children`, new DiscoveryApiError("Leaf", 400)],
        [`${base}/announcements`, { announcements: [] }]
      ])
    );

    const result = await runDiscovery({
      scanId: "scan_fixture",
      courseId: "course_fixture",
      origin,
      api
    });
    expect(result.status).toBe("Partial");
    expect(result.checkpoint.issues).toContainEqual(
      expect.objectContaining({ code: "UNRESOLVED_PAGINATION", retryable: false })
    );
  });
});
