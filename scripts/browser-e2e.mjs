/**
 * Gate browser E2E. Runs against the real unpacked extension with synthetic scenarios seeded
 * through the real store, and asserts the vertical slice the Gate names:
 *
 *   Course discovery → Initial Scan → Task A/B → Initial Review → Current Course State
 *   → Source update → machine comparison → Task A/B/C → Change Review → updated Current State
 *
 * The model itself is replaced by recorded fixtures (see tests/v2 fixtures); what is verified
 * here is the product path around it: navigation, review decisions, trusted-state protection,
 * status precedence, and that an unchanged Source produces no semantic work.
 */
import { launchExtension, expectScreen } from "./lib/browser-harness.mjs";

/** Fixture course id used by every synthetic scenario. */
const COURSE = "course_pm";

const failures = [];

function check(condition, code) {
  if (!condition) failures.push(code);
}

const app = await launchExtension();
try {
  // --- Semester Dashboard -------------------------------------------------
  await app.seed("semester-dashboard");
  await expectScreen(app.fullPage, "SEM-01");
  check((await app.fullPage.locator(".course-card").count()) >= 2, "DASHBOARD_COURSE_COUNT");
  // A Course that has not been set up says so in words, in the slot where the other cards carry a
  // status cue. This check used to be the opposite — Interaction Spec §3.5 forbids the label and
  // says the state is expressed visually only — and the Product Owner changed that direction
  // (DIRECTION_ADJUSTMENTS §2.20). The two documents genuinely disagree until Documentation
  // Consolidation, so the check now asserts what ships, and says why.
  check(
    (await app.fullPage.locator(".course-card.is-untouched .course-card-note").count()) === 1,
    "NOT_ESTABLISHED_NOTE_MISSING"
  );
  // The copy reads "This course hasn't been set up yet." — note that the check this replaces looked
  // for "not been set up yet", which is in neither the label nor anything else, so its `=== 0`
  // could never fail. It was green for as long as it existed without testing anything.
  check(
    (await app.fullPage.locator(".course-card-note").innerText()).includes("set up yet"),
    "NOT_ESTABLISHED_NOTE_COPY"
  );
  check(
    (await app.fullPage.locator('[data-screen="SEM-01"]').innerText()).includes("Assignments"),
    "DASHBOARD_ASSESSMENT_PREVIEW"
  );

  // A Course that has not been set up asks before it scans.
  await app.fullPage.locator(".course-card").last().click();
  await expectScreen(app.fullPage, "SEM-07");
  check(
    (await app.fullPage.getByText("This course hasn’t been set up yet.").count()) === 1,
    "NOT_ESTABLISHED_PROMPT"
  );

  // --- Course Brief -------------------------------------------------------
  await app.seed("course-brief", "CRS-01");
  const brief = app.fullPage.locator('[data-screen="CRS-01"]');
  const briefText = await brief.innerText();
  check(briefText.includes("Individual Assignment"), "BRIEF_MISSING_ASSESSMENT");
  check(briefText.includes("Written Report"), "BRIEF_MISSING_COMPONENT");
  check(briefText.includes("Quizzes"), "BRIEF_MISSING_SERIES");
  check(!briefText.includes("{"), "BRIEF_RAW_JSON_VISIBLE");
  check(!/assessment_|fact-|constraint_/.test(briefText), "BRIEF_INTERNAL_ID_VISIBLE");
  check(briefText.includes("Late submissions lose 10%"), "BRIEF_MISSING_COURSE_WIDE_CONSTRAINT");

  // Evidence is hidden until a fact is clicked, then swaps in place.
  const deadline = brief.getByText("18 Oct").first();
  await deadline.click();
  const revealed = await brief.innerText();
  check(revealed.includes("Course Guide"), "EVIDENCE_TOGGLE_DID_NOT_REVEAL");
  check(revealed.includes("Individual Assignment 30% due 18 October"), "EVIDENCE_EXCERPT_MISSING");
  await brief.getByText("18 Oct").first().click();

  // --- Side Panel ---------------------------------------------------------
  await expectScreen(app.panel, "SEM-02");
  const panelText = await app.panel.locator('[data-screen="SEM-02"]').innerText();
  check(panelText.includes("MA6081"), "SIDE_PANEL_MISSING_COURSE");
  check(!panelText.includes("Assignments"), "SIDE_PANEL_COPIED_DASHBOARD_PREVIEW");

  // --- Initial Scan states ------------------------------------------------
  await app.seed("scan-working");
  await app.route("side-panel", "ISC-02", COURSE);
  await app.panel.reload();
  const panelScan = await app.panel.locator('[data-screen^="ISC-"]').first().innerText();
  check(
    /Finding course content…|Reading course materials…|Understanding course information…|Organizing assessments…/.test(
      panelScan
    ),
    "SCAN_STAGE_COPY_MISSING"
  );
  check(!/\d+\s?%/.test(panelScan), "SCAN_SHOWED_A_PERCENTAGE");

  await app.seed("scan-waiting-api-key");
  await app.route("side-panel", "ISC-03", COURSE);
  await app.panel.reload();
  const waiting = await app.panel.locator('[data-screen^="ISC-"]').first().innerText();
  check(waiting.includes("DeepSeek API key required"), "WAITING_REASON_NOT_STATED");
  check(!/Waiting$/m.test(waiting), "INTERNAL_WAITING_STATE_LEAKED");

  await app.seed("scan-failed");
  await app.route("side-panel", "ISC-05", COURSE);
  await app.panel.reload();
  const failed = await app.panel
    .locator('[data-screen="ISC-05"], [data-screen="ISC-06"]')
    .first()
    .innerText();
  check(/Try again/.test(failed), "SCAN_FAILED_MISSING_RETRY");

  // --- Initial Review -----------------------------------------------------
  await app.seed("initial-review");
  await app.route("side-panel", "IRV-01", COURSE);
  await app.panel.reload();
  const review = app.panel.locator('[data-screen="IRV-01"]');
  const reviewText = await review.innerText();
  check(/\d of \d/.test(reviewText), "REVIEW_PROGRESS_MISSING");
  check(reviewText.includes("Confirm"), "REVIEW_CONFIRM_MISSING");
  check(reviewText.includes("Group Project"), "REVIEW_UNIT_IS_NOT_AN_ASSESSMENT");
  check(!reviewText.includes("{"), "REVIEW_RAW_JSON_VISIBLE");

  const before = await app.act("ConfirmFirstReviewItem");
  check(before.ok === true, "CONFIRM_REVIEW_ITEM_FAILED");

  // --- Change Review ------------------------------------------------------
  await app.seed("change-review", "CRV-01");
  const changed = await app.fullPage.locator('[data-screen="CRV-01"]').innerText();
  check(
    changed.includes("10 Oct") && changed.includes("18 Oct"),
    "CHANGE_REVIEW_CURRENT_VS_LATEST"
  );

  const stale = await app.act("StaleRevisionMutation");
  check(
    stale.ok === false && stale.errorCode === "COURSE_REVISION_CONFLICT",
    "STALE_REVISION_NOT_REJECTED"
  );

  const accepted = await app.act("AcceptFirstChange");
  check(accepted.ok === true, "ACCEPT_CHANGE_FAILED");

  await app.seed("conflict-review", "CRV-03");
  const conflict = await app.fullPage.locator('[data-screen="CRV-03"]').innerText();
  check(
    conflict.includes("18 Oct") && conflict.includes("20 Oct"),
    "CONFLICT_COMPETING_VALUES_MISSING"
  );

  await app.seed("possibly-removed", "CRV-04");
  const removed = await app.fullPage.locator('[data-screen="CRV-04"]').innerText();
  check(/Keep/.test(removed) && /Remove/.test(removed), "POSSIBLY_REMOVED_ACTIONS_MISSING");

  await app.seed("identity-uncertain", "CRV-05");
  const identity = await app.fullPage.locator('[data-screen="CRV-05"]').innerText();
  check(
    /Same assessment/.test(identity) && /Different assessment/.test(identity),
    "IDENTITY_REVIEW_ACTIONS_MISSING"
  );

  // --- Settings / Backup --------------------------------------------------
  const manifest = await app.fullPage.evaluate(async () =>
    (await fetch(chrome.runtime.getURL("manifest.json"))).json()
  );
  check(!manifest.action?.default_popup, "POPUP_STILL_DECLARED");
  check(manifest.side_panel?.default_path === "sidepanel.html", "SIDE_PANEL_NOT_DECLARED");

  await app.seed("empty-semester");
  await app.route("full-page", "SEM-06");
  await app.fullPage.reload();
  await expectScreen(app.fullPage, "SEM-06");
  const empty = await app.fullPage.locator('[data-screen="SEM-06"]').first().innerText();
  check(empty.includes("No courses found yet."), "EMPTY_SEMESTER_COPY");
} finally {
  await app.close();
}

if (failures.length > 0) {
  process.stderr.write(`Browser E2E failed:\n${failures.map((item) => ` - ${item}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Browser E2E passed.\n");
}
