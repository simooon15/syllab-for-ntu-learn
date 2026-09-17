import { describe, expect, it } from "vitest";

import { EXTRACTION_PROMPT_VERSION, EXTRACTION_SYSTEM_PROMPT } from "./extraction-system-prompt";

describe("extraction system prompt", () => {
  it("pins the MVP scope and strict output contract", () => {
    expect(EXTRACTION_PROMPT_VERSION).toBe("mvp-v4");
    expect(EXTRACTION_SYSTEM_PROMPT).toContain('"candidates":[]');
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("ONE source only");
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("Lecture knowledge exclusion");
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("Parent Assessment versus components");
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("Never infer a calendar date");
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("authorization data");
    expect(EXTRACTION_SYSTEM_PROMPT).toContain('"appliesToAssessmentKey"');
    expect(EXTRACTION_SYSTEM_PROMPT).toContain('"scope":"assessment"');
    expect(EXTRACTION_SYSTEM_PROMPT).toContain('never emit "scope":"course"');
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("D-015 Grade-Impact gate");
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("generic academic-integrity policy links");
    expect(EXTRACTION_SYSTEM_PROMPT).toContain(
      "Do not infer a distant disciplinary-process consequence"
    );
  });
});
