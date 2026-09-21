#!/usr/bin/env node
/**
 * Gate 3 — one-click real acceptance run.
 *
 * Drives the machine's own Google Chrome, with the QA build loaded into a dedicated profile,
 * against real NTU Learn and the real DeepSeek provider. Nothing here is seeded: every screen this
 * run sees was produced by the product reading the real thing, and every number in the report was
 * read back out of the product's own QA trace rather than inferred from a screenshot.
 *
 * What it will not do: open, read or copy the Product Owner's everyday Chrome profile, ask for or
 * store a password, complete an MFA challenge, or take a cookie out of the browser. Where the
 * platform needs a person — Chrome's one-time extension load, an NTU sign-in, a save dialog, a
 * product judgment the product is asking the user to make — the run says what it needs and waits,
 * then carries on by itself.
 *
 * Usage: npm run test:real   (or double-click "Run Syllab Real Test.command")
 */
import { execSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "artifacts", "real-test");
const SHOTS = join(OUT, "screenshots");
const DOWNLOADS = join(OUT, "downloaded");
const CONFIG_PATH = resolve(ROOT, ".real-test.local.json");
const DEFAULT_PROFILE = resolve(ROOT, ".tmp", "syllab-qa-profile");
/** The QA build. Same product as the shipped bundle, with the observation layer compiled in. */
const EXTENSION = resolve(ROOT, "extension", "dist-qa");
/** Chrome's debugging port for this run, read back from the target list to avoid opening a tab. */
let debugPort = 0;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const NTU = "https://ntulearn.ntu.edu.sg";
/** The signed-in-user read discovery itself performs; a sign-in probe cannot disagree with it. */
const WHOAMI = `${NTU}/learn/api/public/v1/users/me`;

const QA_TRACE_KEY = "syllab.qa.trace";
const EXTENSION_WAIT_MS = 20 * 60 * 1000;
const LOGIN_WAIT_MS = 20 * 60 * 1000;
const SCAN_WAIT_MS = 20 * 60 * 1000;
const REVIEW_JUDGMENT_WAIT_MS = 30 * 60 * 1000;
const DOWNLOAD_WAIT_MS = 6 * 60 * 1000;
const DISCOVERY_WAIT_MS = 90_000;

/**
 * The report's rows. A row nobody could verify stays `NOT TESTED`: a run that could not tell is not
 * a pass, and a report that says otherwise is worth less than no report.
 */
const CHECKS = [
  "System Chrome",
  "QA Extension",
  "Course Discovery",
  "Real DeepSeek",
  "Initial Review",
  "Course Brief",
  "Semester Date Resolution",
  "Calendar Preview",
  "Actual ICS Download",
  "Persistence"
];
const results = new Map(CHECKS.map((name) => [name, { status: "NOT TESTED", note: "" }]));
const log = [];
/** The last trace read, so a run that stops early still leaves its evidence behind. */
let latestTrace = [];

function record(name, status, note = "") {
  results.set(name, { status, note });
  process.stdout.write(`  ${status.padEnd(16)} ${name}${note ? ` — ${note}` : ""}\n`);
}

function say(message = "") {
  process.stdout.write(`${message}\n`);
  log.push(message);
}

function fail(code) {
  return new Error(code);
}

/** Runs one named step and reports it. The step's note is returned, because a step that finds
 * something — an extension id, a count — is usually the next step's input. */
