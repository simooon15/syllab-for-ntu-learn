// Offline deterministic identity repair probe. Saved paid responses are read, never re-dispatched.
import { build } from "esbuild";
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
const path = "evidence/private/v030-gate-b-027/";
let d = JSON.parse(await readFile(path + "B2-FINAL-REVIEW.json"));
let baseline = JSON.parse(await readFile(path + "BEFORE.json"));
const workflowIds = new Set(["wf_ebdef177ba1a33bbc520b577", "wf_26455133f0631385cbf5b56c"]);
d.tables.aiRuns = d.tables.aiRuns
  .filter((r) => workflowIds.has(r.workflowId) && r.taskAPackage)
  .map((r) => ({ workflowId: r.workflowId, taskAPackage: r.taskAPackage }));
d.tables.sources = d.tables.sources.map((s) => ({
  sourceId: s.sourceId,
  courseId: s.courseId,
  parsed: s.parsed
    ? {
        units: s.parsed.units,
        text: s.parsed.text,
        contentHash: s.parsed.contentHash,
        visualEvidenceLocators: s.parsed.visualEvidenceLocators
      }
    : undefined,
  machine: { contentHash: s.machine?.contentHash }
}));
d.staging = Object.fromEntries(
  Object.entries(d.staging).filter(([_k, s]) => workflowIds.has(s.workflowId))
);
d.tables = Object.fromEntries(
  Object.entries(d.tables).filter(([key]) =>
    ["aiRuns", "sources", "facts", "evidence", "reviewItems"].includes(key)
  )
);
d = { tables: d.tables, staging: d.staging };
baseline.tables = { evidence: baseline.tables.evidence };
baseline = { tables: baseline.tables };
await build({
  stdin: {
    contents: `export{evidenceStorageId}from'./extension/src/v2/materialize';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  format: "iife",
  globalName: "Identity",
  outfile: ".tmp/v030-027-identity.js"
});
const server = createServer((q, r) => r.end("<title>Offline identity recovery</title>"));
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const p = await browser.newPage();
  await p.goto(`http://127.0.0.1:${server.address().port}`);
  await p.addScriptTag({ path: ".tmp/v030-027-identity.js" });
  const plan = await p.evaluate(
    ({ d, baseline }) => {
      const { evidenceStorageId } = globalThis.Identity;
      const key = (e) => JSON.stringify([e.evidenceId, e.sourceId, e.locator]);
      function scope(wid, cid, facts, records) {
        const raw = new Map();
        function visit(x) {
          if (!x || typeof x !== "object") return;
          if (
            !Array.isArray(x) &&
            ["evidenceId", "sourceId", "locator", "excerpt"].every((k) => typeof x[k] === "string")
          ) {
            let m = raw.get(key(x)) ?? new Map();
            m.set(x.excerpt, x);
            raw.set(key(x), m);
          }
          for (const y of Object.values(x)) visit(y);
        }
        for (const r of d.tables.aiRuns.filter((r) => r.workflowId === wid && r.taskAPackage))
          visit(r.taskAPackage.result);
        const out = records.map((e) => ({ ...e, evidenceId: evidenceStorageId(cid, e) })),
          lookup = new Map(records.map((e, i) => [key(e), out[i]]));
        let reconstructed = 0;
        function mapped(ref, now) {
          const k = key(ref);
          let record = lookup.get(k);
          const values = raw.get(k);
          if (!values || values.size !== 1) throw Error("NON_UNIQUE_PAID_REFERENCE");
          const original = [...values.values()][0];
          if (record) {
            if (record.excerpt !== original.excerpt) throw Error("PAID_QUOTE_MISMATCH");
            return record.evidenceId;
          }
          const source = d.tables.sources.find(
            (s) => s.sourceId === ref.sourceId && s.courseId === cid
          );
          if (!source) throw Error("SOURCE_ABSENT");
          const text =
            source.parsed?.units?.find((u) => u.locator === original.locator)?.text ??
            source.parsed?.text;
          const origin = text?.includes(original.excerpt)
            ? "native"
            : source.parsed?.visualEvidenceLocators?.includes(original.locator)
              ? "visual"
              : "unverified";
          const representationHash = source.parsed?.contentHash ?? source.machine?.contentHash;
          record = {
            evidenceId: original.evidenceId,
            courseId: cid,
            sourceId: original.sourceId,
            locator: original.locator,
            excerpt: original.excerpt,
            ...(typeof original.page === "number" ? { page: original.page } : {}),
            ...(original.region ? { region: original.region } : {}),
            origin,
            ...(representationHash ? { representationHash } : {}),
            capturedAt: now,
            ...(records[0]?.restoreGeneration
              ? { restoreGeneration: records[0].restoreGeneration }
              : {})
          };
          record.evidenceId = evidenceStorageId(cid, record);
          out.push(record);
          lookup.set(k, record);
          reconstructed++;
          return record.evidenceId;
        }
        const newFacts = facts.map((f) => ({
          ...f,
          evidenceRefs: (f.evidenceRefs ?? []).map((r) => ({
            ...r,
            evidenceId: mapped(r, f.updatedAt)
          }))
        }));
        const index = new Map(out.map((e) => [e.evidenceId, e]));
        const refs = newFacts.flatMap((f) => f.evidenceRefs ?? []);
        if (
          refs.some(
            (r) =>
              index.get(r.evidenceId)?.sourceId !== r.sourceId ||
              index.get(r.evidenceId)?.locator !== r.locator
          )
        )
          throw Error("REFERENCE_MISMATCH");
        return {
          referenceMap: Object.fromEntries(
            [...lookup].map(([refKey, e]) => [refKey, e.evidenceId])
          ),
          facts: newFacts,
          evidence: out,
          reconstructed,
          refs: refs.length,
          originalRecordsPreserved: records.every(
            (e, i) =>
              JSON.stringify({ ...e, evidenceId: out[i].evidenceId }) === JSON.stringify(out[i])
          ),
          valuesUnchanged: facts.every(
            (f, i) =>
              JSON.stringify({ ...f, evidenceRefs: newFacts[i].evidenceRefs }) ===
              JSON.stringify(newFacts[i])
          )
        };
      }
      const b2wid = "wf_ebdef177ba1a33bbc520b577",
        b1wid = "wf_26455133f0631385cbf5b56c",
        b2cid = "_2707110_1",
        b1cid = "_2707107_1";
      const b2 = scope(
        b2wid,
        b2cid,
        d.tables.facts.filter((f) => f.courseId === b2cid),
        d.tables.evidence.filter((e) => e.courseId === b2cid)
      );
      const stageEntries = Object.entries(d.staging);
      const b1entry = stageEntries.find(([_k, s]) => s.workflowId === b1wid),
        b2entry = stageEntries.find(([_k, s]) => s.workflowId === b2wid);
      const b1 = scope(b1wid, b1cid, b1entry[1].facts, b1entry[1].evidence);
      const restored = baseline.tables.evidence.filter(
        (e) =>
          e.courseId === b1cid &&
          d.tables.evidence.find((x) => x.evidenceId === e.evidenceId)?.courseId !== b1cid
      );
      const remap = (x, aliases) => {
        if (!x || typeof x !== "object") return x;
        if (Array.isArray(x)) return x.map((y) => remap(y, aliases));
        const result = Object.fromEntries(
          Object.entries(x).map(([k, v]) => [k, remap(v, aliases)])
        );
        if (
          typeof x.evidenceId === "string" &&
          typeof x.sourceId === "string" &&
          typeof x.locator === "string"
        ) {
          const id = aliases[key(x)];
          if (!id) throw Error("REVIEW_REFERENCE_ABSENT");
          result.evidenceId = id;
        }
        return result;
      };
      const nativeReviewItems = d.tables.reviewItems
        .filter((r) => r.courseId === b2cid)
        .map((r) => remap(r, b2.referenceMap));
      const stages = {
        [b1entry[0]]: {
          ...b1entry[1],
          facts: b1.facts,
          evidence: b1.evidence,
          reviewItems: b1entry[1].reviewItems.map((r) => remap(r, b1.referenceMap))
        },
        [b2entry[0]]: {
          ...b2entry[1],
          reviewItems: b2entry[1].reviewItems.map((r) => remap(r, b2.referenceMap)),
          facts: b2.facts.map(({ restoreGeneration, ...f }) => f),
          evidence: b2.evidence.map(({ restoreGeneration, ...e }) => e)
        }
      };
      return {
        b1,
        b2,
        nativeReviewItems,
        restoreKnown: restored,
        removeB2EvidenceIds: d.tables.evidence
          .filter((e) => e.courseId === b2cid)
          .map((e) => e.evidenceId),
        stages,
        stageBefore: Object.fromEntries([b1entry, b2entry]),
        expectedNative: {
          evidence: d.tables.evidence,
          facts: d.tables.facts,
          reviewItems: d.tables.reviewItems
        },
        baselineKnownEvidence: baseline.tables.evidence.filter((e) => e.courseId === b1cid)
      };
    },
    { d, baseline }
  );
  const isolated = await p.evaluate(
    async ({ d, plan }) => {
      const db = await new Promise((r, j) => {
        const q = indexedDB.open("identity-probe", 1);
        q.onupgradeneeded = () => {
          for (const n of ["evidence", "facts", "reviewItems"])
            q.result.createObjectStore(n, {
              keyPath: n === "evidence" ? "evidenceId" : n === "facts" ? "factId" : "reviewItemId"
            });
        };
        q.onsuccess = () => r(q.result);
        q.onerror = () => j(q.error);
      });
      const apply = async (action) => {
        const t = db.transaction(["evidence", "facts", "reviewItems"], "readwrite");
        action(t);
        await new Promise((r, j) => {
          t.oncomplete = r;
          t.onerror = () => j(t.error);
          t.onabort = () => j(t.error);
        });
      };
      await apply((t) => {
        for (const n of ["evidence", "facts", "reviewItems"])
          for (const row of d.tables[n]) t.objectStore(n).put(row);
      });
      await apply((t) => {
        for (const id of plan.removeB2EvidenceIds) t.objectStore("evidence").delete(id);
        for (const row of [...plan.restoreKnown, ...plan.b2.evidence])
          t.objectStore("evidence").put(row);
        for (const row of plan.b2.facts) t.objectStore("facts").put(row);
        for (const row of plan.nativeReviewItems) t.objectStore("reviewItems").put(row);
      });
      const rows = await new Promise((r) => {
        const q = db.transaction("evidence").objectStore("evidence").getAll();
        q.onsuccess = () => r(q.result);
      });
      const old = rows.filter((e) => e.courseId === "_2707107_1");
      const proof = {
        restoredKnownRecords: plan.restoreKnown.length,
        knownEvidenceRestored: JSON.stringify(old) === JSON.stringify(plan.baselineKnownEvidence),
        B1: {
          references: plan.b1.refs,
          reconstructedRecords: plan.b1.reconstructed,
          finalEvidence: plan.b1.evidence.length,
          originalRecordsPreserved: plan.b1.originalRecordsPreserved,
          valuesUnchanged: plan.b1.valuesUnchanged
        },
        B2: {
          references: plan.b2.refs,
          reconstructedRecords: plan.b2.reconstructed,
          finalEvidence: plan.b2.evidence.length,
          originalRecordsPreserved: plan.b2.originalRecordsPreserved,
          valuesUnchanged: plan.b2.valuesUnchanged
        },
        sourceLocatorMismatchesAfter: 0,
        models: 0
      };
      db.close();
      return proof;
    },
    { d, plan }
  );
  if (
    !isolated.knownEvidenceRestored ||
    !isolated.B1.valuesUnchanged ||
    !isolated.B2.valuesUnchanged ||
    !isolated.B1.originalRecordsPreserved ||
    !isolated.B2.originalRecordsPreserved
  )
    throw Error("ISOLATED_REPAIR_FAILED");
  const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
  plan.expectedHashes = {
    evidence: hash(plan.expectedNative.evidence),
    facts: hash(plan.expectedNative.facts),
    reviewItems: hash(plan.expectedNative.reviewItems),
    stages: Object.fromEntries(Object.entries(plan.stageBefore).map(([k, v]) => [k, hash(v)]))
  };
  await writeFile(path + "PROVENANCE-REPAIR-PLAN.json", JSON.stringify(plan));
  await writeFile(
    "artifacts/v0.3.0/gate-b-027/PROVENANCE-REPAIR-REGRESSION.json",
    JSON.stringify(isolated, null, 2) + "\n"
  );
  console.log(isolated);
} finally {
  await browser.close();
  server.close();
}
