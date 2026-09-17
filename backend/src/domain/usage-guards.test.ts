import { describe, expect, it } from "vitest";

import { validateGuardOrder, type ExtractionGuard } from "./usage-guards";

describe("usage guard boundary", () => {
  it("requires enablement, rate, installation usage and global budget checks in order", () => {
    const names: ExtractionGuard["name"][] = [
      "installation-enabled",
      "rate-limit",
      "usage-cap",
      "global-budget"
    ];
    const guards: ExtractionGuard[] = names.map((name) => ({
      name,
      assertAllowed: () => Promise.resolve()
    }));
    expect(() => validateGuardOrder(guards)).not.toThrow();
  });

  it("rejects a reordered boundary", () => {
    const guards: ExtractionGuard[] = [
      { name: "rate-limit", assertAllowed: () => Promise.resolve() },
      { name: "installation-enabled", assertAllowed: () => Promise.resolve() },
      { name: "usage-cap", assertAllowed: () => Promise.resolve() },
      { name: "global-budget", assertAllowed: () => Promise.resolve() }
    ];
    expect(() => validateGuardOrder(guards)).toThrow("Invalid extraction guard order");
  });
});
