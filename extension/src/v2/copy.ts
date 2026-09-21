import type { TaskPhaseCopy } from "./contract";

/**
 * Every user-visible English string in the v0.2.0 surfaces lives here, flat and keyed by a
 * semantic name. The renderer never carries a user-facing literal: it asks for a key and this
 * module resolves it. A later localization pass replaces the values, not the call sites.
 *
 * `{name}` placeholders are filled by `t(key, params)`.
 */
export const CATALOG = {
  // --- Product -------------------------------------------------------------
  productName: "Syllab",

  // --- Shared controls -----------------------------------------------------
  back: "Back",
  backToSemester: "Back to semester",
  backToCourse: "Back to course",
  cancel: "Cancel",
  done: "Done",
  backChevron: "‹",
  identitySeparator: "↕",
  noticeDismiss: "×",
  edit: "Edit",
  save: "Save",
  undo: "Undo",
  tryAgain: "Try again",
  viewDetails: "View details",
  hideDetails: "Hide details",
  showMore: "Show more",
  showLess: "Show less",
  moreMenu: "More",
  showEvidence: "Show evidence for {label}",
  // The title an Evidence item falls back to when its Source record is gone. The product
  // documents never name this case; it is labelled so an Evidence list is never headless.
  evidenceCourseSource: "Course source",

  // --- Errors and system feedback -----------------------------------------
  errorUnreachable: "Syllab couldn’t reach its background service. Reopen this view to try again.",
  errorCodeLabel: "Error code: {code}",
  toastExcluded: "Assessment excluded.",
  toastReviewComplete: "Review complete",

  // --- Semester navigation (SEM-01 … SEM-07, SYS-02) ------------------------
  semesterSwitch: "Switch semester",
  semesterCurrentBadge: "Current",
  semesterHistoricalBadge: "Historical",
  semesterEmpty: "No courses found yet.",
  semesterEmptyHistorical: "No courses in this semester.",
  semesterCheckingCourses: "Checking courses…",
  openFullDashboard: "Open full dashboard",
  settingsLink: "Settings",
  notEstablishedPrompt: "This course hasn’t been set up yet.",
  scanCourse: "Scan course",
  moreAssessments: "+ {count} more assessments",

  // --- Course status (SYS-01, SYS-03) --------------------------------------
  statusReviewCompact: "Review · {count}",
  statusReviewFull: "{count} changes to review",
  statusChecking: "Checking…",
  statusNeedsAttention: "Needs attention",
  statusApiKey: "API key needs attention",
  statusPermission: "Permission required",
  statusAuthorization: "Authorization required",
  attentionOutOfDate: "Course information may be out of date",
  // §4.17 / §11.6 draw the detail as the sentence above, then the date on its own line. The line
  // used to open with the sentence again, so the reason appeared twice on screen.
  attentionLastCheck: "Last successful check: {date}",

  // --- Course Brief (CRS-01 … CRS-06) --------------------------------------
  noAssessments: "No assessments found",
  constraintsHeading: "Course-wide constraints",
  markEdited: "Edited",
  markChanged: "Changed",
  markPossiblyRemoved: "Possibly removed",
  unclearFact: "{label} is unclear",
  moreAddAssessment: "Add assessment",
  moreCheckForUpdates: "Check for updates",
  moreExportCalendar: "Export calendar",
  moreRebuildCourse: "Rebuild course",
  addAssessmentHeading: "Add assessment",
  addAssessmentNameLabel: "Assessment name",
  addAssessmentKindLabel: "Type",
  addAssessmentSubmit: "Add assessment",
  editAssessmentHeading: "Edit assessment",
  editNameLabel: "Assessment name",
  kindAssignment: "Assignment",
  kindProject: "Project",
  kindQuizTest: "Quiz / Test",
  kindExam: "Exam",
  kindOther: "Assessment",

  // --- Initial setup and Scan (ISC-01 … ISC-06) ----------------------------
  scanWorkingHeading: "Setting up this course",
  scanStageFinding: "Finding course content…",
  scanStageReading: "Reading course materials…",
  scanStageUnderstanding: "Understanding course information…",
  scanStageOrganizing: "Organizing assessments…",
  scanWaitingApiKeyTitle: "DeepSeek API key required",
  scanWaitingApiKeyBody: "Add your API key to continue.",
  scanWaitingPermissionTitle: "Permission required",
  scanWaitingPermissionBody: "Allow access to continue.",
  scanWaitingAuthorizationBody: "Allow course content to be sent to the AI to continue.",
  actionOpenSettings: "Open Settings",
  actionGrantPermission: "Grant permission",
  actionResume: "Continue",
  scanFailedTitle: "Scan couldn’t be completed.",
  // §11.7 wants a user-understandable reason on a Failed task. This is the line for a failure that
  // arrived with no detail of its own; when there is one, it is shown instead.
  taskCouldNotComplete: "This task could not be completed.",

  // --- Initial Review (IRV-01 … IRV-06) ------------------------------------
  reviewProgress: "{index} of {total}",
  // A Review item with no Assessment and no field behind it still needs a title. The product
  // documents never name this case; the wording is unchanged from where it used to sit inline.
  reviewCourseChange: "Course change",
  reviewConfirm: "Confirm",
  reviewExclude: "Exclude",
  reviewLater: "Review later",
  reviewMore: "More…",
  reviewSameAssessmentAs: "Same assessment as…",
  reviewSplit: "Split",
  mergeHeading: "Same assessment as…",
  mergeIntro: "Choose the assessment this item belongs to.",
  mergeEmpty: "There are no other assessments in this course yet.",
  splitHeading: "Split assessment",
  splitIntro: "Name each part and choose the facts it covers.",
  splitPart: "Part {index}",
  splitPartName: "Assessment name",
  splitAddPart: "Add part",
  splitConfirm: "Split",
  splitAssignFacts: "Which part does each detail belong to?",
  hintSplit: "Use this when this item actually contains two or more separate assessments.",
  hintSameAssessmentAs:
    "Use this when this item is really the same assessment as one you already have.",

  // --- Change Review (CRV-01 … CRV-06) -------------------------------------
  changeCurrent: "Current",
  changeLatest: "Latest",
  changeOtherValues: "Other values",
  acceptChange: "Accept change",
  keepCurrent: "Keep current",
  conflictUseValue: "Use this value",
  conflictEditValue: "Edit",
  conflictValueLabel: "Correct value",
  conflictSaveValue: "Save value",
  keep: "Keep",
  remove: "Remove",
  identityQuestion: "Is this the same assessment?",
  identitySame: "Same assessment",
  identityDifferent: "Different assessment",

  // --- Rebuild (RBL-01 … RBL-04) -------------------------------------------
  rebuildConfirmTitle: "Rebuild course",
  rebuildConfirmBody:
    "Rebuild scans this course again and organizes it from scratch. Nothing changes until you choose the new result.",
  rebuildConfirmAction: "Rebuild course",
  rebuildPreviewLabel: "Rebuilt course preview",
  rebuildPartialTitle: "Partial rebuild preview",
  rebuildPartialBody:
    "This result is incomplete because some course sources could not be processed.",
  rebuildPartialStateSafe: "Your current course has not been changed.",
  rebuildPartialCannotAdopt: "This partial result cannot be used as your rebuilt course.",
  useRebuiltCourse: "Use rebuilt course",
  keepCurrentCourse: "Keep current course",

  // --- Calendar export (CAL-01, CAL-02) ------------------------------------
  calendarTitle: "Export calendar",
  calendarEventCount: "{count} events",
  calendarEventCountOne: "1 event",
  calendarEmpty: "There are no confirmed dates to export yet.",
  // A Course that holds dates this product cannot place is not an empty Course, and saying "no
  // dates" about it would be untrue. The note names the ones left out rather than dropping them.
  calendarNoneExportable: "No dates can be exported yet.",
  calendarUnresolvedOne: "1 date couldn't be added because its date is incomplete or unclear.",
  calendarUnresolved:
    "{count} dates couldn't be added because their dates are incomplete or unclear.",
  calendarExport: "Export",
  calendarExported: "Calendar exported",

  // --- Settings (SET-01 … SET-05) ------------------------------------------
  settingsTitle: "Settings",
  settingsAi: "AI",
  settingsAuthorization: "Authorization",
  settingsData: "Data",
  settingsAbout: "About",
  apiKeyLabel: "DeepSeek API key",
  apiKeyPlaceholder: "Paste your API key",
  apiKeyReveal: "Reveal",
  apiKeyHide: "Hide",
  apiKeySave: "Save key",
  apiKeyCheck: "Check key",
  apiKeyMissing: "No API key yet.",
  apiKeyMissingBody: "Add your DeepSeek API key to use AI features.",
  apiKeyInvalid: "This API key isn’t working.",
  apiKeyInvalidBody: "Check the key and save it again.",
  apiKeyUnvalidated: "Not checked yet.",
  apiKeyUnvalidatedBody: "Save the key to check it with DeepSeek.",
  apiKeyValid: "API key saved.",
  apiKeyValidBody: "DeepSeek accepted this key.",
  apiKeyStoredSuffix: "Saved key ends with {suffix}",
  privacyLabel: "Send course content to the AI",
  privacyBody:
    "Syllab sends the course pages and files it needs to understand your course to DeepSeek. Nothing is sent until you allow it.",
  apiUsageLabel: "Let Syllab use your API in the background",
  apiUsageBody:
    "Syllab can re-check your established courses on its own and use your DeepSeek key for that work. Turn this off to use AI only when you ask.",
  authorizationOn: "Allowed",
  authorizationOff: "Not allowed",
  aboutVersion: "v{version}",

  // --- Backup and restore (BKP-01 … BKP-05) --------------------------------
  dataBackupHeading: "Backup",
  dataBackupBody:
    "Export a file with everything Syllab has saved: semesters, courses, assessments, reviews and history.",
  exportBackup: "Export backup",
  backupExported: "Backup exported",
  backupKeyNotice: "Your DeepSeek API key is not included.",
  dataRestoreHeading: "Restore",
  dataRestoreBody:
    "Restoring replaces everything Syllab has saved locally with the contents of a backup file.",
  restoreFromBackup: "Restore from backup",
  restoreChooseFile: "Choose a backup file",
  restoreSummaryHeading: "This backup contains",
  restoreSummaryCourses: "{count} courses",
  restoreSummaryAssessments: "{count} assessments",
  restoreWarningTitle: "This replaces everything",
  restoreWarningBody:
    "Your current Syllab data will be replaced by this backup. Your DeepSeek API key is not affected.",
  restoreConfirm: "Replace everything",
  restoreWorkingTitle: "Restoring backup",
  restoreReading: "Reading backup…",
  restoreValidating: "Validating backup…",
  restoreRestoring: "Restoring course data…",
  restoreFailedTitle: "The backup couldn’t be restored.",
  restoreFailedBody: "Your current Syllab data is unchanged."
} as const;

