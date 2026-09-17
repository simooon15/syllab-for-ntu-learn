import { CONTRACT_VERSION, isRecord, type AiExtractRequest } from "@syllab/contracts";

import type {
  AiBackendTransport,
  InstallationCredentialRepository,
  InstallationCredentials
} from "./domain";

declare const __SYLLAB_BACKEND_URL__: string;

export const BACKEND_BASE_URL =
  typeof __SYLLAB_BACKEND_URL__ === "string" ? __SYLLAB_BACKEND_URL__ : "http://127.0.0.1:8787";

export class ChromeInstallationCredentialRepository implements InstallationCredentialRepository {
  private readonly key = "syllab.installationCredentials";

  async get(): Promise<InstallationCredentials | null> {
    const result = await chrome.storage.local.get(this.key);
    const value = result[this.key];
    if (!isRecord(value) || typeof value.installationId !== "string") return null;
    return {
      installationId: value.installationId,
      ...(typeof value.installationToken === "string"
        ? { installationToken: value.installationToken }
        : {})
    };
  }

  async save(credentials: InstallationCredentials): Promise<void> {
    await chrome.storage.local.set({ [this.key]: credentials });
  }
}

export class HttpAiBackendTransport implements AiBackendTransport {
  constructor(
    private readonly baseUrl = BACKEND_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch
  ) {}

  async register(installationId: string): Promise<string> {
    const response = await this.fetchImpl.call(
      globalThis,
      `${this.baseUrl}/installation/register`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractVersion: CONTRACT_VERSION,
          installationId,
          clientVersion: chrome.runtime.getManifest().version
        })
      }
    );
    const payload: unknown = await response.json();
    if (!response.ok || !isRecord(payload) || typeof payload.installationToken !== "string") {
      throw new Error("INSTALLATION_REGISTRATION_FAILED");
    }
    return payload.installationToken;
  }

  async extract(token: string, request: AiExtractRequest): Promise<unknown> {
    const response = await this.fetchImpl.call(globalThis, `${this.baseUrl}/ai/extract`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const code = isRecord(payload) && isRecord(payload.error) ? payload.error.code : undefined;
      throw new Error(typeof code === "string" ? code : "AI_BACKEND_FAILED");
    }
    return payload;
  }
}
