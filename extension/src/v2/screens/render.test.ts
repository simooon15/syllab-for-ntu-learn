import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it } from "vitest";

import {
  CATALOG,
  copyKeys,
  resetCopyUsage,
  SCAN_STAGES,
  setCopyValues,
  t,
  usedCopyKeys,
  type CopyKey
} from "../copy";
import type { Mutation, ScreenId } from "../contract";
import {
  allFixtures,
  courseView,
  currentSemester,
  historicalSemester,
  statusCueFixtures,
  taskStatus,
  type Fixture
} from "./fixtures";
import { primaryStatus, type Actions, type RuntimeNotice, type RuntimeState } from "./patterns";
import { renderApp, resetUiState, uiState } from "./render";
import { installAppRoot, installTestDom, TestElement, type TestDocument } from "./test-dom";

/** The complete ScreenId list from the frozen contract, written out so a new id cannot be missed. */
const SCREEN_IDS: ScreenId[] = [
  "SEM-01",
  "SEM-02",
  "SEM-03",
  "SEM-04",
  "SEM-05",
  "SEM-06",
  "SEM-07",
  "CRS-01",
  "CRS-02",
  "CRS-03",
  "CRS-04",
  "CRS-05",
  "CRS-06",
  "ISC-01",
  "ISC-02",
  "ISC-03",
  "ISC-04",
  "ISC-05",
  "ISC-06",
  "IRV-01",
  "IRV-02",
  "IRV-03",
  "IRV-04",
  "IRV-05",
  "IRV-06",
  "CRV-01",
  "CRV-02",
  "CRV-03",
  "CRV-04",
  "CRV-05",
  "CRV-06",
  "RBL-01",
  "RBL-02",
  "RBL-03",
  "RBL-04",
  "CAL-01",
  "CAL-02",
  "SET-01",
  "SET-02",
  "SET-03",
  "SET-04",
  "SET-05",
  "BKP-01",
  "BKP-02",
  "BKP-03",
  "BKP-04",
  "BKP-05"
];

interface TestActions extends Actions {
  mutations: Mutation[];
  screens: ScreenId[];
  notices: RuntimeNotice[];
  calendarExports: string[];
  backupExports: number;
  restoreConfirmations: number;
}

const CATALOG_VALUES: Record<CopyKey, string> = { ...CATALOG };

function createActions(runtime: RuntimeState): TestActions {
  const mutations: Mutation[] = [];
  const screens: ScreenId[] = [];
  const notices: RuntimeNotice[] = [];
  const calendarExports: string[] = [];
  let backupExports = 0;
  let restoreConfirmations = 0;
  return {
    runtime,
    mutations,
    screens,
    notices,
    get calendarExports() {
      return calendarExports;
    },
    get backupExports() {
      return backupExports;
    },
    get restoreConfirmations() {
      return restoreConfirmations;
    },
    onMutation: (mutation) => {
      mutations.push(mutation);
    },
    onOpenScreen: (screen) => {
      screens.push(screen);
    },
    onOpenSettings: () => {
      screens.push("SET-01");
    },
    onOpenFullPage: () => undefined,
    onExportCalendar: (courseId) => {
      calendarExports.push(courseId);
    },
    onExportBackup: () => {
      backupExports += 1;
    },
    onRestoreBackup: () => undefined,
    onConfirmRestore: () => {
      restoreConfirmations += 1;
    },
    onCancelRestore: () => undefined,
    onSetApiKey: () => undefined,
    onValidateApiKey: () => undefined,
    onSetAuthorization: () => undefined,
    onGrantPermission: () => undefined,
    onHintSeen: () => undefined,
    onNotify: (notice) => {
      notices.push(notice);
      runtime.notice = notice;
    },
    onDismissNotice: () => {
      runtime.notice = undefined;
    },
    onRetry: () => undefined
  };
}

interface Rendered {
  document: TestDocument;
  root: TestElement;
  actions: TestActions;
}

function renderFixture(fixture: Fixture): Rendered {
  const document = installTestDom(fixture.view.surface);
  resetUiState();
  Object.assign(uiState(), fixture.ui ?? {});
  const runtime: RuntimeState = {
    hints: fixture.hints ?? {},
    notice: undefined,
    error: undefined,
    restoreStage: undefined,
    ...fixture.runtime
  };
  const actions = createActions(runtime);
  const root = installAppRoot(document);
  renderApp(root as unknown as HTMLElement, fixture.view, actions);
  return { document, root, actions };
}

function renderView(view: Fixture["view"], options: Partial<Fixture> = {}): Rendered {
  return renderFixture({ name: "ad-hoc", screen: view.screen, view, ...options });
}

function screenNodes(root: TestElement): TestElement[] {
  return root.querySelectorAll("[data-screen]");
}

function screensIn(node: TestElement): string[] {
  return screenNodes(node).map((element) => element.dataset.screen ?? "");
}

/** The one screen element this render produced, ignoring a runtime-level error bar. */
function topScreen(root: TestElement): TestElement {
  const elements = root.childNodes.filter(
    (child): child is TestElement => child instanceof TestElement
  );
  const screen = elements.find((element) => element.dataset.screen !== undefined);
  if (!screen) throw new Error("NO_SCREEN_RENDERED");
  return screen;
}

function textOf(root: TestElement): string {
  return root.textContent;
}

function pieceOf(root: TestElement, selector: string): TestElement {
  const found = root.querySelector(selector);
  if (!found) throw new Error(`MISSING_NODE:${selector}`);
  return found;
}

