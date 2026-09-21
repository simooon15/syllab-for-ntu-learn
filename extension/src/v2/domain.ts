/**
 * v0.2 domain surface. Record shapes live in `schema.ts` next to the store definitions;
 * this module is what the rest of the extension imports, and it owns the small set of
 * compatibility aliases that keep older call sites readable.
 */
export * from "./schema";

export type {
  AssessmentRecord as AssessmentRecordV2,
  ChangeRecord as PendingChangeRecord,
  ChangeRecord as ChangeRecordV2,
  WorkflowRecord as WorkflowRecordV2
} from "./schema";

export const V2_SCHEMA_VERSION = "syllab.local/2" as const;