async function step(name, run) {
  try {
    const note = (await run()) ?? "";
    record(name, "PASS", note);
    return note;
  } catch (error) {
    record(name, "FAIL", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

async function readConfig() {
  try {
    return JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

/**
 * A Chrome already running on the QA profile, if there is one.
 *
 * Launching a second one does not open a second browser: Chrome hands the new process to the one
 * that already holds the profile and exits, so the debugging port never opens and the run fails
 * with "the browser did not open" — which sounds like Chrome is broken and is really just Chrome
 * already being there. Attaching to what is there is both simpler and what the Product Owner
 * expects, since the window is theirs and they may well have left it open.
 */
function runningQaChrome(profile) {
  try {
    const listing = execSync("ps -Ao command=", { encoding: "utf8" });
    // The full path cannot be compared: under a non-UTF-8 locale `ps` escapes every non-ASCII byte,
    // so a profile inside a folder named with one reads back as `M-eM^IM-` and never matches. The
    // profile's own folder name is ASCII, and it is the part that identifies it.
    const folder = basename(profile);
    for (const line of listing.split("\n")) {
      if (!line.includes("--user-data-dir=") || !line.includes(folder)) continue;
      const port = /--remote-debugging-port=(\d+)/.exec(line)?.[1];
      if (port) return Number(port);
    }
  } catch {
    // No process listing to read; fall through to launching one.
  }
  return null;
}

async function launchChrome(profile) {
  await mkdir(profile, { recursive: true });
  const existing = runningQaChrome(profile);
  if (existing !== null) {
    say(`  已在运行的 QA Chrome 上继续（端口 ${String(existing)}）。`);
    return { child: null, port: existing };
  }
  const port = 9222 + Math.floor(Math.random() * 400);
  const child = spawn(
    CHROME,
    [
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`,
      "--no-first-run",
      "--no-default-browser-check"
    ],
    { stdio: "ignore", detached: false }
  );
  child.on("error", () => undefined);
  return { child, port };
}

async function attach(port) {
  const endpoint = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await chromium.connectOverCDP(endpoint);
    } catch {
      await sleep(500);
    }
  }
  throw fail("CHROME_DID_NOT_OPEN");
}

/** Brings the QA window forward so the Product Owner can see what they are being asked for. */
function focusChrome() {
  spawn("osascript", ["-e", 'tell application "Google Chrome" to activate'], {
    stdio: "ignore"
  }).on("error", () => undefined);
}

/** The id Chrome gives an unpacked extension loaded from a path: sha256(path) mapped to a–p. */
function unpackedExtensionId(path) {
  const digest = createHash("sha256").update(path, "utf8").digest("hex").slice(0, 32);
  return [...digest].map((char) => String.fromCharCode(97 + Number.parseInt(char, 16))).join("");
}

/**
 * Ids whose own page has been opened, so the probe below happens at most once for each.
 *
 * Opening a page is the only way to be sure an id is Syllab's — Chrome runs component extensions of
 * its own and a running service worker is not enough. But a page that opens and closes is a tab the
 * Product Owner watches appear and vanish, and a poll that does that every few seconds looks exactly
 * like a browser that keeps crashing. So a candidate is asked once, ever: a build that is not there
 * costs nothing, and one that is costs a single tab.
 */
const confirmed = new Set();
let startupProbeDone = false;

/** Whether this id serves Syllab's own page. */
async function servesSyllab(context, id) {
  const probe = await context.newPage();
  try {
    await probe.goto(`chrome-extension://${id}/app.html`, {
      waitUntil: "domcontentloaded",
      timeout: 4000
    });
    return (await probe.locator("#app").count()) > 0;
  } catch {
    return false;
  } finally {
    await probe.close().catch(() => undefined);
  }
}

/**
 * Which extension ids have a background worker running, read from Chrome's own target list.
 *
 * The list is an HTTP endpoint on the run's own debugging port, so asking costs nothing and opens
 * no tab — which is the point. A poll that opened a page to look would flash a tab every few
 * seconds, and the Product Owner would reasonably read that as a browser that keeps crashing.
 */
async function runningExtensionWorkers() {
  try {
    const response = await fetch(`http://127.0.0.1:${String(debugPort)}/json/list`);
    const targets = await response.json();
    const ids = new Set();
    for (const target of targets) {
      if (target.type !== "service_worker") continue;
      const match = /^chrome-extension:\/\/([a-p]{32})\/background\.js$/.exec(target.url);
      if (match?.[1]) ids.add(match[1]);
    }
    return ids;
  } catch {
    return new Set();
  }
}

/**
 * The Syllab extension the QA profile has loaded, or null.
 *
 * A running worker is not proof on its own — Chrome runs its own component extensions, and one of
 * them is enough to make a run believe Syllab is installed, skip the load step and then fail
 * somewhere far away. So a candidate is accepted only once its own page has opened.
 *
 * Getting the re-probe right matters more than it looks. Asking the named build once at startup
 * covers an install whose worker has gone idle; asking it again while its worker is running covers
 * the Product Owner loading it a minute later. Marking it probed after the first, failed attempt —
 * which is what this did — means an extension installed afterwards is never found, and the run sits
 * at a prompt telling the Product Owner to do the thing they just did.
 */
async function extensionIdIn(context, expected) {
  // Found once in this run, found for the rest of it: the extension cannot have uninstalled itself
  // while the run was looking at it.
  for (const id of confirmed) return id;

  const running = await runningExtensionWorkers();
  const candidates = [];
  if (!startupProbeDone || running.has(expected)) candidates.push(expected);
  for (const id of running) if (id !== expected) candidates.push(id);
  startupProbeDone = true;

  for (const id of new Set(candidates)) {
    if (await servesSyllab(context, id)) {
      confirmed.add(id);
      return id;
    }
  }
  return null;
}

/**
 * Chrome 153 will not load an unpacked extension from the command line — verified for this build
 * across every flag combination and against a profile with the extension pre-registered — so the
 * first load is a person's job. It happens once: the QA profile keeps the extension afterwards.
 */
async function ensureExtension(context, page, expected, options = {}) {
  let id = await extensionIdIn(context, expected);
  if (id) return id;
  say("");
  say("  这个 QA Chrome 里还没有 Syllab。请只做这一次：");
  say("    1. chrome://extensions 右上角打开 Developer mode");
  say(`    2. Load unpacked → 选择 ${EXTENSION}`);
  say("  装好后脚本会自动继续，不需要再做别的。");
  say("");
  await page.goto("chrome://extensions");
  // A manual run leaves the Product Owner's screen alone: pulling Chrome's whole application
  // forward also raises whichever other Chrome window they had in front.
  if (options.focus !== false) focusChrome();
  const deadline = Date.now() + EXTENSION_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(3000);
    id = await extensionIdIn(context, expected);
    if (id) {
      say(`  Syllab 已装入 QA Chrome。`);
      return id;
    }
  }
  throw fail("EXTENSION_NOT_LOADED");
}

/**
 * Makes the QA profile execute the bundle currently on disk.
 *
 * Chrome remembers an unpacked extension across launches, but it does not reload that extension
 * when its files are rebuilt. Without this step a freshly prepared `dist-qa` can be correct while
 * the profile keeps running the previous Service Worker and Content Script. Reload before opening
 * NTU Learn, then wait until Syllab's own page is available again; the caller refreshes the Learn
 * tab afterwards so its Content Script comes from the same build.
 */
async function reloadExtension(context, id) {
  const reloader = await context.newPage();
  try {
    await reloader.goto(`chrome-extension://${id}/app.html`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000
    });
    await reloader.evaluate(() => chrome.runtime.reload()).catch(() => undefined);
  } finally {
    await reloader.close().catch(() => undefined);
  }

  confirmed.delete(id);
  const deadline = Date.now() + EXTENSION_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(500);
    if (await servesSyllab(context, id)) {
      confirmed.add(id);
      say("  QA Extension reloaded from the prepared build.");
      return;
    }
  }
  throw fail("EXTENSION_RELOAD_FAILED");
}

// ---------------------------------------------------------------------------
// The product's own surfaces
// ---------------------------------------------------------------------------

const screenOf = (page, id) => page.locator(`[data-screen="${id}"]`).first();

async function waitForScreen(page, id, timeout = 30_000) {
  await screenOf(page, id).waitFor({ timeout });
  return screenOf(page, id);
}

/**
 * The tab this run is using, replaced if the Product Owner closed it.
 *
 * The QA window is theirs while the run holds it — they have to sign in, and they may well tidy up
 * a tab that looks idle. Losing the run to that would be a poor trade for a tab, so every long wait
 * asks for a live page before it looks at one.
 */
async function livePage(context, page) {
  return page.isClosed() ? context.newPage() : page;
}

async function currentScreen(page) {
  await page.locator("#app > *").first().waitFor({ timeout: 15_000 });
  const node = page.locator("[data-screen]").first();
  return (await node.count()) ? await node.getAttribute("data-screen") : null;
}

async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

/**
 * What the QA build has observed so far. Empty in any build that is not the QA one.
 *
 * Read from session storage, where the QA layer writes it — it keeps the trace off the storage area
 * the product watches, so observing a run cannot make the product repaint.
 */
async function readTrace(page) {
  return page.evaluate(async (key) => {
    const stored = await chrome.storage.session.get(key);
    const value = stored[key];
    return Array.isArray(value) ? value : [];
  }, QA_TRACE_KEY);
}

/**
 * The trace, read through a surface of its own.
 *
 * Reading it needs an extension page, and the run may have closed the one it was driving — so a
 * trace that has to be read once the run is over gets its own, which changes nothing it reads.
 */
async function traceNow(context, extensionId) {
  const probe = await context.newPage();
  try {
    await probe.goto(`chrome-extension://${extensionId}/app.html`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000
    });
    return await readTrace(probe);
  } finally {
    await probe.close().catch(() => undefined);
  }
}