function allTextPieces(node: TestElement): string[] {
  const pieces: string[] = [];
  const visit = (current: TestElement): void => {
    const elementChildren = current.childNodes.filter(
      (child): child is TestElement => child instanceof TestElement
    );
    if (elementChildren.length === 0) {
      const text = current.textContent.trim();
      if (text.length > 0) pieces.push(text);
      return;
    }
    for (const child of current.childNodes) {
      if (child instanceof TestElement) visit(child);
    }
  };
  visit(node);
  return pieces;
}

function collectStrings(value: unknown, into: Set<string>): void {
  if (typeof value === "string") {
    if (value.trim().length > 0) into.add(value);
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    into.add(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into);
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) collectStrings(item, into);
  }
}

/**
 * Every catalogue key any module in the extension names, read from the source.
 *
 * The render pass above can only see the screens, and screens are not the only layer that shows
 * text: `view.ts` builds the values they print — an Evidence title, a failure reason, a Review
 * title — and a sentence written there is outside the catalogue without being visible here, which
 * is how three of them were found. (Gate 3 finding F34.)
 *
 * `copy.ts` itself is skipped: every key is named by its own declaration, so reading it would make
 * this set the whole catalogue and the check behind it say nothing.
 */
function referencedCopyKeys(): Set<string> {
  const extensionRoot = fileURLToPath(new URL("../../..", import.meta.url));
  const known = new Set<string>(copyKeys());
  const asked = new Set<string>();
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) continue;
      if (path === join(extensionRoot, "src", "v2", "copy.ts")) continue;
      const source = readFileSync(path, "utf8");
      for (const match of source.matchAll(/"([A-Za-z][A-Za-z0-9]*)"/g)) {
        const name = match[1];
        if (name !== undefined && known.has(name)) asked.add(name);
      }
    }
  };
  walk(join(extensionRoot, "src"));
  return asked;
}

beforeEach(() => {
  resetCopyUsage();
  resetUiState();
});

describe("every screen renders", () => {
  it("renders each fixture as the screen the spec names", () => {
    for (const fixture of allFixtures()) {
      const { root } = renderFixture(fixture);
      expect(topScreen(root).dataset.screen, fixture.name).toBe(fixture.screen);
    }
  });

  it("embeds the states a screen carries", () => {
    for (const fixture of allFixtures()) {
      if (!fixture.embedded) continue;
      const { root } = renderFixture(fixture);
      const seen = screensIn(root);
      for (const embedded of fixture.embedded) {
        expect(seen, `${fixture.name} embeds ${embedded}`).toContain(embedded);
      }
    }
  });

  it("reaches every ScreenId in the contract", () => {
    const seen = new Set<ScreenId>();
    for (const fixture of allFixtures()) {
      const { root } = renderFixture(fixture);
      for (const id of screensIn(root)) seen.add(id as ScreenId);
    }
    // CRS-05 is the evidence state of one fact: it is reached by using a fact, not by a route.
    const { root } = renderFixture({ name: "CRS-05", screen: "CRS-01", view: withCourseFixture() });
    clickValue(root, '[data-fact-id="f-project-deadline"] .fact-value');
    for (const id of screensIn(root)) seen.add(id as ScreenId);

    // CRV-02 reuses the Initial Review layout and RBL-02/RBL-04 reuse the Scan screens;
    // both still render under their own ids, so nothing may be missing.
    expect(SCREEN_IDS.filter((id) => !seen.has(id))).toEqual([]);
  });
});

function withCourseFixture(): Fixture["view"] {
  return {
    surface: "full-page",
    screen: "CRS-01",
    courseId: "course-1",
    course: courseView,
    semester: currentSemester
  };
}

function clickValue(root: TestElement, selector: string): void {
  let node = root.querySelector(selector);
  if (!node) {
    // The evidence state replaced the value; the trigger is the locator inside it.
    node = root.querySelector(".evidence-locator");
  }
  if (!node) throw new Error(`NO_TRIGGER:${selector}`);
  node.dispatchEvent({
    type: "click",
    preventDefault: () => undefined,
    stopPropagation: () => undefined
  });
}

