/**
 * Backfills the final screenshots into the Interaction & IA Spec and builds the README Product
 * Walkthrough from the same captured set. The Spec is the single home for per-screen evidence;
 * the README repeats only a short, curated walkthrough.
 *
 * Usage: node scripts/backfill-screenshots.mjs
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  README_WALKTHROUGH,
  SCREENSHOT_MARKERS,
  replaceBetween,
  walkthroughSection
} from "./lib/walkthrough.mjs";

const screenshotDirectory = resolve("artifacts", "screenshots", "v0.2.0");
const specImageDirectory = resolve("docs", "versions", "v0.2.0", "images");
const specPath = resolve("Interaction_and_Information_Architecture_Spec_v0.2.0.md");
const readmePath = resolve("README.md");

const APPENDIX_HEADING = "# 附录 A. Final Implementation Screenshots";

/** Per-screen captions: what the screen is, its main areas, and how the user operates it. */
export const SCREEN_CAPTIONS = {
  "SEM-01": {
    title: "Current Semester Dashboard (Full-page)",
    body: "Full-page entry point. The header carries the semester name, which doubles as the Current / Historical switcher, and the Semester Status Area on the right. Each established Course card is a lightweight Course Brief preview grouped by Assessment type. A Course that has not been set up carries the same card, with the prompt line where the others carry a status cue and no preview above it."
  },
  "SEM-02": {
    title: "Current Semester Course List (Side Panel)",
    body: "The Side Panel's semester view. It lists the semester's Courses for switching and deliberately does not repeat the dashboard's Assessment preview; `Open full dashboard` hands over to the Full-page surface."
  },
  "SEM-03": {
    title: "Semester Switcher",
    body: "Clicking the semester name expands the Current / Historical Semester list. There is no permanent Current / Historical navigation."
  },
  "SEM-04": {
    title: "Historical Semester Dashboard (Full-page)",
    body: "A past semester keeps the same browsing structure but offers no `Check for updates` and is never a target of background checking. Every Course Brief, field and Evidence record stays readable."
  },
  "SEM-05": {
    title: "Historical Semester Course List (Side Panel)",
    body: "The Side Panel equivalent for a past semester."
  },
  "SEM-06": {
    title: "Empty Semester",
    body: "A semester with no Curriculum Course shows a single quiet line. There is no setup wizard and no Scan affordance."
  },
  "SEM-07": {
    title: "Not Established Course Prompt",
    body: "Choosing a Course Syllab has not been set up for asks one question before anything happens. The Course is only established after the user explicitly selects `Scan course`: auto-discovery is never auto-scan."
  },
  "CRS-01": {
    title: "Course Brief (Full-page)",
    body: "Current Course State is the default body of the Course view. Assessments are grouped in the fixed order Assignments / Projects / Quizzes & Tests / Exams / Other; a Component sits under its parent, an Assessment Series shows its instances beneath it, and Course-wide Constraints come last. No raw JSON and no internal identifiers appear anywhere."
  },
  "CRS-02": {
    title: "Course Brief (Side Panel)",
    body: "The same Current Course State at Side Panel density. Objects, marks and Review semantics are identical; only the layout is narrower."
  },
  "CRS-03": {
    title: "Assessment Detail",
    body: "Selecting an Assessment opens its detail and action state. Actions are not permanently attached to every card in the Brief."
  },
  "CRS-04": {
    title: "Assessment Edit",
    body: "Editing happens in place on structured fields. The user edits a value, never JSON."
  },
  "CRS-05": {
    title: "Evidence Reveal",
    body: "Clicking a fact swaps it in place for the original Evidence that supports it; clicking again returns to the fact. There is no modal, no separate Evidence page and no `View evidence` control."
  },
  "CRS-06": {
    title: "No Assessments Found",
    body: "A successful Scan that produced no Assessment is a normal state, not an error, and Manual Add Assessment remains available."
  },
  "ISC-01": {
    title: "Scan Prompt",
    body: "The first Scan for a Course starts from an explicit prompt."
  },
  "ISC-02": {
    title: "Scan Working",
    body: "One start carries the Scan through every safe stage. The UI names only the four user-facing stages and never shows a percentage or an internal pipeline name."
  },
  "ISC-03": {
    title: "Scan Waiting — API Key",
    body: "When the run needs the user's DeepSeek API key it says so and offers a way to fix it. `Waiting` is an internal state and is never the user-facing word."
  },
  "ISC-04": {
    title: "Scan Waiting — Permission / Authorization",
    body: "The same waiting pattern for host permission or the content-sending authorization. Completing the configuration resumes the original Scan context."
  },
  "ISC-05": {
    title: "Scan Failed",
    body: "A failure that cannot continue offers `Try again` plus `View details`; stable error codes appear only inside the details."
  },
  "ISC-06": {
    title: "Scan Error Details",
    body: "The user-readable reason comes first and the stable error code second."
  },
  "IRV-01": {
    title: "Initial Review — Assessment",
    body: "One complete Assessment at a time with lightweight progress. `Confirm` is the primary action; structural correction stays behind `More…`."
  },
  "IRV-02": {
    title: "Initial Review — Edit",
    body: "Editing an item during Review keeps the user inside the Review context."
  },
  "IRV-03": {
    title: "Same assessment as…",
    body: "Merge is expressed in the user's own terms: this item is actually the same Assessment as an existing one."
  },
  "IRV-04": {
    title: "Split",
    body: "Split handles the low-frequency case where one item actually contains two or more separate Assessments."
  },
  "IRV-05": {
    title: "First-use Contextual Hint",
    body: "Structural actions teach themselves the first time only, inline, without covering the content and without a tutorial."
  },
  "CRV-01": {
    title: "Changed Field Review",
    body: "Only the changed field is shown, as Current against Latest, with `Accept change` as the primary action and `Keep current` recorded as a real decision rather than permanent suppression."
  },
  "CRV-03": {
    title: "Conflict Review",
    body: "Competing values stay side by side with their own Evidence. The product never recommends a source, and Current State is not overwritten until the user decides."
  },
  "CRV-04": {
    title: "Possibly Removed Review",
    body: "Keep and Remove are the two real decisions. A kept object stays inside Current State without fading, keeps its mark, and is not asked about again while the evidence stays absent."
  },
  "CRV-05": {
    title: "Identity Uncertain Review",
    body: "When identity itself is unresolved the user is asked directly whether the two items are the same Assessment."
  },
  "RBL-01": {
    title: "Rebuild Confirmation",
    body: "Rebuild explains before it starts that the existing Current Course State stays unchanged until the new result is adopted."
  },
  "RBL-02": {
    title: "Rebuild Working",
    body: "Rebuild reuses the Initial Scan stages rather than inventing its own progress language."
  },
  "RBL-03": {
    title: "Rebuilt Course Preview",
    body: "The result is a complete rebuilt Course Brief, not a field-by-field diff. The decision is taken as a whole: use the rebuilt Course or keep the current one."
  },
  "CAL-01": {
    title: "Calendar Export Preview",
    body: "Export reads Current Course State and never re-scans or re-calls the model, and the list and the file come from one call, so the preview cannot promise an event the download does not contain. Equivalent facts collapse into one event; unresolved Conflicts are excluded. A date the Source wrote without a year (`18 Oct`) is completed from the Course's Semester instead of being dropped, and a date the Source left open (the Final Exam's) is not a settled fact, so it appears in neither the list nor the file."
  },
  "SET-01": {
    title: "Settings",
    body: "One Full-page Settings entry covering AI, Authorization, Data and About. Entering Settings from a task returns to that task's exact context afterwards."
  },
  "SET-02": {
    title: "AI — API Key",
    body: "Only the DeepSeek API key is configured here; there is no model selector. The key is masked until revealed and is stored locally, never in a Backup."
  },
  "SET-04": {
    title: "Authorization",
    body: "Privacy Authorization and API Usage Authorization are separate: allowing course content to be sent to the model is not the same as allowing unlimited background spending."
  },
  "SET-05": {
    title: "About",
    body: "The Product Mark and the product version, nothing more."
  },
  "BKP-01": {
    title: "Data — Backup / Restore",
    body: "Backup exports the complete local Syllab state; the API key is explicitly not included and the user is not asked to choose Courses."
  },
  "BKP-02": {
    title: "Restore File Summary",
    body: "Before anything is written, the backup is validated and summarised, and the Full Replace consequence is stated plainly."
  },
  "BKP-04": {
    title: "Restore Failed",
    body: "If validation or the write fails, the previous local state is left untouched and the failure says why."
  }
};