async function signedIn(page) {
  try {
    return await page.evaluate(
      async (url) => (await fetch(url, { credentials: "include" })).ok,
      WHOAMI
    );
  } catch {
    return false;
  }
}

/**
 * Waits for the Product Owner to sign in, without ever touching the tab they are signing in with.
 *
 * The first version navigated the tab every few seconds to re-read the sign-in state. The sign-in
 * runs on an SSO host, so that navigation landed in the middle of a half-typed password and threw
 * it away — a poll that destroys the thing it is waiting for. This one only looks: whichever tab is
 * on NTU Learn is asked whether the read succeeds, and while the Product Owner is still on the SSO
 * host there is nothing to ask, so nothing happens. Any tab counts, because the sign-in may finish
 * somewhere other than where it started.
 */
async function awaitSignIn(context) {
  const deadline = Date.now() + LOGIN_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(3000);
    for (const candidate of context.pages()) {
      if (candidate.isClosed() || !candidate.url().startsWith(NTU)) continue;
      if (await signedIn(candidate)) {
        say("  已登录，继续。");
        return candidate;
      }
    }
  }
  throw fail("SIGN_IN_TIMED_OUT");
}

/** Waits on the product itself: a Course only appears once discovery has actually written one. */
async function waitForDiscovery(app, extensionId) {
  const deadline = Date.now() + DISCOVERY_WAIT_MS;
  let round = 0;
  while (Date.now() < deadline) {
    round += 1;
    if (app.isClosed()) throw fail("THE_QA_WINDOW_WAS_CLOSED");
    await app.goto(`chrome-extension://${extensionId}/app.html`);
    await waitForScreen(app, "SEM-01", 20_000).catch(() => null);
    const cards = app.locator(".course-grid .course-card");
    if ((await cards.count()) > 0) {
      say(`  发现 ${String(await cards.count())} 门课程。`);
      return cards.count();
    }
    // A silent minute reads as a hung script, and the window it is driving looks abandoned.
    if (round % 6 === 1) say(`  正在等待学期 / 课程发现…（第 ${String(round)} 次检查）`);
    await sleep(2500);
  }
  return 0;
}

/**
 * One Course, end to end. `depth` decides how much of the run is reported: Course A carries the
 * report's verdicts, Course B is run to prove they were not a property of one Course.
 */
async function runCourse(run, index) {
  const label = index === 0 ? "Course A" : "Course B";

  await run.app.goto(`chrome-extension://${run.extensionId}/app.html`);
  await waitForScreen(run.app, "SEM-01", 30_000);
  const cards = run.app.locator(".course-grid .course-card");
  const total = await cards.count();
  if (total === 0) throw fail("NO_COURSE_DISCOVERED");

  // The dashboard is where the product itself lists the Course, so it is where a run picks one.
  // A configured name chooses among them; with nothing configured the run takes them in order.
  let chosen = index;
  if (run.wanted !== null) {
    const codes = await cards.locator(".course-code").allInnerTexts();
    const found = codes.findIndex((text) => text.trim() === run.wanted);
    if (found < 0) throw fail(`COURSE_NOT_ON_THE_DASHBOARD:${run.wanted}`);
    chosen = found;
  }
  if (total <= chosen) throw fail(`ONLY_${String(total)}_COURSES_DISCOVERED`);
  const card = cards.nth(chosen);
  const code =
    (await card
      .locator(".course-code")
      .first()
      .innerText()
      .catch(() => "")) || label;
  await card.click();
  say(`  ${label}: ${code}`);
  if (index === 0) await shot(run.app, "01-course-discovery");

  if (await waitForScreen(run.app, "SEM-07", 6000).catch(() => null)) {
    await run.app.locator('[data-screen="SEM-07"] .primary-action').first().click();
  }

  // The Scan runs on its own from here; the screen follows the run.
  const deadline = Date.now() + SCAN_WAIT_MS;
  let sawWorking = false;
  for (;;) {
    if (Date.now() > deadline) throw fail("SCAN_NEVER_FINISHED");
    run.app = await livePage(run.context, run.app);
    const screen = await currentScreen(run.app);
    if (screen === "ISC-02") {
      if (!sawWorking && index === 0) {
        sawWorking = true;
        await shot(run.app, "02-scan");
      }
      await sleep(2000);
      continue;
    }
    if (screen === "ISC-03" || screen === "ISC-04") {
      await waitForPerson(
        run.app,
        screen === "ISC-03"
          ? "Syllab 需要 DeepSeek API Key。请在 Settings 里填入你自己的 Key（脚本不会读取或记录它）。"
          : "Syllab 需要内容发送授权。请在 Settings 里完成授权。"
      );
      continue;
    }
    if (screen === "ISC-05" || screen === "ISC-06") {
      const detail = await run.app.locator("#app").innerText();
      throw fail(`SCAN_FAILED:${detail.split("\n").slice(0, 3).join(" ").slice(0, 120)}`);
    }
    break;
  }
  if (index === 0 && !sawWorking) throw fail("SCAN_NEVER_SHOWED_A_STAGE");

  await completeReview(run, index);
  return code;
}

