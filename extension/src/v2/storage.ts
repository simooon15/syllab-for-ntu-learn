import { randomId } from "./crypto";
import {
  ACTIVE_GENERATION_KEY,
  DURABLE_TABLES,
  GENERATION_FIELD,
  V2_DATABASE_VERSION,
  V2_STORES,
  type AppMetadataRecord,
  type DurableTable,
  type V2StoreName
} from "./schema";

export const DATABASE_NAME = "syllab-local";

/** Metadata is a fixed store, never a caller-selected one; this keeps the generics honest. */
const METADATA_STORE: V2StoreName = "appMetadata";

/**
 * A record as it exists on disk. Durable tables carry the restore generation; the
 * repository strips it on read and stamps it on write so callers never handle it.
 */
type Stored<T> = T & { [GENERATION_FIELD]?: string };

interface IndexDefinition {
  name: string;
  keyPath: string;
}

const STORE_INDEXES: Partial<Record<V2StoreName, IndexDefinition[]>> = {
  courses: [{ name: "semesterId", keyPath: "semesterId" }],
  assessments: [
    { name: "courseId", keyPath: "courseId" },
    { name: "parentAssessmentId", keyPath: "parentAssessmentId" }
  ],
  constraints: [{ name: "courseId", keyPath: "courseId" }],
  facts: [{ name: "courseId", keyPath: "courseId" }],
  sources: [{ name: "courseId", keyPath: "courseId" }],
  evidence: [
    { name: "courseId", keyPath: "courseId" },
    { name: "sourceId", keyPath: "sourceId" }
  ],
  sourceObservations: [
    { name: "courseId", keyPath: "courseId" },
    { name: "workflowId", keyPath: "workflowId" }
  ],
  reviewItems: [
    { name: "courseId", keyPath: "courseId" },
    { name: "workflowId", keyPath: "workflowId" }
  ],
  reviewDecisions: [{ name: "courseId", keyPath: "courseId" }],
  exclusionMemory: [{ name: "courseId", keyPath: "courseId" }],
  changes: [
    { name: "courseId", keyPath: "courseId" },
    { name: "workflowId", keyPath: "workflowId" }
  ],
  history: [{ name: "courseId", keyPath: "courseId" }],
  workflows: [{ name: "courseId", keyPath: "courseId" }],
  aiRuns: [
    { name: "courseId", keyPath: "courseId" },
    { name: "workflowId", keyPath: "workflowId" }
  ]
};

/** Stores that existed in v0.1.0 and stay readable for rollback during development. */
export const LEGACY_STORES = [
  "candidates",
  "reviewProgress",
  "briefItems",
  "parsedSources",
  "normalizedUnits"
] as const;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("INDEXED_DB_ERROR")),
      { once: true }
    );
  });
}

export function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("INDEXED_DB_ABORT")),
      {
        once: true
      }
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("INDEXED_DB_ERROR")),
      {
        once: true
      }
    );
  });
}

function upgrade(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(LEGACY_STORES[0])) {
    const candidates = database.createObjectStore(LEGACY_STORES[0], { keyPath: "candidateId" });
    candidates.createIndex("scanId", "scanId", { unique: false });
  }
  if (!database.objectStoreNames.contains(LEGACY_STORES[1])) {
    database.createObjectStore(LEGACY_STORES[1], { keyPath: "scanId" });
  }
  if (!database.objectStoreNames.contains(LEGACY_STORES[2])) {
    const briefs = database.createObjectStore(LEGACY_STORES[2], { keyPath: "briefItemId" });
    briefs.createIndex("courseId", "courseId", { unique: false });
  }
  if (!database.objectStoreNames.contains(LEGACY_STORES[3])) {
    const parsed = database.createObjectStore(LEGACY_STORES[3], { keyPath: "recordId" });
    parsed.createIndex("scanId", "scanId", { unique: false });
  }
  if (!database.objectStoreNames.contains(LEGACY_STORES[4])) {
    const normalized = database.createObjectStore(LEGACY_STORES[4], { keyPath: "unitId" });
    normalized.createIndex("scanId", "scanId", { unique: false });
  }

  for (const [storeName, keyPath] of Object.entries(V2_STORES)) {
    const name = storeName as V2StoreName;
    // Indexes may only be created while the store itself is being created; this callback
    // runs inside the versionchange transaction, where opening another one is illegal.
    if (database.objectStoreNames.contains(name)) continue;
    const store = database.createObjectStore(name, { keyPath });
    for (const index of STORE_INDEXES[name] ?? []) {
      store.createIndex(index.name, index.keyPath, { unique: false });
    }
  }
}

