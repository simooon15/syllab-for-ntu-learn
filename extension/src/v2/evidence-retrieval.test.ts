import { describe, expect, it } from "vitest";
import {
  EvidenceProgress,
  continueTaskB,
  evidenceCatalog,
  retrieveEvidence
} from "./evidence-retrieval";
import { buildTaskBCalls, assertSuppliedEvidence } from "./ai-pipeline";
import type { SourceRecord } from "./domain";

const source: SourceRecord = {
  sourceId: "original",
  courseId: "course",
  nativeItemId: "native",
  title: "Synthetic table",
  kind: "attachment",
  updatedAt: "2026-10-04",
  parsed: {
    text: "0123456789",
    structure: ["table:2"],
    contentHash: "revision-one",
    units: [{ locator: "table:2", text: "0123456789", partial: false }]
  }
};

describe("Task B on-demand original evidence", () => {
  it("retrieves exact bounded native ranges and rejects stale refs and malformed offsets", () => {
    const refId = evidenceCatalog([source])[0]?.refId ?? "missing";
    const replies = retrieveEvidence(
      [
        { refId, start: 2, length: 4 },
        { refId, start: 99 }
      ],
      [source],
      []
    );
    expect(replies[0]).toMatchObject({
      status: "available",
      start: 2,
      end: 6,
      truncated: true,
      evidence: { sourceId: "original", locator: "table:2", excerpt: "2345" }
    });
    expect(replies[1]?.status).toBe("invalid-range");
    if (!source.parsed) throw new Error("missing parsed source");
    const changed = { ...source, parsed: { ...source.parsed, contentHash: "revision-two" } };
    expect(retrieveEvidence([{ refId }], [changed], [])[0]?.status).toBe("unknown-ref");
  });
  it("keeps the stable prefix and both earlier turns when expanding a second time", () => {
    const base = buildTaskBCalls({ drafts: [], constraintCandidates: [], courseIndex: [] })[0];
    if (!base) throw new Error("missing call");
    const first = continueTaskB(base, { unresolvedIssues: ["need evidence"] }, [], 1);
    const second = continueTaskB(first, { unresolvedIssues: ["need another ref"] }, [], 2);
    expect(second.user).toBe(base.user);
    expect(second.messages?.[0]?.content).toBe(base.user);
    expect(second.messages).toHaveLength(5);
    expect(second.messages?.slice(0, 3)).toEqual(first.messages);
    expect(second.invocationFingerprint).not.toBe(first.invocationFingerprint);
    expect(second.messages?.at(-1)?.content).toContain('"expansionRound":2');
  });
});

it("rejects fabricated B evidence while accepting an exact supplied excerpt", () => {
  const supplied = [
    { evidenceId: "known", sourceId: "original", locator: "table:2", excerpt: "0123456789" }
  ];
  expect(() =>
    assertSuppliedEvidence(
      { evidenceId: "known", sourceId: "original", locator: "table:2", excerpt: "2345" },
      supplied
    )
  ).not.toThrow();
  expect(() =>
    assertSuppliedEvidence(
      { evidenceId: "known", sourceId: "original", locator: "table:99", excerpt: "2345" },
      supplied
    )
  ).toThrow("AI_CONTRACT");
  expect(() => assertSuppliedEvidence({ evidenceRefs: ["invented"] }, supplied)).toThrow(
    "AI_CONTRACT"
  );
});

it("returns every requested ref and the full remaining native text when no range is requested", () => {
  if (!source.parsed) throw new Error("missing parsed fixture");
  const long = {
    ...source,
    parsed: {
      ...source.parsed,
      units: [{ locator: "page:1", text: "z".repeat(6000), partial: false }]
    }
  };
  const refId = evidenceCatalog([long])[0]?.refId ?? "missing";
  const replies = retrieveEvidence(
    Array.from({ length: 12 }, () => ({ refId })),
    [long],
    []
  );
  expect(replies).toHaveLength(12);
  expect(
    replies.every((reply) => reply.evidence?.excerpt.length === 6000 && reply.truncated === false)
  ).toBe(true);
});

it("detects no progress across repeated and differently shaped already-delivered ranges", () => {
  const refId = evidenceCatalog([source])[0]?.refId ?? "missing";
  const progress = new EvidenceProgress();
  const reply = (start: number, length: number) => {
    const result = retrieveEvidence([{ refId, start, length }], [source], [])[0];
    if (!result) throw new Error("missing reply");
    return result;
  };
  expect(progress.accept(reply(0, 4))).toBe(true);
  expect(progress.accept(reply(4, 4))).toBe(true);
  expect(progress.accept(reply(2, 4))).toBe(false);
  expect(progress.accept(reply(8, 2))).toBe(true);
  expect(progress.accept(reply(0, 10))).toBe(false);
});

it("cannot manufacture progress by requesting a returned excerpt through its new ID", () => {
  const refId = evidenceCatalog([source])[0]?.refId ?? "missing";
  const progress = new EvidenceProgress();
  const first = retrieveEvidence([{ refId, start: 2, length: 4 }], [source], [])[0];
  if (!first?.evidence) throw new Error("missing first evidence");
  expect(progress.accept(first)).toBe(true);
  const repeated = retrieveEvidence(
    [{ refId: first.evidence.evidenceId }],
    [source],
    [first.evidence]
  )[0];
  if (!repeated) throw new Error("missing alias reply");
  expect(repeated.evidence?.excerpt).toBe("2345");
  expect(progress.accept(repeated)).toBe(false);
});

it("starts with supplied evidence marked as already delivered", () => {
  const evidence = {
    evidenceId: "existing",
    sourceId: "original",
    locator: "table:2",
    excerpt: "2345"
  };
  const progress = new EvidenceProgress([evidence]);
  const reply = retrieveEvidence([{ refId: "existing" }], [source], [evidence])[0];
  if (!reply) throw new Error("missing supplied evidence reply");
  expect(progress.accept(reply)).toBe(false);
});