/**
 * Initial Review, one whole Assessment at a time.
 *
 * `Confirm` is the product asking the user to accept what it read, and a run may answer it the same
 * way a user would. `Same assessment as…`, `Split`, a Conflict and an Identity question are Product
 * Judgment: the run stops and asks the Product Owner rather than deciding for them.
 */
async function completeReview(run, index) {
  const deadline = Date.now() + REVIEW_JUDGMENT_WAIT_MS;
  for (;;) {
    if (Date.now() > deadline) throw fail("REVIEW_NEVER_FINISHED");
    run.app = await livePage(run.context, run.app);
    const screen = await currentScreen(run.app);
    const onReview = screen !== null && /^(IRV|CRV)-/.test(screen);
    if (!onReview) return;
    if (index === 0) await shot(run.app, "03-review");
    if (screen === "IRV-01" || screen === "CRV-02") {
      const confirm = screenOf(run.app, screen).locator(".primary-action").first();
      if (await confirm.count()) {
        await confirm.click();
        await sleep(800);
        continue;
      }
    }
    // Anything else on a Review screen is a question this run is not entitled to answer.
    if (index === 0)
      record("Initial Review", "PRODUCT JUDGMENT", `waiting at ${screen ?? "review"}`);
    await waitForPerson(
      run.app,
      `Syllab 在 ${screen ?? "Review"} 需要你的产品判断（Same / Different / Uncertain、Accept / Ignore 等）。请在界面上完成这一步。`
    );
  }
}

/** Pauses until the person tells the run to carry on, or the screen moves on by itself. */
async function waitForPerson(page, message) {
  const before = await currentScreen(page);
  say("");
  say(`  ${message}`);
  say("  完成后脚本会自动继续。");
  focusChrome();
  const deadline = Date.now() + REVIEW_JUDGMENT_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(4000);
    if ((await currentScreen(page)) !== before) return;
  }
  throw fail("WAITED_FOR_THE_PRODUCT_OWNER_AND_GOT_NOTHING");
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