export interface Transaction<Tables extends V2StoreName> {
  readonly names: readonly Tables[];
  put(table: Tables, record: Record<string, unknown>): Promise<void>;
  putMany(table: Tables, records: Record<string, unknown>[]): Promise<void>;
  get<T>(table: Tables, key: string): Promise<T | undefined>;
  getAll<T>(table: Tables): Promise<T[]>;
  delete(table: Tables, key: string): Promise<void>;
  clear(table: Tables): Promise<void>;
  metadata(): Promise<Record<string, unknown>>;
  setMetadata(items: Record<string, unknown>): Promise<void>;
}

class TransactionImpl<Tables extends V2StoreName> implements Transaction<Tables> {
  private readonly promises: Promise<unknown>[] = [];

  constructor(
    private readonly transaction: IDBTransaction,
    readonly names: readonly Tables[],
    private readonly generation: string | null
  ) {}

  private store(table: Tables): IDBObjectStore {
    return this.transaction.objectStore(table);
  }

  private track<T>(promise: Promise<T>): Promise<T> {
    this.promises.push(promise);
    return promise;
  }

  put(table: Tables, record: Record<string, unknown>): Promise<void> {
    const target = table;
    const payload =
      this.generation && DURABLE_TABLES.includes(target as DurableTable)
        ? { ...record, [GENERATION_FIELD]: this.generation }
        : record;
    return this.track(requestResult(this.store(target).put(payload)).then(() => undefined));
  }

  async putMany(table: Tables, records: Record<string, unknown>[]): Promise<void> {
    for (const record of records) await this.put(table, record);
  }

  async get<T>(table: Tables, key: string): Promise<T | undefined> {
    const value = await this.track(
      requestResult<Stored<T> | undefined>(
        this.store(table).get(key) as IDBRequest<Stored<T> | undefined>
      )
    );
    if (value === undefined) return undefined;
    return this.strip(value);
  }

  async getAll<T>(table: Tables): Promise<T[]> {
    const values = await this.track(
      requestResult<Stored<T>[]>(this.store(table).getAll() as IDBRequest<Stored<T>[]>)
    );
    return values
      .filter(
        (value) =>
          !this.generation ||
          !DURABLE_TABLES.includes(table as DurableTable) ||
          value[GENERATION_FIELD] === this.generation
      )
      .map((value) => this.strip(value));
  }

  private strip<T>(value: Stored<T>): T {
    const { [GENERATION_FIELD]: _generation, ...rest } = value as Stored<T> &
      Record<string, unknown>;
    return rest as T;
  }

  delete(table: Tables, key: string): Promise<void> {
    return this.track(requestResult(this.store(table).delete(key)));
  }

  clear(table: Tables): Promise<void> {
    return this.track(requestResult(this.store(table).clear()));
  }

  async metadata(): Promise<Record<string, unknown>> {
    // Metadata is not caller-selectable, so it bypasses the table generic rather than
    // widening every caller's store union to include it.
    const records = await this.getAll<AppMetadataRecord>(METADATA_STORE as unknown as Tables);
    return Object.fromEntries(records.map((record) => [record.key, record.value]));
  }

  async setMetadata(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      await this.put(METADATA_STORE as unknown as Tables, { key, value });
    }
  }

  async settle(): Promise<void> {
    await Promise.all(this.promises);
    await transactionComplete(this.transaction);
  }
}

export class LocalDatabase {
  private connection: IDBDatabase | null = null;

  constructor(
    private readonly factory: IDBFactory = indexedDB,
    private readonly name = DATABASE_NAME
  ) {}

