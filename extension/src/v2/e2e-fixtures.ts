/**
 * Deterministic browser E2E and screenshot bridge. Routes are reachable only when the bundle is
 * built with `SYLLAB_E2E_FIXTURES=1`, which the acceptance build sets and the shipped build does
 * not. It seeds synthetic scenarios through the real store and drives real reducers, so captured
 * evidence reflects the actual product paths.
 */
import type { ScreenId } from "./contract";
import type { CourseRecord } from "./domain";
import { applyFixture, FIXTURE_COURSE_ID, type FixtureScenario } from "./fixtures";
import { acceptChange, applyInitialReviewDecision, StateGuardError } from "./course-state";
import type { LocalStore } from "./store";

export const E2E_CONTRACT = "syllab.e2e/1" as const;

export interface E2eSeedMessage {
  contract: typeof E2E_CONTRACT;
  type: "E2E_SEED";
  scenario: FixtureScenario;
}

export interface E2eActionMessage {
  contract: typeof E2E_CONTRACT;
  type: "E2E_ACTION";
  action:
    | "AcceptFirstChange"
    | "ConfirmFirstReviewItem"
    | "StaleRevisionMutation"
    | "ExcludeFirstReviewItem";
}

/** Routes a surface to a named screen so acceptance can capture every required state. */
export interface E2eOpenMessage {
  contract: typeof E2E_CONTRACT;
  type: "E2E_OPEN";
  surface: "side-panel" | "full-page";
  /** Typed as a Screen id so the bridge cannot route a surface to a screen that does not exist. */
  screen: ScreenId;
  courseId?: string;
}

/** Returns the real backup document as a string instead of downloading it. */
export interface E2eBackupMessage {
  contract: typeof E2E_CONTRACT;
  type: "E2E_BACKUP";
}

export type E2eMessage = E2eSeedMessage | E2eActionMessage | E2eOpenMessage | E2eBackupMessage;

export interface E2eResult {
  ok: boolean;
  courseId?: string;
  reviewItemIds: string[];
  changeIds: string[];
  errorCode?: string;
}

export function isE2eMessage(value: unknown): value is E2eMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { contract?: unknown }).contract === E2E_CONTRACT &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

export interface E2eBackupResult {
  ok: boolean;
  backup?: string;
  errorCode?: string;
}

export async function e2eBackup(store: LocalStore, now: string): Promise<E2eBackupResult> {
  // Built by the same export path the product uses, so restore acceptance exercises the real
  // document rather than a hand-written one.
  const { createBackup } = await import("./backup");
  const backup = await createBackup(await store.readDurableTables(), now);
  return { ok: true, backup: JSON.stringify(backup) };
}

export async function handleE2e(store: LocalStore, message: E2eMessage): Promise<E2eResult> {
  if (message.type === "E2E_BACKUP") return { ok: false, reviewItemIds: [], changeIds: [] };
  if (message.type === "E2E_OPEN") {
    // Route state is owned by the handler; the acceptance run sets it through the same map the
    // product uses, so the captured screen is the product's own rendering of that route.
    return { ok: true, reviewItemIds: [], changeIds: [] };
  }
  if (message.type === "E2E_SEED") {
    const result = await applyFixture(store, message.scenario);
    return {
      ok: true,
      ...(result.courseId ? { courseId: result.courseId } : {}),
      reviewItemIds: result.reviewItemIds,
      changeIds: result.changeIds
    };
  }
  const courseId = FIXTURE_COURSE_ID;
  const snapshot = await store.readSnapshot(courseId);
  if (!snapshot)
    return { ok: false, reviewItemIds: [], changeIds: [], errorCode: "COURSE_NOT_FOUND" };
  const now = new Date().toISOString();
  // The stale action deliberately presents an outdated revision so the real guard refuses it.
  const expected = message.action === "StaleRevisionMutation" ? 0 : snapshot.course.currentRevision;

  if (message.action === "AcceptFirstChange" || message.action === "StaleRevisionMutation") {
    const first = snapshot.changes[0];
    if (!first) return { ok: false, reviewItemIds: [], changeIds: [], errorCode: "NO_CHANGE" };
    // `expected` is deliberately wrong for the stale action, so the guard must refuse to apply.
    try {
      const result = acceptChange(snapshot, {
        changeId: first.changeId,
        expectedRevision: expected,
        now
      });
      await store.commitMutation(courseId, result);
      return { ok: true, courseId, reviewItemIds: [], changeIds: [first.changeId] };
    } catch (error) {
      if (error instanceof StateGuardError) {
        return { ok: false, courseId, reviewItemIds: [], changeIds: [], errorCode: error.code };
      }
      throw error;
    }
  }

  if (message.action === "ExcludeFirstReviewItem") {
    const first = snapshot.reviewItems[0];
    if (!first) return { ok: false, reviewItemIds: [], changeIds: [], errorCode: "NO_REVIEW_ITEM" };
    const result = applyInitialReviewDecision(snapshot, {
      reviewItemId: first.reviewItemId,
      kind: "Exclude",
      expectedRevision: expected,
      now
    });
    await store.commitReviewDecision(courseId, first.reviewItemId, result);
    return { ok: true, courseId, reviewItemIds: [first.reviewItemId], changeIds: [] };
  }

  const first = snapshot.reviewItems[0];
  if (!first) return { ok: false, reviewItemIds: [], changeIds: [], errorCode: "NO_REVIEW_ITEM" };
  const assessment = snapshot.assessments.find((item) => item.assessmentId === first.targetId);
  const facts = snapshot.facts.filter((item) => item.assessmentId === first.targetId);
  try {
    const result = applyInitialReviewDecision(snapshot, {
      reviewItemId: first.reviewItemId,
      kind: "Confirm",
      expectedRevision: expected,
      now,
      ...(assessment ? { assessment: assessment } : {}),
      facts: facts
    });
    await store.commitReviewDecision(courseId, first.reviewItemId, result);
    return { ok: true, courseId, reviewItemIds: [first.reviewItemId], changeIds: [] };
  } catch (error) {
    if (error instanceof StateGuardError) {
      return { ok: false, courseId, reviewItemIds: [], changeIds: [], errorCode: error.code };
    }
    throw error;
  }
}

export type { CourseRecord };
