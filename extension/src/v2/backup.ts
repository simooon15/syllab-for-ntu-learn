import { isRecord } from "@syllab/contracts";

import { DURABLE_TABLES } from "./schema";

export const BACKUP_FORMAT = "syllab.backup" as const;
export const BACKUP_VERSION = 2 as const;

// The backup table set is the store's own durable table set, so a table added to the schema can
// never silently drop out of a backup or out of a restore.
export { DURABLE_TABLES };
export type DurableTable = (typeof DURABLE_TABLES)[number];

/**
 * Fields that live on a durable row but are not user state. Source-derived text is cached bytes:
 * it is excluded from a backup and never written back by a restore.
 */
const VOLATILE_FIELDS: Partial<Record<DurableTable, readonly string[]>> = {
  sources: ["parsed"]
};

/** A row as it travels in a backup: durable fields only, never the cached bytes. */
export function durableRow<T extends Record<string, unknown>>(table: DurableTable, row: T): T {
  const fields = VOLATILE_FIELDS[table];
  if (!fields) return row;
  const copy = { ...row };
  for (const field of fields) Reflect.deleteProperty(copy, field);
  return copy;
}

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_VERSION;
  exportedAt: string;
  payload: Record<DurableTable, unknown[]>;
  counts: Record<DurableTable, number>;
  digest: string;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stable(value));
  const result = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(result)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

export async function createBackup(
  tables: Record<DurableTable, unknown[]>,
  exportedAt: string
): Promise<BackupEnvelope> {
  const payload = Object.fromEntries(
    DURABLE_TABLES.map((table) => [
      table,
      tables[table].map((row) =>
        isRecord(row) ? durableRow(table, structuredClone(row)) : structuredClone(row)
      )
    ])
  ) as Record<DurableTable, unknown[]>;
  const counts = Object.fromEntries(
    DURABLE_TABLES.map((table) => [table, payload[table].length])
  ) as Record<DurableTable, number>;
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    exportedAt,
    payload,
    counts,
    digest: await digest(payload)
  };
}

export async function validateBackup(value: unknown): Promise<BackupEnvelope> {
  if (
    !isRecord(value) ||
    value.format !== BACKUP_FORMAT ||
    value.formatVersion !== BACKUP_VERSION
  ) {
    throw new Error("BACKUP_FORMAT_UNSUPPORTED");
  }
  if (!isRecord(value.payload) || !isRecord(value.counts)) throw new Error("BACKUP_INVALID");
  const payload = {} as Record<DurableTable, unknown[]>;
  const counts = {} as Record<DurableTable, number>;
  for (const table of DURABLE_TABLES) {
    const entries = value.payload[table];
    const count = value.counts[table];
    if (!Array.isArray(entries) || typeof count !== "number" || entries.length !== count) {
      throw new Error(`BACKUP_INVALID:${table}`);
    }
    payload[table] = entries;
    counts[table] = count;
  }
  if (typeof value.digest !== "string" || (await digest(payload)) !== value.digest) {
    throw new Error("BACKUP_DIGEST_MISMATCH");
  }
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
    payload,
    counts,
    digest: value.digest
  };
}