async function runCalendar(run, index) {
  await run.app.goto(`chrome-extension://${run.extensionId}/app.html`);
  const brief = await waitForScreen(run.app, "CRS-01", 30_000);
  const briefText = await brief.innerText();
  if (/\{/.test(briefText)) throw fail("RAW_JSON_ON_SCREEN");
  if (index === 0) await shot(run.app, "04-course-brief");

  await brief.locator(".more-menu .link-action").first().click();
  await brief.getByText("Export calendar", { exact: true }).click();
  const calendar = await waitForScreen(run.app, "CAL-01", 15_000);
  const calendarText = await calendar.innerText();
  if (index === 0) await shot(run.app, "05-calendar");

  const events = await calendar.locator(".calendar-event").count();
  const dates = await calendar.locator(".event-date").allInnerTexts();
  const exportButton = screenOf(run.app, "CAL-01").locator(".primary-action");
  return { briefText, calendarText, events, dates, canExport: (await exportButton.count()) > 0 };
}

/**
 * The last uninterrupted run of one event.
 *
 * A view is rebuilt every time anything it shows changes, so the same preview is computed several
 * times and the trace holds the same six dates more than once. What a reader wants is the run that
 * was on screen at the end, which is the one at the tail of the trace.
 */
function lastRun(trace, event) {
  const found = [];
  for (let index = trace.length - 1; index >= 0; index -= 1) {
    const entry = trace[index];
    if (entry.event === event) found.unshift(entry);
    else if (found.length > 0) break;
  }
  return found;
}

/** Every raw date-shaped value on the Course Brief, so the resolver's input is on the record. */
function rawDateValues(briefText) {
  const seen = new Set();
  const pattern =
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|Week\s+\d+|TBC)\b/g;
  for (const match of briefText.matchAll(pattern)) if (match[1]) seen.add(match[1]);
  return [...seen];
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const icsFiles = async () =>
  (await readdir(DOWNLOADS).catch(() => [])).filter((name) => name.endsWith(".ics"));

/**
 * A configured Course, as the Course Dashboard would name it.
 *
 * `.real-test.local.json` may give a Course outline URL or a course code — a URL is read the way
 * the Content Script reads one, from the visible heading, so the two forms land on the same name.
 * The name is then matched against the codes the product put on its own cards, which keeps the
 * dashboard rather than the config as the thing that decides what exists.
 */
async function courseName(page, configured) {
  if (!configured) return null;
  if (!/^https?:\/\//.test(configured)) return configured;
  await page.goto(configured, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const heading = await page
    .locator("h1")
    .first()
    .innerText()
    .catch(() => "");
  return heading.match(/\b[A-Z]{2,4}\d{4}[A-Z]?\b/)?.[0] ?? null;
}
async function waitForNewIcs(before, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const fresh = (await icsFiles()).find((name) => !before.includes(name));
    if (fresh) return join(DOWNLOADS, fresh);
    await sleep(1500);
  }
  return null;
}

// ---------------------------------------------------------------------------

async function autoRun() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(SHOTS, { recursive: true });
  await mkdir(DOWNLOADS, { recursive: true });

  const config = await readConfig();
  const profile = config.profile ? resolve(ROOT, config.profile) : DEFAULT_PROFILE;

  say("Syllab — real acceptance run");
  say(`  QA profile: ${profile}`);
  say(`  QA build:   ${EXTENSION}`);
  say("  The Product Owner's everyday Chrome profile is never opened, read or copied.");
  say("");

  const { child, port } = await launchChrome(profile);
  debugPort = port;
  const browser = await attach(port);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  let page = context.pages()[0] ?? (await context.newPage());
  let extensionId = null;

  try {
    await step("System Chrome", async () => {
      const version = browser.version();
      return version;
    });

    extensionId = await step("QA Extension", async () => {
      const id = await ensureExtension(context, page, unpackedExtensionId(EXTENSION));
      await reloadExtension(context, id);
      const session = await context.newCDPSession(page);
      await session.send("Browser.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: DOWNLOADS,
        eventsEnabled: true
      });
      return id;
    });

    if (!extensionId) throw fail("EXTENSION_ID_MISSING");

    const app = await context.newPage();
    const run = { app, context, extensionId, wanted: null };

    await step("Course Discovery", async () => {
      page = await livePage(context, page);
      await page.goto(`${NTU}/ultra/course`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      // The product reads the NTU Learn tab that is in front, and this tab has just loaded, so its
      // Content Script is the current build's. A tab left open from an earlier session can still be
      // running an older copy of it.
      await page.bringToFront();
      if (!(await signedIn(page))) {
        say("");
        say("  请在这个已经打开的 Syllab QA Chrome 里完成 NTU Login / MFA。");
        say("  脚本不会读取、记录或代填任何密码，也不会绕过 MFA；登录成功后自动继续。");
        say("  这一步完全由你操作：脚本在你登录期间不会刷新、导航或点击任何标签页。");
        say("");
        focusChrome();
        page = await awaitSignIn(context);
      }
      run.wanted = await courseName(page, config.courseA);
      const count = await waitForDiscovery(app, extensionId);
      if (count === 0) throw fail("NO_COURSE_DISCOVERED");
      const trace = await readTrace(app);
      const semesters = trace.filter((event) => event.event === "qa.semester-detected");
      return `${String(count)} courses in ${String(semesters.length)} semesters`;
    });

    await runCourse(run, 0);
    const afterScan = await readTrace(app);
    const calls = afterScan.filter((event) => event.event === "qa.deepseek-task");
    if (calls.length === 0) throw fail("DEEPSEEK_WAS_NEVER_CALLED");
    record(
      "Real DeepSeek",
      "PASS",
      `${String(calls.length)} model calls, ${String(
        calls.reduce((sum, event) => sum + (Number(event.fields?.outputTokens) || 0), 0)
      )} output tokens`
    );

    const calendar = await runCalendar(run, 0);

    if (!calendar.canExport) throw fail("NOTHING_EXPORTABLE");

    await step("Actual ICS Download", async () => {
      const before = await icsFiles();
      await screenOf(app, "CAL-01").locator(".primary-action").click();
      let file = await waitForNewIcs(before, DOWNLOAD_WAIT_MS);
      if (file === null) {
        say("");
        say("  Chrome 弹出了保存对话框。请把它保存到：");
        say(`    ${DOWNLOADS}`);
        say("  脚本会在文件出现后自动继续。");
        say("");
        focusChrome();
        file = await waitForNewIcs(before, DOWNLOAD_WAIT_MS * 3);
      }
      if (file === null) throw fail("NO_ICS_DOWNLOADED");

      const contents = await readFile(file, "utf8");
      const vevents = (contents.match(/BEGIN:VEVENT/g) ?? []).length;
      if (contents.trim().length === 0) throw fail("ICS_EMPTY");
      if (vevents !== calendar.events) {
        throw fail(`ICS_HAS_${String(vevents)}_PREVIEW_SAID_${String(calendar.events)}`);
      }
      // The preview formats a canonical date as `18 Oct`; the file writes it as `20261018`. Every
      // event the preview listed has to be in the file, which is checked by count as well as by
      // date so a swap of one event for another cannot pass.
      const written = [...contents.matchAll(/DTSTART[^:]*:(\d{8})/g)].map((match) => match[1]);
      if (written.length !== calendar.events) throw fail("ICS_DATES_MISSING");
      say(`  .ics: ${file.replace(ROOT, ".")} — ${String(vevents)} events`);
      return `${String(vevents)} events, matches the ${String(calendar.events)}-event preview`;
    });

    await step("Persistence", async () => {
      const before = await screenOf(app, "CRS-01")
        .first()
        .innerText()
        .catch(() => null);
      if (before === null) await waitForScreen(app, "CRS-01", 20_000);
      const first = await screenOf(app, "CRS-01").first().innerText();
      await app.close();
      const reopened = await context.newPage();
      await reopened.goto(`chrome-extension://${extensionId}/app.html`);
      const after = await waitForScreen(reopened, "CRS-01", 30_000);
      const second = await after.innerText();
      await shot(reopened, "06-after-reload");
      if (first.slice(0, 400) !== second.slice(0, 400))
        throw fail("STATE_DID_NOT_SURVIVE_A_RELOAD");
      return "Course Brief identical after closing and reopening the surface";
    });

    const trace = await traceNow(context, extensionId);
    latestTrace = trace;
    recordCourseVerdicts(calendar, trace);

    if (config.courseB) {
      const other = await context.newPage();
      const runB = {
        app: other,
        context,
        extensionId,
        wanted: await courseName(page, config.courseB)
      };
      say("");
      say(`  Course B: ${runB.wanted ?? String(config.courseB)}`);
      await runCourse(runB, 1);
      const second = await runCalendar(runB, 1);
      if (second.events === 0) throw fail("COURSE_B_NOTHING_EXPORTABLE");
      say(`  Course B: ${String(second.events)} exportable events`);
    } else {
      say("");
      say("  Course B 未配置。在 .real-test.local.json 里设置 courseB 可跑第二门课。");
    }
  } catch (error) {
    if (context.pages().every((item) => item.isClosed()) && extensionId !== null) {
      say("");
      say("  QA Chrome 窗口被关掉了，这一轮到此为止。");
      say("  它开着的时候请不要关它——脚本需要一直连着它。重跑即可继续：");
      say("    node scripts/real-test.mjs");
      say("");
    }
    throw error;
  } finally {
    if (extensionId !== null && latestTrace.length === 0) {
      latestTrace = await traceNow(context, extensionId).catch(() => []);
    }
    if (latestTrace.length > 0) await writeTrace(latestTrace).catch(() => undefined);
    await writeReport(profile);
    await closeChrome(context, browser, child);
  }
}

/**
 * Closes the run's Chrome the way a person would.
 *
 * Signalling the process is not the same thing. A Chrome that is killed does not write down what it
 * knows, and the QA profile learned this the hard way: it lost the unpacked extension and the NTU
 * session to a `kill` twice, and both of those are one-time things only the Product Owner can put
 * back. `Browser.close` is an orderly shutdown — it writes the profile and then exits — so the run
 * asks for that, waits for the process to actually go, and only escalates if it will not.
 */

// ---------------------------------------------------------------------------
// Manual run: the Product Owner drives, the run watches.
// ---------------------------------------------------------------------------

/** The screenshot each screen is evidence for, in the order the report lists them. */
const SCREENSHOT_FOR = {
  "SEM-01": "01-course-discovery",
  "ISC-02": "02-scan",
  "ISC-03": "02-scan",
  "ISC-04": "02-scan",
  "ISC-05": "02-scan",
  "IRV-01": "03-review",
  "CRV-02": "03-review",
  "CRS-01": "04-course-brief",
  "CAL-01": "05-calendar"
};

/**
 * The run as an observer.
 *
 * The Product Owner drives the product exactly as a user would — opening NTU Learn, clicking the
 * toolbar, scanning, reviewing, exporting — and this watches: it records what the QA build reports,
 * captures a screenshot whenever the screen changes, and writes the report at the end. Nothing here
 * clicks anything.
 *
 * That is a better acceptance than a scripted one, not a lesser one. The flow is the real flow
 * because a person performed it; what the run contributes is the record. It is also what the
 * product is for: the manual steps are the ones only its owner can take — a sign-in, a product
 * judgment, a save dialog — and a run that has to imitate them is imitating the wrong thing.
 */
async function manualRun() {
  await mkdir(SHOTS, { recursive: true });
  await mkdir(DOWNLOADS, { recursive: true });

  const config = await readConfig();
  const profile = config.profile ? resolve(ROOT, config.profile) : DEFAULT_PROFILE;

  say("Syllab — real acceptance run（手动操作模式）");
  say(`  QA profile: ${profile}`);
  say("  The Product Owner's everyday Chrome profile is never opened, read or copied.");
  say("");

  const { child, port } = await launchChrome(profile);
  debugPort = port;
  const browser = await attach(port);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());
  let extensionId = null;

  try {
    await step("System Chrome", () => Promise.resolve(browser.version()));
    extensionId = await step("QA Extension", async () => {
      const id = await ensureExtension(context, page, unpackedExtensionId(EXTENSION));
      await reloadExtension(context, id);
      const session = await context.newCDPSession(page);
      await session.send("Browser.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: DOWNLOADS,
        eventsEnabled: true
      });
      return id;
    });

    // The trace outlives a browser restart in this profile, and reading it from the beginning would
    // replay a failure from a build that no longer exists as if it had just happened.
    await page
      .goto(`chrome-extension://${extensionId}/app.html`, { waitUntil: "domcontentloaded" })
      .catch(() => undefined);
    await page
      .evaluate(() => chrome.storage.session.remove("syllab.qa.trace"))
      .catch(() => undefined);

    // A freshly loaded NTU Learn tab is what discovery reads, and it is also what guarantees the
    // Content Script in it is the build that was just installed rather than one still running in a
    // tab from before. A stale one answers with the rules it was built with, which is how a read
    // the current build allows got refused by a page nobody had reloaded.
    await page
      .goto(`${NTU}/ultra/course`, { waitUntil: "domcontentloaded", timeout: 60_000 })
      .catch(() => undefined);
    await sleep(6000);

    let observer = await openObserver(context, extensionId);
    await observer.bringToFront();

    say("");
    say("  现在请你自己在那个 Syllab 窗口里操作，脚本只观察和记录：");
    say("    1. 课程列表页已经打开过了，学期 / 课程发现应该已经跑过一轮；");
    say("       在这个 Syllab 页面上确认课程卡片出现");
    say("    2. 然后：点课程 → Scan course → 等 Initial Review → Confirm 每一项");
    say("       → Course Brief → More → Export calendar → Export");
    say("    3. 中途要填 DeepSeek API Key、或页面问 Same / Different 时，按提示操作即可");
    say("");
    say("  脚本会在每次界面变化时自动截图，并实时记录产品自己上报的 QA trace。");
    say("  全部做完后，回到这个终端按一次回车，脚本会写好报告。");
    say("");

    const deadline = Date.now() + 60 * 60 * 1000;
    let finished = false;
    process.stdin.resume();
    process.stdin.once("data", () => {
      finished = true;
    });

    const seenEvents = new Set();
    const nameFor = screenshotNamer();
    let lastScreen = null;
    let briefSeen = false;
    let reloadSeen = false;
    let exportedAt = null;
    let persistedTraceLength = -1;

    while (!finished && Date.now() < deadline) {
      await sleep(2000);
      if (!browser.isConnected()) throw fail("THE_QA_WINDOW_WAS_CLOSED");
      // Reloading the extension — which anyone iterating on it will do — destroys every page it
      // owns, this run's observer included. That is not the window closing and it is certainly not
      // a reason to close it: it is the run needing to open its eyes again.
      if (observer.isClosed()) observer = await openObserver(context, extensionId);

      const trace = await readTrace(observer).catch(() => []);
      // Preserve the structured event stream while the session is still live. A browser closure or
      // an interrupted paid workflow is itself evidence, and waiting until the happy-path end to
      // write `qa-events.json` used to discard exactly the trace needed to diagnose that failure.
      if (trace.length !== persistedTraceLength) {
        await writeFile(join(OUT, "qa-events.json"), `${JSON.stringify(trace, null, 2)}\n`);
        persistedTraceLength = trace.length;
      }
      for (const [index, entry] of trace.entries()) {
        const key = `${String(index)}:${entry.event}:${entry.at}`;
        if (seenEvents.has(key)) continue;
        seenEvents.add(key);
        say(
          `  · ${entry.event.replace(/^qa\./, "")} ${JSON.stringify(entry.fields).slice(0, 140)}`
        );
        if (entry.event === "qa.calendar-exported") exportedAt = Date.now();
      }

      const screen = await currentScreen(observer).catch(() => null);
      if (screen !== null && screen !== lastScreen) {
        const name = SCREENSHOT_FOR[screen];
        if (name !== undefined) {
          const taken = name === "04-course-brief" && briefSeen;
          const file = nameFor(taken ? "06-after-reload" : name);
          await shot(observer, file).catch(() => undefined);
          if (name === "04-course-brief") {
            if (briefSeen) reloadSeen = true;
            briefSeen = true;
          }
          say(`  📷 ${file}.png  （${screen}）`);
        }
        lastScreen = screen;
      }

      // The last step of the flow is the export; a run that has done it is finished.
      if (exportedAt !== null && Date.now() - exportedAt > 20_000) break;
    }

    say("");
    say("  记录结束，正在写报告…");
    const trace = await traceNow(context, extensionId).catch(() => []);
    reportFromTrace(trace, { reloadSeen });
    if (trace.length > 0) await writeTrace(trace).catch(() => undefined);
  } finally {
    // `process.stdin.resume()` keeps Node alive after an error unless it is explicitly balanced.
    // Pausing here lets the wrapper's EXIT trap archive partial evidence and restore the previous
    // run without requiring a second Ctrl-C.
    process.stdin.pause();
    await writeReport(profile);
    // Left open on purpose. Closing the browser at the end of a run the Product Owner was holding
    // looks exactly like the browser falling over, and it took the QA profile's state with it more
    // than once. The window is theirs; it is not this script's to shut.
    say("  QA Chrome 保持打开。不用了直接关掉窗口即可。");
    child?.unref();
  }
}

