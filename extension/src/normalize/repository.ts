import {
  NORMALIZED_UNITS_STORE,
  openLocalDatabase,
  requestResult,
  transactionComplete
} from "../repository/local-database";
import type { NormalizedUnit } from "./domain";

export class IndexedDbNormalizedUnitRepository {
  async replace(scanId: string, units: readonly NormalizedUnit[]): Promise<void> {
    const database = await openLocalDatabase();
    try {
      const transaction = database.transaction(NORMALIZED_UNITS_STORE, "readwrite");
      const store = transaction.objectStore(NORMALIZED_UNITS_STORE);
      const existing = await requestResult(store.index("scanId").getAllKeys(scanId));
      for (const key of existing) store.delete(key);
      for (const unit of units) store.put(structuredClone(unit));
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  }

  async list(scanId: string): Promise<NormalizedUnit[]> {
    const database = await openLocalDatabase();
    try {
      const transaction = database.transaction(NORMALIZED_UNITS_STORE, "readonly");
      const units = (await requestResult(
        transaction.objectStore(NORMALIZED_UNITS_STORE).index("scanId").getAll(scanId)
      )) as NormalizedUnit[];
      await transactionComplete(transaction);
      return units;
    } finally {
      database.close();
    }
  }
}