describe("assessment grouping and hierarchy", () => {
  it("orders groups Assignments, Projects, Quizzes & Tests, Exams, Other", () => {
    const { root } = renderView(withCourseFixture());
    const groups = root.querySelectorAll(".group-heading").map((node) => node.textContent);
    expect(groups).toEqual(["Assignments", "Projects", "Quizzes & Tests", "Exams", "Other"]);
  });

  it("sorts by name inside a group", () => {
    const { root } = renderView(withCourseFixture());
    const assignments = root
      .querySelectorAll('[data-kind-group="Assignments"] .assessment-name')
      .map((node) => node.textContent);
    expect(assignments).toEqual(["Individual Assignment", "Zeta Assignment"]);
  });

  it("keeps a Component inside its parent Assessment", () => {
    const { root } = renderView(withCourseFixture());
    const parent = pieceOf(root, '[data-assessment-id="a-project"]');
    const component = pieceOf(root, '[data-assessment-id="a-project-report"]');
    expect(component.className).toContain("is-component");
    expect(pieceOf(component, ".component-name").tagName).toBe("H4");
    expect(parent.querySelectorAll('[data-assessment-id="a-project-report"]').length).toBe(1);
    const direct = root
      .querySelectorAll(".course-body > .assessment")
      .map((node) => node.dataset.assessmentId ?? "");
    expect(direct).not.toContain("a-project-report");
  });

  it("renders an Assessment Series as the top-level object with lighter instances", () => {
    const { root } = renderView(withCourseFixture());
    const series = pieceOf(root, '[data-assessment-id="a-quizzes"]');
    expect(series.querySelector(".assessment-name")?.textContent).toBe("Quizzes");
    expect(series.querySelector(".series-note")?.textContent).toBe("3 instances");
    const instances = series.querySelectorAll(".series-instance");
    expect(instances.length).toBe(2);
    expect(instances[0]?.textContent).toContain("Quiz 1");
    expect(instances[0]?.tagName).toBe("LI");
  });

  it("renders Course-wide Constraints after every Assessment", () => {
    const { root } = renderView(withCourseFixture());
    const body = pieceOf(root, ".course-body");
    const order = body.querySelectorAll(".assessment, .constraint, .group-heading");
    const constraint = order.findIndex((node) => node.classList.contains("constraint"));
    const lastAssessment = order
      .map((node) => node.classList.contains("assessment"))
      .lastIndexOf(true);
    expect(constraint).toBeGreaterThan(lastAssessment);
    expect(pieceOf(root, ".constraint-content").textContent).toBe(
      "Late submissions lose 10% per day."
    );
  });

  it("attaches a mark to the fact it belongs to, not to the whole Assessment", () => {
    const { root } = renderView(withCourseFixture());
    const changed = pieceOf(root, '[data-fact-id="f-project-weight"]');
    expect(changed.querySelector(".mark-changed")?.textContent).toBe("Changed");
    const article = pieceOf(root, '[data-assessment-id="a-project"]');
    expect(article.querySelector(".assessment-heading .mark-changed")).toBeNull();
  });

  it("attaches Possibly removed at object level without fading or error styling", () => {
    const { root } = renderView(withCourseFixture());
    const article = pieceOf(root, '[data-assessment-id="a-project"]');
    const mark = article.querySelector(".assessment-heading .mark-possiblyremoved");
    expect(mark?.textContent).toBe("Possibly removed");
    expect(article.className).not.toContain("is-faded");
    expect(article.className).not.toContain("is-error");
  });

  it("shows the specific unresolved question instead of a generic one", () => {
    const { root } = renderView(withCourseFixture());
    const row = pieceOf(root, '[data-fact-id="f-project-size"]');
    expect(row.querySelector(".fact-question")?.textContent).toContain("Group size is unclear");
    expect(textOf(root)).not.toContain("Uncertain");
  });
});

describe("status position", () => {
  it("shows exactly one cue, in priority order", () => {
    for (const cues of statusCueFixtures) {
      expect(primaryStatus(cues)).toEqual(cues[cues.length - 1]);
    }
    expect(primaryStatus([])).toBeNull();
  });

  it("never stacks cues in the Course Status Area", () => {
    const view = {
      ...withCourseFixture(),
      course: {
        ...courseView,
        status: [
          { kind: "freshness" as const, copy: "Checked 2h ago" },
          { kind: "checking" as const, copy: "Checking…" },
          { kind: "pending-review" as const, count: 2, copy: "2 to review" },
          { kind: "needs-attention" as const, copy: "Needs attention" },
          { kind: "api-key" as const, copy: "API key required" }
        ]
      }
    };
    const { root } = renderView(view);
    const cue = pieceOf(root, ".status-area .status-cue");
    expect(root.querySelectorAll(".status-area .status-cue").length).toBe(1);
    expect(cue.textContent).toBe("API key needs attention");
  });

  it("uses the surface copy for a pending Review", () => {
    const fullPage = renderView({ ...withCourseFixture(), surface: "full-page" });
    expect(pieceOf(fullPage.root, ".status-area .status-cue").textContent).toBe(
      "2 changes to review"
    );
    const sidePanel = renderView({
      ...withCourseFixture(),
      surface: "side-panel",
      screen: "CRS-02"
    });
    expect(pieceOf(sidePanel.root, ".status-area .status-cue").textContent).toBe("Review · 2");
  });

  it("opens the Review from the status area as navigation", () => {
    const { root, actions } = renderView(withCourseFixture());
    pieceOf(root, ".status-area .status-cue").click();
    expect(actions.screens).toEqual(["IRV-01"]);
  });

  it("keeps Task Status out of navigation", () => {
    const { root } = renderView({
      ...withCourseFixture(),
      task: { workflowId: "wf-1", state: "working", phase: "Reading course materials…" }
    });
    const task = pieceOf(root, ".task-block");
    expect(task.dataset.screen).toBeUndefined();
    expect(task.querySelectorAll("button").length).toBe(0);
    expect(textOf(root)).toContain("Reading course materials…");
  });

  it("shows the four fixed Scan stages and never a percentage", () => {
    const { root } = renderView({
      surface: "side-panel",
      screen: "ISC-02",
      courseId: "course-2",
      task: { workflowId: "wf-1", state: "working", phase: "Understanding course information…" }
    });
    const stages = root.querySelectorAll(".task-list li").map((node) => node.textContent);
    expect(stages).toEqual([...SCAN_STAGES]);
    expect(pieceOf(root, '.task-list li[data-state="active"]').textContent).toBe(
      "Understanding course information…"
    );
    expect(textOf(root)).not.toContain("%");
  });
});

