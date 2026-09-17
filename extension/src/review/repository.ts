import {
  CANDIDATES_STORE,
  REVIEW_PROGRESS_STORE,
  openLocalDatabase,
  requestResult,
  transactionComplete
} from "../repository/local-database";
import type { ReviewCandidate, ReviewProgress } from "./domain";

export class IndexedDbReviewRepository {
  async save(
    scanId: string,
    candidates: readonly ReviewCandidate[],
    progress: ReviewProgress
  ): Promise<void> {
    const database = await openLocalDatabase();
    try {
      const transaction = database.transaction(
        [CANDIDATES_STORE, REVIEW_PROGRESS_STORE],
        "readwrite"
      );
      const candidateStore = transaction.objectStore(CANDIDATES_STORE);
      const existing = await requestResult(candidateStore.index("scanId").getAllKeys(scanId));
      for (const key of existing) candidateStore.delete(key);
      for (const candidate of candidates) candidateStore.put(structuredClone(candidate));
      transaction.objectStore(REVIEW_PROGRESS_STORE).put(structuredClone(progress));
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  }

  async load(
    scanId: string
  ): Promise<{ candidates: ReviewCandidate[]; progress: ReviewProgress | null }> {
    const database = await openLocalDatabase();
    try {
      const transaction = database.transaction(
        [CANDIDATES_STORE, REVIEW_PROGRESS_STORE],
        "readonly"
      );
      const [candidates, progress] = await Promise.all([
        requestResult(
          transaction.objectStore(CANDIDATES_STORE).index("scanId").getAll(scanId)
        ) as Promise<ReviewCandidate[]>,
        requestResult(transaction.objectStore(REVIEW_PROGRESS_STORE).get(scanId)) as Promise<
          ReviewProgress | undefined
        >
      ]);
      await transactionComplete(transaction);
      return { candidates, progress: progress ?? null };
    } finally {
      database.close();
    }
  }
}
