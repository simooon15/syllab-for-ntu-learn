import { describe, expect, it } from "vitest";

import { describeScanError, scanErrorFrom } from "./scan-errors";

const interruptedCopy =
  "This scan was interrupted while it was running. Open the scan again and use Continue scan to resume from the saved checkpoint.";

describe("scan error copy", () => {
  it("turns the raw interruption code into an actionable sentence", () => {
    expect(describeScanError("SCAN_INTERRUPTED")).toBe(interruptedCopy);
  });

  it("passes through a message it has no copy for", () => {
    expect(describeScanError("Failed to fetch")).toBe("Failed to fetch");
  });

  it("passes through an ordinary label unchanged", () => {
    expect(describeScanError("Source fetch could not start")).toBe("Source fetch could not start");
  });

  it("reads the code out of a background failure response", () => {
    expect(scanErrorFrom({ error: "SCAN_INTERRUPTED" }, "Extraction failed").message).toBe(
      interruptedCopy
    );
  });

  it("falls back when the response carries no code", () => {
    expect(scanErrorFrom({ state: {} }, "Extraction failed").message).toBe("Extraction failed");
    expect(scanErrorFrom(null, "Source fetch could not start").message).toBe(
      "Source fetch could not start"
    );
  });
});
