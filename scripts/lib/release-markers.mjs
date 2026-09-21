/**
 * Strings that must not appear in anything a user installs.
 *
 * The acceptance bridge is one module, but it reaches a release build through several doors: its
 * marker, its fixture seed, and — as happened once — the listener body esbuild left behind as
 * `if (false) { … }` after it had already elided the module the body referenced. Checking only for
 * the marker would have missed that; checking for the bridge's identifiers catches it.
 *
 * The QA observation layer is the same shape of risk: its call sites sit inside product modules, so
 * a build that resolved one of them to the real module instead of the stub would ship telemetry.
 * Its storage key, callable identifiers and event names are listed. The inert production stub's
 * source-path comment may name `qa-telemetry.disabled.ts`; that name alone is not executable
 * telemetry, while every real storage/call/event marker remains forbidden.
 *
 * `scripts/verify-documented-facts.mjs` is not part of this: it reads documents, not bundles.
 */
export const RELEASE_FORBIDDEN = [
  "syllab.e2e/1",
  "E2E_SEED",
  "E2E_BACKUP",
  "E2E_OPEN",
  "E2E_FAILED",
  "e2eBackup",
  "handleE2e",
  "isE2eMessage",
  "e2e-fixtures",
  "syllab.qa.trace",
  "qaTrace",
  "qaBuild",
  "qa.date-resolution",
  "qa.semester-detected",
  "qa.course-detected",
  "qa.enrollment",
  "qa.scan-started",
  "qa.discovery-sources",
  "qa.source-read",
  "qa.deepseek-task",
  "qa.candidates",
  "qa.course-brief",
  "qa.calendar-preview",
  "qa.calendar-exported",
  "qa.review-opened",
  "qa.download-requested"
];

/**
 * Every forbidden string present in `text`, as a `MARKER:where` list. `where` is what the caller
 * was reading — a file name, or an archive entry — so a failure names its location.
 */
export function forbiddenHits(text, where) {
  return RELEASE_FORBIDDEN.filter((needle) => text.includes(needle)).map(
    (needle) => `${needle}:${where}`
  );
}

/** A string shaped like a provider API key. Also never shippable. */
export const KEY_SHAPE = /sk-[A-Za-z0-9]{16,}/;
