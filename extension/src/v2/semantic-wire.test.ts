import { describe, it, expect } from "vitest";
import { catalogInput, expandEvidenceRefs } from "./semantic-wire";
import { validateProvenance } from "./architecture-provenance";
import { runSession, sessionPrompt } from "./architecture-runner";
import {
  newSession,
  digest,
  beginRound,
  SESSION_SCHEMA,
  type Session
} from "./architecture-session";
const e = {
  evidenceId: "e",
  sourceId: "s",
  locator: "native-text",
  excerpt: "Synthetic exact quote"
};
describe("negotiated evidence dictionary /4", () => {
  it("deduplicates quoted bytes but preserves canonical source/locator/content", () => {
    const { input, catalog } = catalogInput({ first: [e], second: [e] });
    expect(Object.keys(catalog)).toHaveLength(1);
    const v = expandEvidenceRefs(input, catalog) as { first: unknown[]; second: unknown[] };
    expect(v.first).toEqual(v.second);
    expect(v.first[0]).toMatchObject({
      sourceId: e.sourceId,
      locator: e.locator,
      excerpt: e.excerpt
    });
  });
  it.each([{ evidenceRef: "missing" }, { evidenceRef: "missing", excerpt: "invented" }])(
    "refuses unknown or decorated references %j",
    (v) => expect(() => expandEvidenceRefs(v, {})).toThrow("UNKNOWN_REF")
  );
  it("does not normalize full provider Evidence or text", () =>
    expect(expandEvidenceRefs(e, {})).toEqual(e));
  it("quoted shape still must pass native provenance after dereferencing", () => {
    const { catalog } = catalogInput({ evidence: [e] });
    const v = expandEvidenceRefs({ evidenceRef: Object.keys(catalog)[0] }, catalog);
    expect(() => validateProvenance(v, { sources: [], evidence: [], objects: {} })).toThrow();
  });
  it("retains raw response on capture and returns only mechanically decoded canonical output", async () => {
    let saved: Session | undefined;
    const result = await runSession(
      "test",
      "C",
      { evidence: [e] },
      {
        semanticPolicy: "assessment-relevance/4",
        load: () => Promise.resolve(undefined),
        save: (s) => {
          saved = structuredClone(s);
          return Promise.resolve();
        },
        resolve: () => Promise.resolve([]),
        validateFinal: () => {},
        execute: (call) => {
          expect(call.promptVersion).toBe("c-session/8");
          const req = JSON.parse(call.user) as {
            roundId: string;
            segmentId: string;
            delivery: string;
          };
          const input = JSON.parse(req.delivery) as { evidenceCatalog: Record<string, unknown> };
          return Promise.resolve({
            call,
            consumesApi: true,
            value: {
              schema: "syllab.ai/session/1",
              roundId: req.roundId,
              segmentId: req.segmentId,
              kind: "ROUND_COMPLETE_FINAL",
              carry: {},
              output: {
                schema: "syllab.ai.task-c/1",
                evidence: [{ evidenceRef: Object.keys(input.evidenceCatalog)[0] }]
              }
            }
          });
        }
      }
    );
    expect(result).toMatchObject({ evidence: [{ excerpt: e.excerpt }] });
    expect(JSON.stringify(saved?.requests[0]?.response)).toContain('"evidenceRef"');
    expect(JSON.stringify(saved?.requests[0]?.response)).not.toContain(e.excerpt);
  });
  it("replays captured /4 raw references without a new physical dispatch", async () => {
    const input = { evidence: [e] },
      wire = catalogInput(input);
    const encoded = { ...(wire.input as object), semanticPhase: "standard" };
    const saved = {
      ...newSession("resume4", "C", digest(encoded)),
      promptFingerprint: digest(sessionPrompt("C", "assessment-relevance/4")),
      semanticPolicy: "assessment-relevance/4" as const
    };
    const round = beginRound(saved, encoded, "INITIAL");
    const raw = {
      schema: SESSION_SCHEMA,
      roundId: round.id,
      segmentId: round.segments[0]?.id,
      kind: "ROUND_COMPLETE_FINAL",
      carry: {},
      output: {
        schema: "syllab.ai.task-c/1",
        evidence: [{ evidenceRef: Object.keys(wire.catalog)[0] }]
      }
    };
    saved.requests.push({
      id: "captured",
      roundId: round.id,
      segmentId: round.segments[0]?.id ?? "",
      request: "{}",
      state: "captured",
      response: raw
    });
    let stored: Session | undefined;
    const result = await runSession("resume4", "C", input, {
      semanticPolicy: "assessment-relevance/4",
      load: () => Promise.resolve(saved),
      save: (s) => {
        stored = structuredClone(s);
        return Promise.resolve();
      },
      resolve: () => Promise.resolve([]),
      execute: () => Promise.reject(Error("NO_DISPATCH")),
      validateFinal: () => {}
    });
    expect(result).toMatchObject({ evidence: [{ excerpt: e.excerpt }] });
    expect(stored?.requests[0]?.response).toEqual(raw);
  });
  it("decodes dictionary references after final JSON byte-segment assembly", async () => {
    let n = 0;
    const input = { evidence: [e] },
      wire = catalogInput(input);
    const output = JSON.stringify({
      schema: "syllab.ai.task-c/1",
      evidence: [{ evidenceRef: Object.keys(wire.catalog)[0] }]
    });
    const half = Math.floor(output.length / 2);
    const result = await runSession("segments4", "C", input, {
      semanticPolicy: "assessment-relevance/4",
      load: () => Promise.resolve(undefined),
      save: () => Promise.resolve(),
      resolve: () => Promise.resolve([]),
      validateFinal: () => {},
      execute: (call) => {
        const d = JSON.parse(call.user) as { roundId: string; segmentId: string };
        const first = n++ === 0;
        return Promise.resolve({
          call,
          consumesApi: false,
          value: {
            schema: SESSION_SCHEMA,
            roundId: d.roundId,
            segmentId: d.segmentId,
            kind: first ? "ROUND_OUTPUT_SEGMENT" : "ROUND_COMPLETE_FINAL",
            carry: {},
            output: first ? output.slice(0, half) : output.slice(half)
          }
        });
      }
    });
    expect(n).toBe(2);
    expect(result).toMatchObject({ evidence: [{ excerpt: e.excerpt }] });
  });
  it("refuses cached version4 results after the semantic prompt changes", async () => {
    const saved: Session = {
      ...newSession(
        "prompt-drift",
        "C",
        digest({ evidenceCatalog: {}, semanticPhase: "standard" })
      ),
      semanticPolicy: "assessment-relevance/4",
      promptFingerprint: "earlier-actual-system",
      state: "final",
      output: {}
    };
    await expect(
      runSession(
        "prompt-drift",
        "C",
        {},
        {
          semanticPolicy: "assessment-relevance/4",
          load: () => Promise.resolve(saved),
          save: () => Promise.resolve(),
          resolve: () => Promise.resolve([]),
          execute: () => Promise.reject(Error("NO_DISPATCH")),
          validateFinal: () => {}
        }
      )
    ).rejects.toThrow("SESSION_PROMPT");
  });
  it("policy3 saved outputs cannot be upgraded in place", async () => {
    const saved = {
      ...newSession("old", "B1", "anything"),
      semanticPolicy: "assessment-relevance/3" as const
    };
    await expect(
      runSession(
        "old",
        "B1",
        {},
        {
          semanticPolicy: "assessment-relevance/4",
          load: () => Promise.resolve(saved),
          save: async () => {},
          resolve: () => Promise.resolve([]),
          execute: () => Promise.reject(Error("No dispatch")),
          validateFinal: () => {}
        }
      )
    ).rejects.toThrow("SESSION_POLICY");
  });
});
