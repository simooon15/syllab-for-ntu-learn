import { describe, expect, it } from "vitest";

import {
  API_KEY_STATUS_STORAGE,
  DEEPSEEK_KEY_STORAGE,
  SettingsRepository,
  type LocalSettingsStorage
} from "./settings";

function storage(): LocalSettingsStorage & { values: Record<string, unknown> } {
  const values: Record<string, unknown> = {};
  return {
    values,
    get(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      return Promise.resolve(
        Object.fromEntries(list.filter((key) => key in values).map((key) => [key, values[key]]))
      );
    },
    set(items) {
      Object.assign(values, items);
      return Promise.resolve();
    },
    remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) Reflect.deleteProperty(values, key);
      return Promise.resolve();
    }
  };
}

describe("v0.2 settings", () => {
  it("returns only a masked key status to the UI-facing query", async () => {
    const area = storage();
    const repository = new SettingsRepository(area);
    await repository.saveApiKey("  example-private-key-1234  ");
    expect(await repository.apiKeyStatus()).toEqual({
      state: "unvalidated",
      maskedSuffix: "••••1234"
    });
    expect(area.values[DEEPSEEK_KEY_STORAGE]).toBe("example-private-key-1234");
    expect(area.values[API_KEY_STATUS_STORAGE]).toBe("unvalidated");
    expect(area.values).not.toHaveProperty("API_KEY_STATUS_STORAGE");

    await repository.markApiKey("valid");
    expect(await repository.apiKeyStatus()).toEqual({
      state: "valid",
      maskedSuffix: "••••1234"
    });
    expect(area.values[API_KEY_STATUS_STORAGE]).toBe("valid");

    await repository.markApiKey("invalid");
    expect(await repository.apiKeyStatus()).toEqual({
      state: "invalid",
      maskedSuffix: "••••1234"
    });
    expect(area.values[API_KEY_STATUS_STORAGE]).toBe("invalid");
  });

  it("persists Privacy and API Usage authorization independently", async () => {
    const repository = new SettingsRepository(storage());
    await repository.setAuthorization("privacy", true, "2026-09-19T00:00:00.000Z");
    expect(await repository.authorizations()).toEqual({
      privacy: {
        granted: true,
        policyVersion: "v0.2.0",
        grantedAt: "2026-09-19T00:00:00.000Z"
      },
      apiUsage: { granted: false, policyVersion: "v0.2.0" }
    });
  });
});