describe("facts and evidence", () => {
  it("swaps a fact for its evidence in place and back again", () => {
    const { root } = renderView(withCourseFixture());
    const value = pieceOf(root, '[data-fact-id="f-project-deadline"] .fact-value');
    expect(value.textContent).toBe("12 Nov");
    value.click();

    const evidence = pieceOf(root, '[data-fact-id="f-project-deadline"] .evidence');
    expect(evidence.dataset.screen).toBe("CRS-05");
    expect(pieceOf(root, ".evidence-locator").textContent).toBe("Course Guide · p.6");
    expect(pieceOf(root, ".evidence-excerpt").textContent).toBe("Submission is due on 18 October.");
    expect(root.querySelector('[data-fact-id="f-project-deadline"] .fact-value')).toBeNull();

    clickValue(root, '[data-fact-id="f-project-deadline"] .fact-value');
    expect(pieceOf(root, '[data-fact-id="f-project-deadline"] .fact-value').textContent).toBe(
      "12 Nov"
    );
  });

  it("has no explicit View evidence control", () => {
    const { root } = renderView(withCourseFixture());
    expect(textOf(root)).not.toContain("View evidence");
    expect(textOf(root)).not.toContain("View source");
  });

  it("discloses a long Requirement instead of truncating a fact with evidence", () => {
    const { root } = renderView(withCourseFixture());
    const requirement = pieceOf(root, '[data-fact-id="f-ind-requirement"]');
    expect(requirement.querySelector(".prose-block")).not.toBeNull();
    expect(requirement.textContent).toContain("Show more");
  });
});

describe("review", () => {
  it("focuses one Assessment with light progress and hides structural actions behind More…", () => {
    const { root } = renderView({
      ...withCourseFixture(),
      screen: "IRV-01",
      review: initialReviewFixture()
    });
    expect(pieceOf(root, ".review-progress").textContent).toBe("2 of 5");
    expect(pieceOf(root, ".review-actions .primary-action").textContent).toBe("Confirm");
    expect(textOf(root)).not.toContain("Same assessment as…");
    clickText(root, "More…");
    expect(textOf(root)).toContain("Same assessment as…");
    expect(textOf(root)).toContain("Split");
  });

  it("confirms the whole Assessment", () => {
    const { root, actions } = renderView({
      ...withCourseFixture(),
      screen: "IRV-01",
      review: initialReviewFixture()
    });
    pieceOf(root, ".primary-action").click();
    expect(actions.mutations).toEqual([{ kind: "ConfirmReviewItem", reviewItemId: "ri-initial" }]);
  });

  it("shows the first-use hint once", () => {
    const first = renderView(
      { ...withCourseFixture(), screen: "IRV-01", review: initialReviewFixture() },
      { ui: { splitOpen: true } }
    );
    expect(pieceOf(first.root, '[data-screen="IRV-05"]').textContent).toContain(
      "two or more separate assessments"
    );
    const second = renderView(
      { ...withCourseFixture(), screen: "IRV-01", review: initialReviewFixture() },
      { ui: { splitOpen: true }, hints: { split: true } }
    );
    expect(second.root.querySelector('[data-screen="IRV-05"]')).toBeNull();
  });

  it("offers Undo after an Exclude", () => {
    const { root, actions } = renderView({
      ...withCourseFixture(),
      screen: "IRV-01",
      review: initialReviewFixture()
    });
    clickText(root, "Exclude");
    expect(actions.mutations).toEqual([{ kind: "ExcludeReviewItem", reviewItemId: "ri-initial" }]);
    expect(actions.notices[0]?.screen).toBe("IRV-06");
    expect(actions.notices[0]?.actionLabel).toBe("Undo");
    // The runtime repaints with the notice; the renderer shows what it is handed.
    renderApp(
      root as unknown as HTMLElement,
      { ...withCourseFixture(), screen: "IRV-01", review: initialReviewFixture() },
      actions
    );
    expect(pieceOf(root, '[data-screen="IRV-06"]').textContent).toContain("Assessment excluded.");
    clickText(root, "Undo");
    expect(actions.mutations).toEqual([
      { kind: "ExcludeReviewItem", reviewItemId: "ri-initial" },
      { kind: "UndeleteExclusion", reviewItemId: "ri-initial" }
    ]);
  });

  it("shows a changed field as Current → Latest with Accept change primary", () => {
    const { root, actions } = renderView({
      ...withCourseFixture(),
      screen: "CRV-01",
      review: {
        reviewItemId: "ri-changed",
        kind: "change",
        changeType: "CHANGED",
        title: "Group Project",
        position: { index: 1, total: 2 },
        current: { label: "Current", values: [{ display: "10 Oct", evidence: [] }] },
        latest: { label: "Latest", values: [{ display: "18 Oct", evidence: [] }] },
        unresolvedQuestions: [],
        actions: ["AcceptChange", "KeepCurrent"]
      }
    });
    expect(pieceOf(root, ".primary-action").textContent).toBe("Accept change");
    expect(textOf(root)).toContain("10 Oct");
    expect(textOf(root)).toContain("18 Oct");
    pieceOf(root, ".primary-action").click();
    expect(actions.mutations).toEqual([{ kind: "AcceptChange", changeId: "ri-changed" }]);
  });

  it("lets each competing value be chosen and carry its own evidence", () => {
    const { root, actions } = renderView({
      ...withCourseFixture(),
      screen: "CRV-03",
      review: {
        reviewItemId: "ri-conflict",
        kind: "change",
        changeType: "CONFLICT",
        title: "Group Project",
        position: { index: 1, total: 1 },
        current: { label: "Current", values: [{ display: "10 Oct", evidence: [] }] },
        latest: {
          label: "Other values",
          values: [
            {
              display: "18 Oct",
              evidence: [
                {
                  evidenceId: "e1",
                  sourceTitle: "Course Guide",
                  locator: "p.6",
                  excerpt: "Due 18 October"
                }
              ]
            },
            {
              display: "20 Oct",
              evidence: [
                {
                  evidenceId: "e2",
                  sourceTitle: "Announcement",
                  locator: "1 Sep",
                  excerpt: "Due 20 October"
                }
              ]
            }
          ]
        },
        unresolvedQuestions: [],
        actions: ["ChooseValue", "EditValue"]
      }
    });
    const values = root.querySelectorAll(".conflict-value");
    expect(values.length).toBe(2);
    expect(pieceOf(root, ".conflict-value .fact-value").textContent).toBe("18 Oct");
    pieceOf(root, ".conflict-value .fact-value").click();
    expect(pieceOf(root, ".conflict-value .evidence-excerpt").textContent).toBe("Due 18 October");
    clickText(root, "Use this value");
    expect(actions.mutations).toEqual([
      {
        kind: "ResolveConflict",
        changeId: "ri-conflict",
        value: { state: "KNOWN", value: "18 Oct" }
      }
    ]);
  });

  it("keeps or removes a possibly removed Assessment", () => {
    const { root, actions } = renderView({
      ...withCourseFixture(),
      screen: "CRV-04",
      review: {
        reviewItemId: "ri-removed",
        kind: "change",
        changeType: "POSSIBLY_REMOVED",
        title: "Group Project",
        position: { index: 1, total: 1 },
        unresolvedQuestions: [],
        actions: ["Keep", "Remove"]
      }
    });
    expect(pieceOf(root, ".review-marks .mark-possiblyremoved").textContent).toBe(
      "Possibly removed"
    );
    expect(pieceOf(root, ".primary-action").textContent).toBe("Keep");
    pieceOf(root, ".primary-action").click();
    expect(actions.mutations).toEqual([{ kind: "KeepPossiblyRemoved", changeId: "ri-removed" }]);
  });

  it("asks the identity question with a same/different decision", () => {
    const { root, actions } = renderView({
      ...withCourseFixture(),
      screen: "CRV-05",
      review: {
        reviewItemId: "ri-identity",
        kind: "identity",
        changeType: "IDENTITY_UNCERTAIN",
        title: "Group Project",
        position: { index: 1, total: 1 },
        current: { label: "Current", values: [{ display: "Group Project", evidence: [] }] },
        latest: { label: "Latest", values: [{ display: "Final Group Project", evidence: [] }] },
        unresolvedQuestions: [],
        actions: ["SameAssessment", "DifferentAssessment"]
      }
    });
    expect(pieceOf(root, ".review-title").textContent).toBe("Is this the same assessment?");
    expect(textOf(root)).toContain("Final Group Project");
    pieceOf(root, ".primary-action").click();
    expect(actions.mutations).toEqual([
      { kind: "ResolveIdentity", changeId: "ri-identity", relationship: "SAME_ASSESSMENT" }
    ]);
  });

  it("renders a New Assessment Review with the Initial Review body", () => {
    const { root } = renderView({
      ...withCourseFixture(),
      screen: "CRV-02",
      review: { ...initialReviewFixture(), reviewItemId: "ri-new", changeType: "NEW" }
    });
    expect(topScreen(root).dataset.screen).toBe("CRV-02");
    expect(pieceOf(root, ".review-actions .primary-action").textContent).toBe("Confirm");
    expect(root.querySelector('[data-assessment-id="a-project"]')).not.toBeNull();
  });
});

