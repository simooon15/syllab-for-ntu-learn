export interface InstallationRecord {
  installationId: string;
  tokenHash: string;
  enabled: boolean;
  usageUnits: number;
  createdAt: string;
}

export interface InstallationRepository {
  findByTokenHash(tokenHash: string): Promise<InstallationRecord | null>;
  findByInstallationId(installationId: string): Promise<InstallationRecord | null>;
  create(record: InstallationRecord): Promise<void>;
  addUsage(installationId: string, usageUnits: number): Promise<void>;
  getGlobalUsage(): Promise<number>;
}

export interface InstallationTokenIssuer {
  issue(installationId: string): Promise<{ token: string; tokenHash: string }>;
}

export interface RegistrationAbuseGuard {
  assertRegistrationAllowed(networkKey: string): Promise<void>;
}
