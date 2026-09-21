import { describe, expect, it } from "vitest";

import { compareMachineRepresentations, sourceMachineRepresentation } from "./fingerprint";

describe("source fingerprints", () => {
  it("ignores mechanical whitespace without hiding semantic content changes", async () => {
    const first = await sourceMachineRepresentation({
      sourceId: "source-1",
      title: "Course  Guide",
      sourceType: "pdf",
      text: "Deadline\n18 Oct",
      structure: ["p.1", "p.2"]
    });
    const whitespaceOnly = await sourceMachineRepresentation({
      sourceId: "source-1",
      title: "Course Guide",
      sourceType: "pdf",
      text: "Deadline 18 Oct",
      structure: ["p.1", "p.2"]
    });
    const changed = await sourceMachineRepresentation({
      sourceId: "source-1",
      title: "Course Guide",
      sourceType: "pdf",
      text: "Deadline 25 Oct",
      structure: ["p.1", "p.2"]
    });

    expect(compareMachineRepresentations(first, whitespaceOnly, true)).toBe("unchanged");
    expect(compareMachineRepresentations(first, changed, true)).toBe("machine-different");
  });

  it("does not treat a failed check as removal coverage", async () => {
    const previous = await sourceMachineRepresentation({
      sourceId: "source-1",
      title: "Course Guide",
      sourceType: "pdf",
      text: "Final exam",
      structure: ["p.1"]
    });
    expect(compareMachineRepresentations(previous, undefined, false)).toBe("incomparable");
    expect(compareMachineRepresentations(previous, undefined, true)).toBe(
      "missing-after-successful-coverage"
    );
  });
});
