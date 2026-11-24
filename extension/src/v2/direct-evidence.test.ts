import { describe, it, expect } from "vitest";
import {
  directBodyReadScope,
  directEvidenceCatalog,
  resolveDirectEvidence
} from "./direct-evidence";
import type { SourceRecord } from "./schema";
const source: SourceRecord = {
  sourceId: "s",
  courseId: "c",
  nativeItemId: "n",
  kind: "attachment",
  title: "Synthetic",
  updatedAt: "now",
  parsed: {
    text: "",
    structure: [],
    units: [
      {
        locator: "page:1",
        text: "Submit <strong>PDF</strong>.\n\nPassword: SYNTHETIC_ONLY\nYou may keep a copy.",
        partial: false
      }
    ]
  }
};
describe("native reference evidence wire", () => {
  it("conserves delivered text and resolves chosen original HTML exactly without semantic repair", () => {
    const before = structuredClone(source);
    const c = directEvidenceCatalog([source]);
    expect(c.delivered[0]?.index.sourceRef).toBe("s1");
    expect(c.delivered[0]?.nativeContent[0]?.passages.map((p) => p.text).join("\n")).toBe(
      "Submit <strong>PDF</strong>.\n\n[REDACTED_ACCESS_SECRET]\nYou may keep a copy."
    );
    expect(resolveDirectEvidence({ evidence: [{ refId: "n1.1.1" }] }, [source])).toEqual({
      evidence: [
        {
          evidenceId: "direct:n1.1.1",
          sourceId: "s",
          locator: "page:1",
          excerpt: "Submit <strong>PDF</strong>.\n"
        }
      ]
    });
    expect(source).toEqual(before);
  });
  it("rejects unknown, masked, fabricated and mixed literal references", () => {
    for (const refId of ["n1.1.2", "n1.1.999", "s"])
      expect(() => resolveDirectEvidence({ refId }, [source])).toThrow("DIRECT_REF_UNKNOWN");
    expect(() => resolveDirectEvidence({ refId: "n1.1.1", excerpt: "Invented" }, [source])).toThrow(
      "DIRECT_REF_SHAPE"
    );
  });
  it("keeps identical locators on different Sources distinct", () => {
    const sibling = { ...source, sourceId: "other" };
    const c = directEvidenceCatalog([source, sibling]);
    expect(c.references.get("n1.1.1")?.sourceId).toBe("s");
    expect(c.references.get("n2.1.1")?.sourceId).toBe("other");
  });
});

it("counts literal delivered body fields independently from masked access URL fields", () => {
  const body = structuredClone(source);
  if (!body.parsed) throw Error("fixture");
  body.parsed.units = [
    {
      locator: "body",
      partial: false,
      text: "body.fileLocation: https://example.com/a?token=synthetic\nbody.displayText: Submit PDF.\nbody.rawText: <p>Submit PDF.</p>"
    }
  ];
  expect(directBodyReadScope([body])).toEqual([
    { sourceRef: "s1", suppliedBodyFieldLines: 2, maskedBodyFieldLines: 0 }
  ]);
});
