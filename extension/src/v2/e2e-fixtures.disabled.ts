/**
 * What `e2e-fixtures.ts` resolves to in a release build.
 *
 * Removing the bridge by tree-shaking is not enough. The fixture module's data is built by
 * top-level calls (`randomId(...)`, arrays of sample Evidence), so esbuild treats the module as
 * having side effects and keeps it in the bundle even after every binding that used it has been
 * eliminated. The shipped extension was carrying the acceptance fixtures' seed data.
 *
 * `extension/scripts/build.mjs` therefore swaps this module in when `SYLLAB_E2E_FIXTURES` is off,
 * so the fixture graph is never read at all rather than read and then discarded.
 *
 * Nothing here should ever run — a release build registers no acceptance listener — so each entry
 * point throws rather than returning a plausible value.
 */

/** A release build has no acceptance bridge, so nothing is ever an acceptance message. */
export function isE2eMessage(): false {
  return false;
}

export function e2eBackup(): never {
  throw new Error("ACCEPTANCE_BRIDGE_ABSENT");
}

export function handleE2e(): never {
  throw new Error("ACCEPTANCE_BRIDGE_ABSENT");
}
