import { describe, expect, it } from "vitest";

import {
  ensureStorageSchema,
  readStorageSchemaVersion,
  type StorageArea
} from "./schema-repository";

function memoryStorage(seed: Record<string, unknown> = {}): StorageArea {
  const values = { ...seed };
  return {
    get(keys) {
      const requested = Array.isArray(keys) ? keys : [keys];
      return Promise.resolve(
        Object.fromEntries(
          requested.filter((key) => key in values).map((key) => [key, values[key]])
        )
      );
    },
    set(items) {
      Object.assign(values, items);
      return Promise.resolve();
    }
  };
}

describe("storage schema repository", () => {
  it("initializes and survives a simulated service worker restart", async () => {
    const storage = memoryStorage();
    await ensureStorageSchema(storage);
    expect(await readStorageSchemaVersion(storage)).toBe(2);
    expect(await ensureStorageSchema(storage)).toEqual({ "syllab.schemaVersion": 2 });
  });

  it("migrates the v0.1 storage metadata idempotently", async () => {
    const storage = memoryStorage({ "syllab.schemaVersion": 1 });
    expect(await ensureStorageSchema(storage)).toEqual({ "syllab.schemaVersion": 2 });
    expect(await ensureStorageSchema(storage)).toEqual({ "syllab.schemaVersion": 2 });
  });

  it("rejects an unknown future schema", async () => {
    const storage = memoryStorage({ "syllab.schemaVersion": 999 });
    await expect(ensureStorageSchema(storage)).rejects.toThrow(
      "Unsupported storage schema version"
    );
  });
});
