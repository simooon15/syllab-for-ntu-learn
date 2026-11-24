/** QA-only private browser evidence. The release build never imports this module. */
export interface PrivateQaStream {
  streamId: string;
  system: string;
  user: string;
  reasoning: string;
  content: string;
  finished: boolean;
  startedAt?: string;
  finishedAt?: string;
  workflowId?: string;
  logicalUnitId?: string;
  stage?: string;
  attemptType?: string;
  model?: string;
  visualParts?: number;
  providerUsage?: unknown;
  finishReason?: string;
  httpStatus?: number;
}
export async function archiveQaStream(
  stream: PrivateQaStream,
  factory: IDBFactory = indexedDB
): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open("syllab.qa.private-streams", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("streams", { keyPath: "streamId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("QA_ARCHIVE_OPEN_FAILED"));
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("streams", "readwrite");
      transaction.objectStore("streams").put(stream);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("QA_ARCHIVE_WRITE_FAILED"));
      transaction.onabort = () => reject(transaction.error ?? new Error("QA_ARCHIVE_WRITE_FAILED"));
    });
  } finally {
    db.close();
  }
}