/** Screens documented by a screenshot; each needs a file in the captured set. */
async function copyScreenshots() {
  await mkdir(specImageDirectory, { recursive: true });
  for (const id of Object.keys(SCREEN_CAPTIONS)) {
    await copyFile(
      resolve(screenshotDirectory, `${id}.png`),
      resolve(specImageDirectory, `${id}.png`)
    );
  }
  return Object.keys(SCREEN_CAPTIONS).length;
}

/**
 * The Spec keeps its per-screen chapters as designed; the final screenshots are appended as one
 * documented appendix so the design text and the implementation evidence stay side by side.
 */
async function backfillSpec() {
  let spec = await readFile(specPath, "utf8");
  const existing = spec.indexOf(APPENDIX_HEADING);
  const trimmed = existing >= 0 ? spec.slice(0, existing).trimEnd() : spec.trimEnd();

  const appendix = [
    "",
    "---",
    "",
    APPENDIX_HEADING,
    "",
    "每张截图都来自 v0.2.0 的最终真实实现，由 `npm run gate:2` 的自动化浏览器路径生成，",
    "不是设计稿或生成式示意图。Side Panel 与 Full-page 布局差异明显时分别截图。",
    ""
  ];
  for (const [id, caption] of Object.entries(SCREEN_CAPTIONS)) {
    appendix.push(
      `## ${id} — ${caption.title}`,
      "",
      `![${caption.title}](docs/versions/v0.2.0/images/${id}.png)`,
      "",
      caption.body,
      ""
    );
  }
  await writeFile(specPath, `${trimmed}\n${appendix.join("\n")}`);
  return Object.keys(SCREEN_CAPTIONS).length;
}

async function updateReadme() {
  let readme = await readFile(readmePath, "utf8");
  // Each language keeps its own captions: an English description under a Chinese heading is not a
  // walkthrough in that language. Only the marked region is rewritten, so a second run replaces
  // the same bytes instead of appending another copy.
  readme = replaceBetween(readme, SCREENSHOT_MARKERS.zh, walkthroughSection(README_WALKTHROUGH.zh));
  readme = replaceBetween(readme, SCREENSHOT_MARKERS.en, walkthroughSection(README_WALKTHROUGH.en));
  await writeFile(readmePath, readme);
  return README_WALKTHROUGH.zh.length;
}

const screens = await copyScreenshots();
const documented = await backfillSpec();
const walkthrough = await updateReadme();
process.stdout.write(
  `Backfilled ${String(screens)} screenshots (${String(documented)} documented) into the Interaction & IA Spec and ${String(
    walkthrough
  )} into the README walkthrough.\n`
);