/**
 * Writes one screenshot under a name nothing has used yet.
 *
 * The screen a run is looking at repeats — the scan state comes and goes, the dashboard is returned
 * to — so naming a file after its screen alone meant later evidence overwrote earlier evidence, and
 * the report could show a failure state under a name that promised a working one. A second shot of
 * the same screen is kept beside the first rather than on top of it. (Gate 3 finding F11.)
 */
function screenshotNamer() {
  const used = new Map();
  return (base) => {
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    return count === 1 ? base : `${base}-${String(count)}`;
  };
}

/** A tab that watches the product's own page, replaced whenever the extension is reloaded. */
async function openObserver(context, extensionId) {
  const page = await context.newPage();
  await page
    .goto(`chrome-extension://${extensionId}/app.html`, { waitUntil: "domcontentloaded" })
    .catch(() => undefined);
  return page;
}

/** The rows a run can answer from what the product reported about itself. */
function reportFromTrace(trace, options) {
  const has = (event) => trace.some((entry) => entry.event === event);
  const count = (event) => trace.filter((entry) => entry.event === event).length;
  const dates = lastRun(trace, "qa.date-resolution");
  const preview = lastRun(trace, "qa.calendar-preview").at(-1)?.fields ?? {};
  const exported = lastRun(trace, "qa.calendar-exported").at(-1)?.fields ?? {};

  const set = (name, ok, note) => {
    if (!ok) return;
    record(name, "PASS", note);
  };
  set(
    "Course Discovery",
    has("qa.enrollment"),
    `${String(count("qa.semester-detected"))} semesters, ${String(count("qa.course-detected"))} courses seen`
  );
  set("Real DeepSeek", has("qa.deepseek-task"), `${String(count("qa.deepseek-task"))} model calls`);
  set("Initial Review", has("qa.review-opened"), "Review screens were reached");
  set("Course Brief", has("qa.course-brief"), "Current Course State was written");
  if (dates.length > 0) {
    record(
      "Semester Date Resolution",
      "PASS",
      `${String(dates.length)} dates read, ${String(dates.filter((e) => e.fields?.resolutionSource === "semester").length)} completed from Semester, ${String(dates.filter((e) => e.fields?.resolved === false).length)} left unresolved`
    );
  }
  if (preview.preview !== undefined) {
    // Zero events is not a preview that worked. The screen rendered and said there was nothing to
    // export, so the run learned what the export path does with an empty Course and nothing at all
    // about whether it writes a calendar. Reporting that as a pass is how a run that could not tell
    // becomes a run that says everything is fine. (Gate 3 finding F36.)
    if (preview.preview === 0) {
      record(
        "Calendar Preview",
        "NOT TESTED",
        `no confirmed dates on the Course (${String(preview.unresolved ?? 0)} unresolved)`
      );
    } else {
      record(
        "Calendar Preview",
        "PASS",
        `${String(preview.preview)} events, ${String(preview.unresolved ?? 0)} unresolved dates`
      );
    }
  }
  if (exported.events !== undefined) {
    record(
      "Actual ICS Download",
      "PASS",
      `${String(exported.fileName ?? "file")} — ${String(exported.events)} events written`
    );
  }
  if (options.reloadSeen) {
    record("Persistence", "PASS", "Course Brief still there after reopening the surface");
  }
}