export type CopyKey = keyof typeof CATALOG;

/** Runtime copy values. Swapped wholesale by a localization pass. */
export const copy: Record<CopyKey, string> = { ...CATALOG };

/** The four fixed Scan stages, in order. The contract fixes their exact strings. */
export const SCAN_STAGES: readonly [TaskPhaseCopy, TaskPhaseCopy, TaskPhaseCopy, TaskPhaseCopy] = [
  CATALOG.scanStageFinding,
  CATALOG.scanStageReading,
  CATALOG.scanStageUnderstanding,
  CATALOG.scanStageOrganizing
];

/** The fixed Scan stages map onto catalogue entries, never onto literals in the renderer. */
const STAGE_KEYS: Record<TaskPhaseCopy, CopyKey> = {
  "Finding course content…": "scanStageFinding",
  "Reading course materials…": "scanStageReading",
  "Understanding course information…": "scanStageUnderstanding",
  "Organizing assessments…": "scanStageOrganizing"
};

export function stageCopy(stage: TaskPhaseCopy): string {
  return t(STAGE_KEYS[stage]);
}

const usedKeys = new Set<CopyKey>();

/**
 * Resolves one catalogue entry. Every key the renderer asks for is recorded, so a test can
 * prove that the catalogue has no unused entry and the UI has no unresolved one.
 */
export function t(key: CopyKey, params?: Record<string, string | number>): string {
  usedKeys.add(key);
  const template = copy[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function copyKeys(): CopyKey[] {
  return (Object.keys(copy) as CopyKey[]).sort();
}

export function usedCopyKeys(): CopyKey[] {
  return [...usedKeys].sort();
}

export function resetCopyUsage(): void {
  usedKeys.clear();
}

/** Test-only: replaces every value so rendered text can be traced back to a key. */
export function setCopyValues(values: Partial<Record<CopyKey, string>>): void {
  Object.assign(copy, values);
}
