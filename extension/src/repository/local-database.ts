export const CANDIDATES_STORE = "candidates";
export const REVIEW_PROGRESS_STORE = "reviewProgress";
export const BRIEF_ITEMS_STORE = "briefItems";
export const PARSED_SOURCES_STORE = "parsedSources";
export const NORMALIZED_UNITS_STORE = "normalizedUnits";

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("INDEXED_DB_ERROR")),
      {
        once: true
      }
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

export async function openLocalDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open("syllab-local", 4);
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(CANDIDATES_STORE)) {
      const candidates = database.createObjectStore(CANDIDATES_STORE, { keyPath: "candidateId" });
      candidates.createIndex("scanId", "scanId", { unique: false });
    }
    if (!database.objectStoreNames.contains(REVIEW_PROGRESS_STORE)) {
      database.createObjectStore(REVIEW_PROGRESS_STORE, { keyPath: "scanId" });
    }
    if (!database.objectStoreNames.contains(BRIEF_ITEMS_STORE)) {
      const briefs = database.createObjectStore(BRIEF_ITEMS_STORE, { keyPath: "briefItemId" });
      briefs.createIndex("courseId", "courseId", { unique: false });
    }
    if (!database.objectStoreNames.contains(PARSED_SOURCES_STORE)) {
      const parsed = database.createObjectStore(PARSED_SOURCES_STORE, { keyPath: "recordId" });
      parsed.createIndex("scanId", "scanId", { unique: false });
    }
    if (!database.objectStoreNames.contains(NORMALIZED_UNITS_STORE)) {
      const normalized = database.createObjectStore(NORMALIZED_UNITS_STORE, { keyPath: "unitId" });
      normalized.createIndex("scanId", "scanId", { unique: false });
    }
  });
  return requestResult(request);
}
