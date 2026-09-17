import {
  BRIEF_ITEMS_STORE,
  openLocalDatabase,
  requestResult,
  transactionComplete
} from "../repository/local-database";
import type { BriefItem } from "./domain";

export class IndexedDbBriefRepository {
  async listAllItems(): Promise<BriefItem[]> {
    const database = await openLocalDatabase();
    try {
      const transaction = database.transaction(BRIEF_ITEMS_STORE, "readonly");
      const items = (await requestResult(
        transaction.objectStore(BRIEF_ITEMS_STORE).getAll()
      )) as BriefItem[];
      await transactionComplete(transaction);
      return items;
    } finally {
      database.close();
    }
  }

  async upsertCourseItems(items: readonly BriefItem[]): Promise<void> {
    if (items.length === 0) return;
    const database = await openLocalDatabase();
    try {
      const transaction = database.transaction(BRIEF_ITEMS_STORE, "readwrite");
      const store = transaction.objectStore(BRIEF_ITEMS_STORE);
      for (const item of items) store.put(structuredClone(item));
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  }

  async replaceCourseItems(courseId: string, items: readonly BriefItem[]): Promise<void> {
    const database = await openLocalDatabase();
    try {
      const transaction = database.transaction(BRIEF_ITEMS_STORE, "readwrite");
      const store = transaction.objectStore(BRIEF_ITEMS_STORE);
      const existing = await requestResult(store.index("courseId").getAllKeys(courseId));
      for (const key of existing) store.delete(key);
      for (const item of items) store.put(structuredClone(item));
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  }

  async listCourseItems(courseId: string): Promise<BriefItem[]> {
    const database = await openLocalDatabase();
    try {
      const transaction = database.transaction(BRIEF_ITEMS_STORE, "readonly");
      const items = (await requestResult(
        transaction.objectStore(BRIEF_ITEMS_STORE).index("courseId").getAll(courseId)
      )) as BriefItem[];
      await transactionComplete(transaction);
      return items;
    } finally {
      database.close();
    }
  }
}
