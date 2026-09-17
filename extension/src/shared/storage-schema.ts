export const STORAGE_SCHEMA_VERSION = 1 as const;
export const STORAGE_SCHEMA_VERSION_KEY = "syllab.schemaVersion" as const;

export interface StorageMetadata {
  [STORAGE_SCHEMA_VERSION_KEY]: typeof STORAGE_SCHEMA_VERSION;
}
