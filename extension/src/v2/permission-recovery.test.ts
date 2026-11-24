import { afterEach, expect, it, vi } from "vitest";
import { missingRecordedPermissionPatterns } from "./permission-recovery";
afterEach(() => vi.unstubAllGlobals());
it("requests only missing exact observed Blackboard origins, never wildcard or credential scopes", async () => {
  const contains = vi.fn(({ origins }: { origins: string[] }) =>
    Promise.resolve(origins[0] === "https://granted.blackboard.com/*")
  );
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: () =>
          Promise.resolve({
            "syllab.permissionOrigins": [
              "https://missing.blackboard.com",
              "https://missing.blackboard.com",
              "https://granted.blackboard.com",
              "https://files.prod.files.blackboard.com",
              "https://*.blackboard.com",
              "https://user:pass@evil.blackboard.com",
              "https://example.test",
              "http://missing.blackboard.com",
              "https://missing.blackboard.com/path",
              "https://missing.blackboard.com:9443",
              null
            ]
          })
      }
    },
    permissions: { contains }
  });
  expect(await missingRecordedPermissionPatterns()).toEqual([
    "https://missing.blackboard.com/*",
    "https://files.prod.files.blackboard.com/*"
  ]);
});