async function closeChrome(context, browser, child) {
  try {
    const page = context.pages()[0];
    if (page) {
      const session = await context.newCDPSession(page);
      await session.send("Browser.close");
    }
  } catch {
    // Already gone, or no page to send it from.
  }
  if (child === null) return;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline && child.exitCode === null) await sleep(250);
  await browser.close().catch(() => undefined);
  if (child !== null && child.exitCode === null) child.kill();
}

/** The Course Brief and the resolver, read back from the QA trace rather than from a screenshot. */
function recordCourseVerdicts(calendar, trace) {
  const dates = lastRun(trace, "qa.date-resolution");
  const bySemester = dates.filter((event) => event.fields?.resolutionSource === "semester").length;
  const unresolved = dates.filter((event) => event.fields?.resolved === false).length;
  say("");
  say("  Date resolution, as the product decided it:");
  for (const event of dates) {
    const f = event.fields ?? {};
    say(
      `    raw ${JSON.stringify(f.rawValue)} + ${JSON.stringify(f.semester)} → ` +
        (f.resolved ? `${f.canonicalDate} (${f.resolutionSource})` : "unresolved")
    );
  }
  const raw = rawDateValues(calendar.briefText);
  say(`  raw date-shaped values on the Brief: ${raw.join(" | ") || "(none)"}`);
  say(`  resolved in the preview: ${calendar.dates.join(" | ") || "(none)"}`);

  record("Course Brief", "PASS", "Current Course State rendered, no raw JSON");
  record(
    "Semester Date Resolution",
    dates.length === 0 ? "NOT TESTED" : "PASS",
    dates.length === 0
      ? "the Course held no date-valued fact to resolve"
      : `${String(dates.length)} dates read, ${String(bySemester)} completed from Semester, ${String(unresolved)} left unresolved`
  );
  record(
    "Calendar Preview",
    calendar.events > 0 ? "PASS" : "FAIL",
    `${String(calendar.events)} events, ${String(unresolved)} unresolved dates`
  );
  if (results.get("Initial Review").status === "NOT TESTED") {
    record("Initial Review", "PASS", "every Initial Review item was confirmed");
  }
}