  async open(): Promise<IDBDatabase> {
    if (this.connection) return this.connection;
    const request = this.factory.open(this.name, V2_DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      upgrade(request.result);
    });
    const connection = await requestResult(request);
    connection.addEventListener("versionchange", () => {
      connection.close();
      this.connection = null;
    });
    this.connection = connection;
    return connection;
  }

  close(): Promise<void> {
    this.connection?.close();
    this.connection = null;
    return Promise.resolve();
  }

  async read<Tables extends V2StoreName, T>(
    tables: Tables[],
    body: (transaction: Transaction<Tables>) => Promise<T>
  ): Promise<T> {
    const connection = await this.open();
    const generation = await this.readGeneration();
    const transaction = connection.transaction(tables, "readonly");
    const implementation = new TransactionImpl<Tables>(transaction, tables, generation);
    const result = await body(implementation);
    await transactionComplete(transaction);
    return result;
  }

  async write<Tables extends V2StoreName, T>(
    tables: Tables[],
    body: (transaction: Transaction<Tables>) => Promise<T>
  ): Promise<T> {
    const connection = await this.open();
    // Resolved before the write transaction opens: IndexedDB transactions autocommit and
    // cannot be awaited across, so no metadata work may happen inside this window.
    const generation = await this.ensureGeneration();
    const transaction = connection.transaction(tables, "readwrite");
    const implementation = new TransactionImpl<Tables>(transaction, tables, generation);
    let result: T;
    try {
      result = await body(implementation);
      await implementation.settle();
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already have aborted or committed; the original error wins.
      }
      throw error;
    }
    return result;
  }

  async ensureGeneration(): Promise<string> {
    const connection = await this.open();
    const transaction = connection.transaction(["appMetadata"], "readwrite");
    const store = transaction.objectStore("appMetadata");
    const existing = await requestResult<AppMetadataRecord | undefined>(
      store.get(ACTIVE_GENERATION_KEY) as IDBRequest<AppMetadataRecord | undefined>
    );
    if (existing && typeof existing.value === "string") {
      await transactionComplete(transaction);
      return existing.value;
    }
    const generation = randomId("gen");
    await requestResult(store.put({ key: ACTIVE_GENERATION_KEY, value: generation }));
    await transactionComplete(transaction);
    return generation;
  }

  async readGeneration(): Promise<string | null> {
    const connection = await this.open();
    const transaction = connection.transaction(["appMetadata"], "readonly");
    const existing = await requestResult<AppMetadataRecord | undefined>(
      transaction.objectStore("appMetadata").get(ACTIVE_GENERATION_KEY) as IDBRequest<
        AppMetadataRecord | undefined
      >
    );
    await transactionComplete(transaction);
    return existing && typeof existing.value === "string" ? existing.value : null;
  }

  /**
   * Atomically replaces the whole local state with `tables` and clears runtime stores.
   * Either every durable table and the generation pointer move together, or nothing does.
   */
  async replaceGeneration(
    tables: Record<DurableTable, Record<string, unknown>[]>,
    generation: string
  ): Promise<void> {
    const connection = await this.open();
    const names: string[] = [
      ...DURABLE_TABLES,
      "appMetadata",
      "workflows",
      "aiRuns",
      "sourceObservations"
    ];
    // The generation swap touches durable and runtime stores together; a raw string list is
    // the only way to open one transaction over both.
    const transaction = connection.transaction(names, "readwrite");
    const objectStore = (name: V2StoreName): IDBObjectStore => transaction.objectStore(name);
    try {
      for (const table of DURABLE_TABLES) {
        const store = objectStore(table);
        await requestResult(store.clear());
        for (const record of tables[table]) {
          await requestResult(store.put({ ...record, [GENERATION_FIELD]: generation }));
        }
      }
      for (const table of ["workflows", "aiRuns", "sourceObservations"] as const) {
        await requestResult(objectStore(table).clear());
      }
      await requestResult(
        objectStore("appMetadata").put({ key: ACTIVE_GENERATION_KEY, value: generation })
      );
      await transactionComplete(transaction);
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // Preserve the original failure; an already-aborted transaction is fine.
      }
      throw error;
    }
  }
}
