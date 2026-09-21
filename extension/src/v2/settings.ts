import type { AuthorizationRecord } from "./domain";

export const DEEPSEEK_KEY_STORAGE = "syllab.deepseekApiKey";
export const PRIVACY_AUTH_STORAGE = "syllab.privacyAuthorization";
export const API_USAGE_AUTH_STORAGE = "syllab.apiUsageAuthorization";
export const API_KEY_STATUS_STORAGE = "syllab.deepseekApiKeyStatus";

export interface LocalSettingsStorage {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export interface ApiKeyStatus {
  state: "missing" | "unvalidated" | "valid" | "invalid";
  maskedSuffix?: string;
}

function authorization(value: unknown): AuthorizationRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { granted: false, policyVersion: "v0.2.0" };
  }
  const candidate = value as Partial<AuthorizationRecord>;
  return {
    granted: candidate.granted === true,
    policyVersion: typeof candidate.policyVersion === "string" ? candidate.policyVersion : "v0.2.0",
    ...(typeof candidate.grantedAt === "string" ? { grantedAt: candidate.grantedAt } : {}),
    ...(typeof candidate.revokedAt === "string" ? { revokedAt: candidate.revokedAt } : {})
  };
}

export class SettingsRepository {
  constructor(private readonly storage: LocalSettingsStorage) {}

  async saveApiKey(apiKey: string): Promise<void> {
    const trimmed = apiKey.trim();
    if (!trimmed) throw new Error("API_KEY_EMPTY");
    await this.storage.set({
      [DEEPSEEK_KEY_STORAGE]: trimmed,
      [API_KEY_STATUS_STORAGE]: "unvalidated"
    });
  }

  /**
   * Records what a check concluded. Kept apart from `saveApiKey` because the two answer different
   * questions: saving says "this is the key I have", checking says "and DeepSeek accepts it".
   */
  async markApiKey(state: "valid" | "invalid"): Promise<void> {
    await this.storage.set({ [API_KEY_STATUS_STORAGE]: state });
  }

  async removeApiKey(): Promise<void> {
    await this.storage.remove([DEEPSEEK_KEY_STORAGE, "syllab.deepseekApiKeyStatus"]);
  }

  async readApiKeyForTransport(): Promise<string | null> {
    const result = await this.storage.get(DEEPSEEK_KEY_STORAGE);
    const key = result[DEEPSEEK_KEY_STORAGE];
    return typeof key === "string" && key.length > 0 ? key : null;
  }

  async apiKeyStatus(): Promise<ApiKeyStatus> {
    const result = await this.storage.get([DEEPSEEK_KEY_STORAGE, "syllab.deepseekApiKeyStatus"]);
    const key = result[DEEPSEEK_KEY_STORAGE];
    if (typeof key !== "string" || !key) return { state: "missing" };
    const rawStatus = result[API_KEY_STATUS_STORAGE];
    const state = rawStatus === "valid" || rawStatus === "invalid" ? rawStatus : "unvalidated";
    return { state, maskedSuffix: key.slice(-4).padStart(8, "•") };
  }

  async setApiKeyValidation(valid: boolean): Promise<void> {
    await this.storage.set({ "syllab.deepseekApiKeyStatus": valid ? "valid" : "invalid" });
  }

  async authorizations(): Promise<{
    privacy: AuthorizationRecord;
    apiUsage: AuthorizationRecord;
  }> {
    const result = await this.storage.get([PRIVACY_AUTH_STORAGE, API_USAGE_AUTH_STORAGE]);
    return {
      privacy: authorization(result[PRIVACY_AUTH_STORAGE]),
      apiUsage: authorization(result[API_USAGE_AUTH_STORAGE])
    };
  }

  async setAuthorization(
    kind: "privacy" | "apiUsage",
    granted: boolean,
    now = new Date().toISOString()
  ): Promise<void> {
    const key = kind === "privacy" ? PRIVACY_AUTH_STORAGE : API_USAGE_AUTH_STORAGE;
    const record: AuthorizationRecord = granted
      ? { granted, policyVersion: "v0.2.0", grantedAt: now }
      : { granted, policyVersion: "v0.2.0", revokedAt: now };
    await this.storage.set({ [key]: record });
  }
}
