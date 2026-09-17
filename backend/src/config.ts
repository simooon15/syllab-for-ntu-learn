export interface RuntimeEnvironment {
  readonly [key: string]: string | undefined;
}

export interface UsageProtectionConfig {
  rateLimitRequestsPerMinute: number;
  installationUsageCapUnits: number;
  globalBudgetCapUnits: number;
  registrationLimitPerHour: number;
}

export interface ServerConfig {
  port: number;
  usageProtection: UsageProtectionConfig;
}

function readPositiveInteger(
  environment: RuntimeEnvironment,
  key: string,
  fallback: number
): number {
  const raw = environment[key];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
  return value;
}

export function loadServerConfig(environment: RuntimeEnvironment): ServerConfig {
  return {
    port: readPositiveInteger(environment, "PORT", 8787),
    usageProtection: {
      rateLimitRequestsPerMinute: readPositiveInteger(
        environment,
        "RATE_LIMIT_REQUESTS_PER_MINUTE",
        10
      ),
      installationUsageCapUnits: readPositiveInteger(
        environment,
        "INSTALLATION_USAGE_CAP_UNITS",
        100_000
      ),
      globalBudgetCapUnits: readPositiveInteger(environment, "GLOBAL_BUDGET_CAP_UNITS", 1_000_000),
      registrationLimitPerHour: readPositiveInteger(environment, "REGISTRATION_LIMIT_PER_HOUR", 5)
    }
  };
}

export interface DeepSeekSecret {
  readonly apiKey: string;
}

export function loadDeepSeekSecret(environment: RuntimeEnvironment): DeepSeekSecret {
  const apiKey = environment.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is required by the DeepSeek adapter");
  return { apiKey };
}
