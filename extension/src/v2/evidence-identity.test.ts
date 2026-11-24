import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { evidenceStorageId } from "./materialize";
import { LocalDatabase } from "./storage";
const quote = { evidenceId: "e1", sourceId: "s", locator: "page:1", excerpt: "Synthetic quote" };
describe("persistent evidence identity", () => {
  it("scopes reused model IDs by course, Source and exact provenance, with idempotent B reuse", () => {
    const id = evidenceStorageId("a", quote);
    expect(evidenceStorageId("b", quote)).not.toBe(id);
    expect(evidenceStorageId("a", { ...quote, sourceId: "other" })).not.toBe(id);
    expect(evidenceStorageId("a", { ...quote, excerpt: "Different synthetic quote" })).not.toBe(id);
    expect(evidenceStorageId("a", { ...quote, evidenceId: id })).toBe(id);
  });
  it("aborts the whole transaction before overwriting another course or changed evidence", async () => {
    const db = new LocalDatabase(indexedDB, "evidence-identity-regression");
    const original = { ...quote, courseId: "a", capturedAt: "2026-10-06T00:00:00Z" };
    await db.write(["evidence"], async (tx) => {
      await tx.put("evidence", original);
    });
    await expect(
      db.write(["evidence"], async (tx) => {
        await tx.put("evidence", { ...original, evidenceId: "new" });
        await tx.put("evidence", { ...original, courseId: "b" });
      })
    ).rejects.toThrow("CROSS_COURSE_IDENTITY_COLLISION");
    await expect(
      db.write(["evidence"], async (tx) => {
        await tx.put("evidence", { ...original, excerpt: "Different" });
      })
    ).rejects.toThrow("EVIDENCE_IDENTITY_COLLISION");
    const rows = await db.read(["evidence"], async (tx) => tx.getAll("evidence"));
    expect(rows).toEqual([original]);
  });
});