function initialReviewFixture() {
  return {
    reviewItemId: "ri-initial",
    kind: "initial" as const,
    title: "Group Project",
    position: { index: 2, total: 5 },
    unresolvedQuestions: [],
    actions: [
      "Confirm" as const,
      "Edit" as const,
      "Exclude" as const,
      "ReviewLater" as const,
      "SameAssessmentAs" as const,
      "Split" as const
    ]
  };
}

function clickText(root: TestElement, text: string): void {
  const button = root.querySelectorAll("button").find((node) => node.textContent.trim() === text);
  if (!button) throw new Error(`NO_BUTTON:${text}`);
  button.click();
}

describe("rebuild, calendar and settings", () => {
  it("rebuild previews a whole Course Brief and only offers Use or Keep", () => {
    const { root, actions } = renderView({
      ...withCourseFixture(),
      screen: "RBL-03"
    });
    expect(pieceOf(root, ".task-heading").textContent).toBe("Rebuilt course preview");
    expect(textOf(root)).toContain("Group Project");
    const labels = root.querySelectorAll("button").map((node) => node.textContent.trim());
    expect(labels).toContain("Use rebuilt course");
    expect(labels).toContain("Keep current course");
    clickText(root, "Use rebuilt course");
    expect(actions.mutations).toEqual([{ kind: "UseRebuiltCourse" }]);
  });

  it("renders a partial Rebuild preview as view-only and keeps trusted state available", () => {
    const fixture = withCourseFixture();
    if (!fixture.course) throw new Error("missing course fixture");
    const { root, actions } = renderView({
      ...fixture,
      screen: "RBL-02",
      task: { workflowId: "wf-partial", state: "waiting" },
      rebuildPreview: {
        course: {
          ...fixture.course,
          assessments: fixture.course.assessments.map((assessment) => ({
            ...assessment,
            name: "Partial Rebuild Essay"
          }))
        },
        partial: true,
        failedSourceCount: 1,
        canAdopt: false
      }
    });

    expect(topScreen(root).dataset.screen).toBe("RBL-03");
    expect(pieceOf(root, ".task-heading").textContent).toBe("Partial rebuild preview");
    expect(textOf(root)).toContain("some course sources could not be processed");
    expect(textOf(root)).toContain("Your current course has not been changed.");
    expect(textOf(root)).toContain("cannot be used as your rebuilt course");
    expect(textOf(root)).toContain("Partial Rebuild Essay");
    const labels = root.querySelectorAll("button").map((node) => node.textContent.trim());
    expect(labels).not.toContain("Use rebuilt course");
    expect(labels).toContain("Keep current course");
    clickText(root, "Keep current course");
    expect(actions.mutations).toEqual([{ kind: "KeepCurrentCourse" }]);
  });

  it("confirms a rebuild without touching the current Course", () => {
    const { root, actions } = renderView(withCourseFixture(), {
      ui: { rebuildConfirmOpen: true }
    });
    expect(pieceOf(root, ".task-heading").textContent).toBe("Rebuild course");
    clickText(root, "Rebuild course");
    expect(actions.mutations).toEqual([{ kind: "RebuildCourse" }]);
  });

  it("previews Calendar events and exports them", () => {
    const { root, actions } = renderView({
      ...withCourseFixture(),
      screen: "CAL-01",
      exportPreview: {
        events: [{ title: "Group Project", date: "12 Nov" }],
        dateCount: 1,
        exportableCount: 1,
        unresolvedCount: 0
      }
    });
    expect(pieceOf(root, ".calendar-count").textContent).toBe("1 event");
    clickText(root, "Export");
    expect(actions.calendarExports).toEqual(["course-1"]);
    expect(pieceOf(root, ".calendar-event").textContent).toContain("12 Nov");
  });

  it("distinguishes an empty Course from one whose dates cannot be placed", () => {
    const named = (name: string): Fixture => {
      const found = allFixtures().find((entry) => entry.name === name);
      if (!found) throw new Error(`MISSING_FIXTURE:${name}`);
      return found;
    };

    // Partial: what resolved is listed and exportable, and what did not is named.
    const partial = renderFixture(named("CAL-01 (one date unresolved)"));
    expect(pieceOf(partial.root, ".calendar-count").textContent).toBe("1 event");
    expect(pieceOf(partial.root, ".calendar-event").textContent).toContain("18 Oct");
    expect(pieceOf(partial.root, ".calendar-note").textContent).toContain(
      "1 date couldn't be added"
    );
    expect(textOf(partial.root)).toContain("Export");

    // None exportable: the Course has dates, so "no confirmed dates" would be untrue.
    const none = renderFixture(named("CAL-01 (no date can be exported)"));
    expect(textOf(none.root)).toContain("No dates can be exported yet.");
    expect(textOf(none.root)).toContain("2 dates couldn't be added");
    expect(textOf(none.root)).not.toContain("There are no confirmed dates");
    expect(none.root.querySelector(".calendar-event")).toBeNull();
  });

  it("keeps the whole Settings page behind one entry", () => {
    const { root } = renderView({
      surface: "full-page",
      screen: "SET-01",
      settings: settingsViewFixture()
    });
    expect(topScreen(root).dataset.screen).toBe("SET-01");
    for (const id of ["SET-02", "SET-03", "SET-04", "SET-05", "BKP-01"]) {
      expect(screensIn(root), id).toContain(id);
    }
    expect(textOf(root)).toContain("AI");
    expect(textOf(root)).toContain("Authorization");
    expect(textOf(root)).toContain("Data");
    expect(textOf(root)).toContain("About");
  });

  it("masks the API key with Reveal and Hide", () => {
    const { root } = renderView({
      surface: "full-page",
      screen: "SET-01",
      settings: settingsViewFixture()
    });
    const input = pieceOf(root, ".api-key-input");
    expect(input.type).toBe("password");
    clickText(root, "Reveal");
    expect(pieceOf(root, ".api-key-input").type).toBe("text");
    clickText(root, "Hide");
    expect(pieceOf(root, ".api-key-input").type).toBe("password");
  });

  it("explains an invalid API key in human words", () => {
    const { root } = renderView({
      surface: "full-page",
      screen: "SET-01",
      settings: settingsViewFixture()
    });
    const status = pieceOf(root, '[data-screen="SET-03"]');
    expect(status.dataset.state).toBe("invalid");
    expect(status.textContent).toContain("This API key isn’t working.");
  });

  it("states that the API key is not part of a backup", () => {
    const { root } = renderView({
      surface: "full-page",
      screen: "SET-01",
      settings: settingsViewFixture()
    });
    expect(textOf(root)).toContain("Your DeepSeek API key is not included.");
  });

  it("shows the Restore summary and the Full Replace warning before replacing", () => {
    const { root, actions } = renderView({
      surface: "full-page",
      screen: "SET-01",
      settings: settingsViewFixture(),
      backupSummary: { semesters: ["AY2025/26 · Semester 2"], courseCount: 8, assessmentCount: 27 }
    });
    const summary = pieceOf(root, '[data-screen="BKP-02"]');
    expect(summary.textContent).toContain("AY2025/26 · Semester 2");
    expect(summary.textContent).toContain("8 courses");
    expect(summary.textContent).toContain("27 assessments");
    expect(summary.textContent).toContain("This replaces everything");
    clickText(root, "Replace everything");
    expect(actions.restoreConfirmations).toBe(1);
  });

  it("restores without percentages", () => {
    const { root } = renderView(
      { surface: "full-page", screen: "BKP-03" },
      { runtime: { restoreStage: 0 } }
    );
    const steps = root.querySelectorAll(".task-step").map((node) => node.textContent);
    expect(steps).toEqual(["Reading backup…", "Validating backup…", "Restoring course data…"]);
    expect(textOf(root)).not.toContain("%");
  });
});

