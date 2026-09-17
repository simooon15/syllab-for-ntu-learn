import type { FetchCheckpoint } from "../fetch/domain";
import type { StorageArea } from "./schema-repository";

export const FETCH_CHECKPOINTS_KEY = "syllab.fetchCheckpoints" as const;

export class FetchRepository {
  constructor(private readonly storage: StorageArea) {}

  async getCheckpoint(scanId: string): Promise<FetchCheckpoint | undefined> {
    const current = await this.storage.get(FETCH_CHECKPOINTS_KEY);
    const records = current[FETCH_CHECKPOINTS_KEY];
    if (typeof records !== "object" || records === null || Array.isArray(records)) return undefined;
    return (records as Record<string, FetchCheckpoint>)[scanId];
  }

  async saveCheckpoint(checkpoint: FetchCheckpoint): Promise<void> {
    const current = await this.storage.get(FETCH_CHECKPOINTS_KEY);
    const records =
      typeof current[FETCH_CHECKPOINTS_KEY] === "object" &&
      current[FETCH_CHECKPOINTS_KEY] !== null &&
      !Array.isArray(current[FETCH_CHECKPOINTS_KEY])
        ? (current[FETCH_CHECKPOINTS_KEY] as Record<string, FetchCheckpoint>)
        : {};
    await this.storage.set({
      [FETCH_CHECKPOINTS_KEY]: { ...records, [checkpoint.scanId]: checkpoint }
    });
  }
}
