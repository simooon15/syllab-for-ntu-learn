import { createHash, randomBytes } from "node:crypto";

import type {
  InstallationRecord,
  InstallationRepository,
  InstallationTokenIssuer,
  RegistrationAbuseGuard
} from "./installations";

export function hashInstallationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class InMemoryInstallationRepository implements InstallationRepository {
  private readonly byId = new Map<string, InstallationRecord>();

  findByTokenHash(tokenHash: string): Promise<InstallationRecord | null> {
    return Promise.resolve(
      [...this.byId.values()].find((record) => record.tokenHash === tokenHash) ?? null
    );
  }

  findByInstallationId(installationId: string): Promise<InstallationRecord | null> {
    return Promise.resolve(this.byId.get(installationId) ?? null);
  }

  create(record: InstallationRecord): Promise<void> {
    if (this.byId.has(record.installationId)) throw new Error("INSTALLATION_EXISTS");
    this.byId.set(record.installationId, structuredClone(record));
    return Promise.resolve();
  }

  addUsage(installationId: string, usageUnits: number): Promise<void> {
    const record = this.byId.get(installationId);
    if (!record) throw new Error("INSTALLATION_NOT_FOUND");
    record.usageUnits += usageUnits;
    return Promise.resolve();
  }

  getGlobalUsage(): Promise<number> {
    return Promise.resolve(
      [...this.byId.values()].reduce((total, record) => total + record.usageUnits, 0)
    );
  }
}

export class RandomInstallationTokenIssuer implements InstallationTokenIssuer {
  issue(): Promise<{ token: string; tokenHash: string }> {
    const token = randomBytes(32).toString("base64url");
    return Promise.resolve({ token, tokenHash: hashInstallationToken(token) });
  }
}

export class WindowRegistrationGuard implements RegistrationAbuseGuard {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly now: () => number = Date.now
  ) {}

  assertRegistrationAllowed(networkKey: string): Promise<void> {
    const cutoff = this.now() - 60 * 60 * 1000;
    const recent = (this.attempts.get(networkKey) ?? []).filter((time) => time > cutoff);
    if (recent.length >= this.limit) throw new Error("REGISTRATION_RATE_LIMITED");
    recent.push(this.now());
    this.attempts.set(networkKey, recent);
    return Promise.resolve();
  }
}
