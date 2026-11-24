import { describe, it, expect } from "vitest";
import { suppressAccessSecrets, nativeDeliverySource } from "./native-delivery";
import { prepareDirectCourse, validateDirectCourse, DIRECT_COURSE_SCHEMA } from "./direct-course";
import { TASK_B_SCHEMA } from "./ai-contracts";
import type { SourceRecord } from "./schema";
describe("access-secret suppression without semantic filtering", () => {
  it("suppresses synthetic credentials and preserves ordinary instructions", () => {
    const text = "Bring a calculator.\nPassword: SYNTHETIC_ONLY\nYou may submit a PDF.";
    expect(suppressAccessSecrets(text)).toBe(
      "Bring a calculator.\n[REDACTED_ACCESS_SECRET]\nYou may submit a PDF."
    );
    expect(suppressAccessSecrets("No password required; an access code will be provided.")).toBe(
      "No password required; an access code will be provided."
    );
    expect(suppressAccessSecrets("Authorization: Bearer SYNTHETIC_ONLY")).not.toContain(
      "SYNTHETIC_ONLY"
    );
  });
  it("does not mutate Sources or accept an unprovided credential as Evidence", () => {
    const source: SourceRecord = {
      sourceId: "s",
      courseId: "c",
      nativeItemId: "n",
      kind: "assignment",
      title: "Synthetic",
      updatedAt: "now",
      parsed: { text: "Password: SYNTHETIC_ONLY", structure: [] }
    };
    const before = structuredClone(source);
    const input = { course: { courseCode: "TEST", courseName: "Synthetic" }, sources: [source] };
    expect(prepareDirectCourse(input, "id").call.user).not.toContain("SYNTHETIC_ONLY");
    expect(source).toEqual(before);
    expect(nativeDeliverySource(source).parsed?.units?.[0]?.partial).toBe(true);
    const response = {
      schema: DIRECT_COURSE_SCHEMA,
      snapshot: prepareDirectCourse(input, "id").snapshot,
      coverage: [
        {
          sourceId: "s",
          examinedNativeLocators: ["native-text"],
          unresolvedNativeLocators: [],
          limitations: ["Access credentials suppressed"]
        }
      ],
      output: {
        schema: TASK_B_SCHEMA,
        identityResolutions: [],
        canonicalAssessmentProposals: [],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: [
          {
            description: "Synthetic issue",
            evidence: [
              { evidenceId: "e", sourceId: "s", locator: "native-text", excerpt: "SYNTHETIC_ONLY" }
            ]
          }
        ]
      }
    };
    expect(() => validateDirectCourse(response, input)).toThrow("PROVENANCE_LITERAL");
  });
});

it("minimizes opaque access-routing fields without hiding null metadata or mutating originals", () => {
  expect(suppressAccessSecrets("body.fileLocation: SYNTHETIC_ONLY\nQuestion count: 25")).toBe(
    "body.[REDACTED_ACCESS_SECRET]\nQuestion count: 25"
  );
  expect(suppressAccessSecrets("fileLocation: null")).toBe("fileLocation: null");
  const s: SourceRecord = {
    sourceId: "s",
    courseId: "c",
    nativeItemId: "n",
    kind: "file",
    title: "Password: SYNTHETIC_ONLY",
    updatedAt: "now"
  };
  expect(nativeDeliverySource(s).title).toBe("[REDACTED_ACCESS_SECRET]");
  expect(s.title).toContain("SYNTHETIC_ONLY");
});
it("keeps authored body fields available while suppressing a neighbouring signed access URL", () => {
  const text =
    "body.fileLocation: https://files.example/download?token=synthetic-access-secret\nbody.displayText: Submit the report in PDF.\nbody.rawText: <p>Submit the report in PDF.</p>";
  const delivered = suppressAccessSecrets(text);
  expect(delivered).not.toContain("synthetic-access-secret");
  expect(delivered).toContain("body.displayText: Submit the report in PDF.");
  expect(delivered).toContain("body.rawText: <p>Submit the report in PDF.</p>");
});
