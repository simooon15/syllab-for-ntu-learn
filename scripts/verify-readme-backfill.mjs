/**
 * Proves the README Product Walkthrough is written once and stays written.
 *
 * The regression this guards: the walkthrough was appended rather than replaced, and the README
 * ended up carrying six copies of the English section. The check is an in-memory replay of the
 * backfill over the real README — it never writes — and it asserts three things:
 *
 *   1. one application produces exactly one walkthrough per language, markers intact;
 *   2. a second application is byte-identical to the first, i.e. the write is idempotent;
 *   3. the README on disk already equals that result, i.e. the repository is in the state the
 *      Gate reports describe.
 *
 * Usage: node scripts/verify-readme-backfill.mjs
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  README_WALKTHROUGH,
  SCREENSHOT_MARKERS,
  replaceBetween,
  walkthroughSection
} from "./lib/walkthrough.mjs";

const readmePath = resolve("README.md");
const failures = [];

/** One full backfill pass, exactly as `backfill-screenshots.mjs` performs it. */
function apply(text) {
  const zh = replaceBetween(text, SCREENSHOT_MARKERS.zh, walkthroughSection(README_WALKTHROUGH.zh));
  return replaceBetween(zh, SCREENSHOT_MARKERS.en, walkthroughSection(README_WALKTHROUGH.en));
}

const count = (text, needle) => text.split(needle).length - 1;

/** The text a marker pair encloses. Throws when the pair is absent or out of order. */
function regionOf(text, [start, end]) {
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from < 0 || to < 0 || to < from) throw new Error(`MARKER_MISSING:${start}`);
  return text.slice(from + start.length, to);
}

const original = await readFile(readmePath, "utf8");

// 1 — the first run writes each walkthrough exactly once, inside its own language's region.
let first = "";
try {
  first = apply(original);
} catch (error) {
  failures.push(`FIRST_RUN_FAILED:${String(error.message)}`);
}
if (first) {
  for (const [language, entries] of Object.entries(README_WALKTHROUGH)) {
    const markers = SCREENSHOT_MARKERS[language];
    for (const marker of markers) {
      if (count(first, marker) !== 1) failures.push(`MARKER_NOT_INTACT:${marker}`);
    }
    let region = "";
    try {
      region = regionOf(first, markers);
    } catch (error) {
      failures.push(String(error.message));
      continue;
    }
    // Titles repeat across languages by design (`Course Brief` is the product's own term), so the
    // count is taken per region rather than over the whole document.
    for (const [, title] of entries) {
      const seen = count(region, `### ${title}`);
      if (seen !== 1) failures.push(`${language}_HEADING_COUNT:${title}=${String(seen)}`);
    }
    // And the other language must not have leaked in: each region carries only its own titles.
    const other = language === "zh" ? "en" : "zh";
    const foreign = README_WALKTHROUGH[other].filter(
      ([, title]) => !entries.some(([, own]) => own === title)
    );
    for (const [, title] of foreign) {
      if (region.includes(`### ${title}`))
        failures.push(`${language}_REGION_HAS_FOREIGN_TITLE:${title}`);
    }
  }
}

// 2 — a second run changes no byte.
if (first) {
  const second = apply(first);
  if (second !== first) failures.push("SECOND_RUN_CHANGED_THE_README");
}

// 3 — the README on disk is already that result.
if (first && first !== original) failures.push("README_ON_DISK_IS_NOT_BACKFILLED");

if (failures.length > 0) {
  process.stderr.write(
    `README backfill verification failed:\n${failures.map((item) => ` - ${item}`).join("\n")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `README backfill verified: one walkthrough per language, byte-identical on a second run, ${String(
      original.length
    )} bytes.\n`
  );
}
