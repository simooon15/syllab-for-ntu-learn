import { describe, expect, it } from "vitest";

import {
  createBackup,
  DURABLE_TABLES,
  durableRow,
  validateBackup,
  type DurableTable
} from "./backup";
import { DURABLE_TABLES as STORE_DURABLE_TABLES, RUNTIME_TABLES } from "./schema";

function tables(): Record<DurableTable, unknown[]> {
  return Object.fromEntries(DURABLE_TABLES.map((table) => [table, []])) as unknown as Record<
    DurableTable,
    unknown[]
  >;
}

describe("Backup / Restore contract", () => {
  it("round-trips durable state without API key or runtime tables", async () => {
    const state = tables();
    state.courses.push({ courseId: "course-1", courseCode: "MA6001" });
    state.assessments.push({ assessmentId: "assessment-1", courseId: "course-1" });
    const backup = await createBackup(state, "2026-09-19T00:00:00.000Z");
    const restored = await validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(restored.payload).toEqual(state);
    expect(JSON.stringify(backup)).not.toContain("deepseekApiKey");
    expect(backup.payload).not.toHaveProperty("workflows");
  });

  it("rejects a modified payload before restore", async () => {
    const backup = await createBackup(tables(), "2026-09-19T00:00:00.000Z");
    backup.payload.courses.push({ courseId: "tampered" });
    backup.counts.courses = 1;
    await expect(validateBackup(backup)).rejects.toThrow("BACKUP_DIGEST_MISMATCH");
  });

  it("covers exactly the tables the store treats as durable", () => {
    expect([...DURABLE_TABLES].sort()).toEqual([...STORE_DURABLE_TABLES].sort());
    for (const table of RUNTIME_TABLES) {
      expect(DURABLE_TABLES).not.toContain(table);
    }
    // Unresolved review decisions are user state and must survive a backup.
    expect(DURABLE_TABLES).toContain("reviewItems");
  });

  it("never carries source-derived cached bytes", async () => {
    const state = tables();
    state.sources.push({
      sourceId: "content:item-1",
      courseId: "course-1",
      title: "Project brief",
      parsed: { text: "cached source bytes", structure: ["body"] }
    });
    state.sources.push({ sourceId: "content:item-2", courseId: "course-1", title: "Slides" });
    const backup = await createBackup(state, "2026-09-19T00:00:00.000Z");
    expect(backup.payload.sources).toEqual([
      { sourceId: "content:item-1", courseId: "course-1", title: "Project brief" },
      { sourceId: "content:item-2", courseId: "course-1", title: "Slides" }
    ]);
    expect(JSON.stringify(backup)).not.toContain("cached source bytes");
    expect(durableRow("sources", { sourceId: "content:item-1", parsed: { text: "x" } })).toEqual({
      sourceId: "content:item-1"
    });
  });
});