function settingsViewFixture() {
  return {
    apiKey: { state: "invalid" as const, maskedSuffix: "abcd" },
    privacy: true,
    apiUsage: false,
    version: "0.2.0"
  };
}

describe("semester navigation", () => {
  it("opens every destination screen with the same Product Mark", () => {
    // One product at two densities: every screen the user reads from — Semester and Course, on
    // either surface — starts with the same identity line.
    const destinations = [
      { surface: "full-page", screen: "SEM-01", semester: currentSemester },
      { surface: "side-panel", screen: "SEM-02", semester: currentSemester },
      { surface: "full-page", screen: "CRS-01" },
      { surface: "side-panel", screen: "CRS-02" }
    ] as const;
    for (const destination of destinations) {
      const { root } = renderView(destination);
      const mark = pieceOf(root, ".brand-mark-image");
      expect(mark.getAttribute("src")).toBe("icons/syllab-logo-48px.png");
      expect(textOf(root)).toContain("Syllab");
    }
  });

  it("carries the identity line on a task screen too", () => {
    // The line is part of the shell, not of one family: a user moving from a Course Brief into a
    // Scan must not see the top of the app change shape.
    const { root } = renderView({ surface: "side-panel", screen: "ISC-02" });
    expect(root.querySelectorAll(".brand-mark-image")).toHaveLength(1);
  });

  it("shows a Course preview on the Full-page Dashboard only", () => {
    const fullPage = renderView({
      surface: "full-page",
      screen: "SEM-01",
      semester: currentSemester
    });
    expect(textOf(fullPage.root)).toContain("Individual Assignment · 30% · 18 Oct");
    const sidePanel = renderView({
      surface: "side-panel",
      screen: "SEM-02",
      semester: currentSemester
    });
    expect(textOf(sidePanel.root)).not.toContain("Individual Assignment · 30% · 18 Oct");
  });

  it("expresses an untouched Course visually and offers Scan from a light prompt", () => {
    const { root } = renderView({
      surface: "full-page",
      screen: "SEM-01",
      semester: currentSemester
    });
    const untouched = pieceOf(root, '[data-course-id="course-2"]');
    expect(untouched.className).toContain("is-untouched");
    expect(textOf(root)).not.toContain("Not set up");
    expect(textOf(root)).not.toContain("Not Established");

    pieceOf(untouched, ".course-card-main").click();
    expect(topScreen(root).dataset.screen).toBe("SEM-07");
    expect(pieceOf(root, ".prompt-line").textContent).toBe("This course hasn’t been set up yet.");
  });

  it("starts a Scan only when the user asks for one", () => {
    const { root, actions } = renderView({
      surface: "full-page",
      screen: "SEM-07",
      semester: currentSemester,
      courseId: "course-2"
    });
    expect(actions.mutations).toEqual([]);
    clickText(root, "Scan course");
    expect(actions.mutations).toEqual([{ kind: "StartScan", courseId: "course-2" }]);
    // Answering the prompt also leaves it: the surface moves to the Course's Scan state.
    expect(actions.screens).toEqual(["ISC-02"]);
  });

  it("leaves the Not Established prompt as soon as the Scan it asked for exists", () => {
    // The Interaction Spec's flow is `Scan course` → `Finding course content…`. The prompt used to
    // hold the screen for the whole run, so a real user pressed the button and watched nothing
    // happen — through the scan, through a failure, and after the Brief was ready.
    const working = renderView({
      surface: "full-page",
      screen: "SEM-07",
      semester: currentSemester,
      courseId: "course-2",
      task: taskStatus({ state: "working", phase: "Finding course content…" })
    });
    expect(topScreen(working.root).dataset.screen).toBe("ISC-02");

    const failed = renderView({
      surface: "full-page",
      screen: "SEM-07",
      semester: currentSemester,
      courseId: "course-2",
      task: taskStatus({ state: "failed" })
    });
    expect(topScreen(failed.root).dataset.screen).toBe("ISC-05");
  });

  it("keeps the prompt while the Course it names has no Scan at all", () => {
    const { root, actions } = renderView({
      surface: "full-page",
      screen: "SEM-01",
      semester: currentSemester
    });
    pieceOf(root, '[data-course-id="course-2"] .course-card-main').click();
    expect(topScreen(root).dataset.screen).toBe("SEM-07");
    expect(actions.mutations).toEqual([]);
  });

  it("uses the Semester name as the switcher", () => {
    const { root, actions } = renderView({
      surface: "full-page",
      screen: "SEM-01",
      semester: currentSemester
    });
    pieceOf(root, ".semester-switcher-toggle").click();
    const switcher = pieceOf(root, '[data-screen="SEM-03"]');
    expect(switcher.querySelectorAll(".switcher-option").length).toBe(2);
    expect(pieceOf(switcher, '.switcher-option[data-selected="true"]').textContent).toContain(
      "Current"
    );
    pieceOf(switcher, '.switcher-option[data-lifecycle="Historical"]').click();
    expect(actions.screens).toEqual(["SEM-04"]);
  });

  it("shows an empty Semester as a normal state", () => {
    const { root } = renderView({
      surface: "full-page",
      screen: "SEM-01",
      semester: { ...currentSemester, courses: [], empty: true, status: [] }
    });
    expect(topScreen(root).dataset.screen).toBe("SEM-06");
    expect(textOf(root)).toContain("No courses found yet.");
    expect(textOf(root)).not.toContain("wizard");
  });

  it("says the same thing when no Semester has been found at all", () => {
    // The state every first-time install is in: nothing discovered yet, so there is no Semester to
    // head. It used to render a masthead with nothing under it, which reads as a broken extension.
    const fullPage = renderView({ surface: "full-page", screen: "SEM-01" });
    expect(topScreen(fullPage.root).dataset.screen).toBe("SEM-06");
    expect(textOf(fullPage.root)).toContain("No courses found yet.");
    // The way on is still there: a first-time user's next step is their API key.
    clickText(fullPage.root, "Settings");
    expect(fullPage.actions.screens).toContain("SET-01");

    const sidePanel = renderView({ surface: "side-panel", screen: "SEM-02" });
    expect(topScreen(sidePanel.root).dataset.screen).toBe("SEM-06");
    expect(textOf(sidePanel.root)).toContain("No courses found yet.");
    expect(textOf(sidePanel.root)).toContain("Open full dashboard");
  });

  it("falls back to the Course List when the Side Panel has no current Course", () => {
    const { root } = renderView({
      surface: "side-panel",
      screen: "SEM-02",
      semester: currentSemester
    });
    expect(topScreen(root).dataset.screen).toBe("SEM-02");
    expect(textOf(root)).toContain("MA6081");
    expect(textOf(root)).not.toContain("No current course");
    expect(textOf(root)).toContain("Open full dashboard");
  });

  it("sends an untouched Course to the prompt and an established one to its Brief", () => {
    const { root, actions } = renderView({
      surface: "full-page",
      screen: "SEM-01",
      semester: currentSemester
    });
    pieceOf(root, '[data-course-id="course-1"] .course-card-main').click();
    expect(actions.screens).toEqual(["CRS-01"]);
  });

  it("does not offer Check for updates in a Historical Semester", () => {
    const { root } = renderView(
      {
        surface: "full-page",
        screen: "CRS-01",
        courseId: "course-1",
        course: courseView,
        semester: historicalSemester
      },
      { ui: { courseMoreOpen: true } }
    );
    const items = root.querySelectorAll(".more-items .menu-item").map((node) => node.textContent);
    expect(items).not.toContain("Check for updates");
    expect(items).toContain("Rebuild course");
  });
});

