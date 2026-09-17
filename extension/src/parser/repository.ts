import type { SourceKind } from "@syllab/contracts";

import {
  PARSED_SOURCES_STORE,
  openLocalDatabase,
  requestResult,
  transactionComplete
} from "../repository/local-database";
import type { ParseResult } from "./domain";

export interface ParsedSourceRecord {
  recordId: string;
  scanId: string;
  courseId: string;
  sourceId: string;
  sourceType: SourceKind;
  title: string;
  path: string[];
  result: ParseResult;
}

export class IndexedDbParsedSourceRepository {
  async put(record: ParsedSourceRecord): Promise<void> {
    const database = await openLocalDatabase();
    try {
      const transaction = database.transaction(PARSED_SOURCES_STORE, "readwrite");
      transaction.objectStore(PARSED_SOURCES_STORE).put(structuredClone(record));
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  }

  async list(scanId: string): Promise<ParsedSourceRecord[]> {
    const database = await openLocalDatabase();
    try {
      const transaction = database.transaction(PARSED_SOURCES_STORE, "readonly");
      const records = (await requestResult(
        transaction.objectStore(PARSED_SOURCES_STORE).index("scanId").getAll(scanId)
      )) as ParsedSourceRecord[];
      await transactionComplete(transaction);
      return records;
    } finally {
      database.close();
    }
  }
}