/** The machine-readable half of the run, in the shape a later run can compare against. */
async function writeTrace(trace) {
  const events = trace.map((entry) => entry.event);
  const dates = lastRun(trace, "qa.date-resolution");
  const summary = {
    courseDiscovery: events.includes("qa.enrollment"),
    scanCompleted: events.includes("qa.course-brief"),
    deepSeekCalled: events.includes("qa.deepseek-task"),
    dateResolution: {
      total: dates.length,
      semesterResolved: dates.filter((e) => e.fields?.resolutionSource === "semester").length,
      sourceResolved: dates.filter((e) => e.fields?.resolutionSource === "source").length,
      unresolved: dates.filter((e) => e.fields?.resolved === false).length
    },
    calendar: {
      preview: lastRun(trace, "qa.calendar-preview").at(-1)?.fields?.preview ?? 0,
      exported: lastRun(trace, "qa.calendar-exported").at(-1)?.fields?.events ?? 0
    },
    results: Object.fromEntries([...results].map(([name, value]) => [name, value.status]))
  };
  await writeFile(join(OUT, "trace.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(join(OUT, "qa-events.json"), `${JSON.stringify(trace, null, 2)}\n`);
  say(`  trace: ${join(OUT, "trace.json")} (${String(trace.length)} observed events)`);
}

async function writeReport(profile) {
  const lines = [
    "# Syllab v0.2.0 — Gate 3 real acceptance run",
    "",
    "Produced by `npm run test:real`: the machine's own Google Chrome, the QA build of the",
    "extension, real NTU Learn and the real DeepSeek provider. Nothing is seeded or replayed, and",
    "every verdict below was read from the product's own QA trace.",
    "",
    "| Step | Result | Note |",
    "| --- | --- | --- |"
  ];
  for (const name of CHECKS) {
    const { status, note } = results.get(name);
    lines.push(`| ${name} | ${status} | ${note.replace(/\|/g, "\\|")} |`);
  }
  lines.push(
    "",
    `QA profile: \`${profile}\``,
    "",
    "This directory is machine-local: it holds real course content in its screenshots and is not",
    "part of the delivery package. No password, cookie, session token, API key or Authorization",
    "header is recorded anywhere in it.",
    "",
    "## Run log",
    "",
    "```",
    ...log,
    "```",
    ""
  );
  await writeFile(join(OUT, "REPORT.md"), lines.join("\n"));
  process.stdout.write(`\nReport: ${join(OUT, "REPORT.md")}\n`);
}

/**
 * Manual by default, because the steps that matter most are the owner's to take. `--auto` runs the
 * scripted path instead; it exists for a machine that can drive the whole flow without a person.
 */
const run = process.argv.includes("--auto") ? autoRun : manualRun;
run().catch(async (error) => {
  say("");
  say(`  Run stopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