describe("copy", () => {
  it("uses every catalogue key and resolves everything it uses", () => {
    for (const fixture of allFixtures()) renderFixture(fixture);
    // Local states the fixtures reach through interaction.
    const editing = renderFixture({
      name: "editing",
      screen: "CRS-01",
      view: withCourseFixture(),
      ui: { editingAssessmentId: "a-project" }
    });
    expect(editing.root.querySelector(".edit-form")).not.toBeNull();
    const adding = renderFixture({
      name: "adding",
      screen: "CRS-01",
      view: withCourseFixture(),
      ui: { addingAssessment: true }
    });
    expect(adding.root.querySelector('[data-region="add-assessment"]')).not.toBeNull();
    // §6.7: a Review with nothing left in it goes straight back to the Course Brief. There is no
    // empty Review screen, so a Review route with no item is the Course, not a completion page.
    // (Gate 3 finding F33.)
    const empty = renderFixture({
      name: "empty-review",
      screen: "IRV-01",
      view: { ...withCourseFixture(), screen: "IRV-01" }
    });
    expect(textOf(empty.root)).not.toContain("Nothing to review");
    expect(empty.root.querySelector(".course-screen")).not.toBeNull();
    expect(empty.root.querySelector(".review-screen")).toBeNull();

    const referenced = referencedCopyKeys();
    const unused = copyKeys().filter(
      (key) => !usedCopyKeys().includes(key) && !referenced.has(key)
    );
    const unresolved = usedCopyKeys().filter((key) => !copyKeys().includes(key));
    expect({ unused, unresolved }).toEqual({ unused: [], unresolved: [] });
  });

  it("renders no user-facing literal that is not in the catalogue", () => {
    const tokens = new Map(copyKeys().map((key) => [key, `⟦${key}⟧`]));
    setCopyValues(Object.fromEntries(tokens));
    try {
      for (const fixture of allFixtures()) {
        const { root } = renderFixture(fixture);
        const allowed = new Set<string>();
        collectStrings(fixture.view, allowed);
        collectStrings(fixture.runtime, allowed);
        const haystack = [...allowed].join("\n").toLowerCase();
        const tokenList = [...tokens.values()].sort((left, right) => right.length - left.length);
        for (const piece of allTextPieces(root)) {
          let cleaned = piece;
          for (const token of tokenList) cleaned = cleaned.split(token).join(" ");
          // Every word the reader sees is either catalogue copy or comes from the view model.
          const words = cleaned.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 1);
          for (const word of words) {
            expect(
              haystack.includes(word.toLowerCase()),
              `${fixture.name}: "${word}" in "${piece}" is neither catalogue copy nor view data`
            ).toBe(true);
          }
        }
      }
    } finally {
      setCopyValues(CATALOG_VALUES);
    }
  });

  it("never renders raw machine data", () => {
    for (const fixture of allFixtures()) {
      const { root } = renderFixture(fixture);
      const text = textOf(root);
      expect(text, fixture.name).not.toMatch(/[{}[\]]/);
      expect(text, fixture.name).not.toContain('":"');
      expect(text, fixture.name).not.toContain("null");
    }
  });

  it("keeps the four fixed Scan stages exactly as the contract types them", () => {
    const contract: ReadonlyArray<
      | "Finding course content…"
      | "Reading course materials…"
      | "Understanding course information…"
      | "Organizing assessments…"
    > = [
      "Finding course content…",
      "Reading course materials…",
      "Understanding course information…",
      "Organizing assessments…"
    ];
    expect([...SCAN_STAGES]).toEqual([...contract]);
    expect(t("reviewProgress", { index: 2, total: 5 })).toBe("2 of 5");
  });
});
