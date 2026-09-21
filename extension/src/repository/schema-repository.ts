import {
  STORAGE_SCHEMA_VERSION,
  STORAGE_SCHEMA_VERSION_KEY,
  type StorageMetadata
} from "../shared/storage-schema";

export interface StorageArea {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export async function ensureStorageSchema(storage: StorageArea): Promise<StorageMetadata> {
  const current = await storage.get(STORAGE_SCHEMA_VERSION_KEY);
  const storedVersion = current[STORAGE_SCHEMA_VERSION_KEY];

  if (storedVersion === undefined) {
    const metadata: StorageMetadata = {
      [STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION
    };
    await storage.set({ ...metadata });
    return metadata;
  }

  if (storedVersion === 1) {
    const metadata: StorageMetadata = {
      [STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION
    };
    await storage.set({ ...metadata });
    return metadata;
  }

  if (storedVersion !== STORAGE_SCHEMA_VERSION) {
    throw new Error(`Unsupported storage schema version: ${JSON.stringify(storedVersion)}`);
  }

  return { [STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION };
}

export async function readStorageSchemaVersion(storage: StorageArea): Promise<number> {
  const result = await storage.get(STORAGE_SCHEMA_VERSION_KEY);
  const version = result[STORAGE_SCHEMA_VERSION_KEY];
  if (typeof version !== "number") throw new Error("Storage schema has not been initialized");
  return version;
}
