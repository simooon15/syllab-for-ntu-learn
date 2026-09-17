import type { InstallationRecord } from "./installations";
import type { InstallationRepository } from "./installations";
import type { UsageProtectionConfig } from "../config";

export interface ExtractionGuardContext {
  installation: InstallationRecord;
  estimatedUsageUnits: number;
  requestId: string;
}

export interface ExtractionGuard {
  readonly name: "installation-enabled" | "rate-limit" | "usage-cap" | "global-budget";
  assertAllowed(context: ExtractionGuardContext): Promise<void>;
}

export const REQUIRED_GUARD_ORDER: ReadonlyArray<ExtractionGuard["name"]> = [
  "installation-enabled",
  "rate-limit",
  "usage-cap",
  "global-budget"
];

export function validateGuardOrder(guards: ReadonlyArray<ExtractionGuard>): void {
  const actual = guards.map((guard) => guard.name);
  if (actual.join("|") !== REQUIRED_GUARD_ORDER.join("|")) {
    throw new Error(`Invalid extraction guard order: ${actual.join(", ")}`);
  }
}

export class UsageGuardError extends Error {
  constructor(
    readonly code:
      "INSTALLATION_DISABLED" | "RATE_LIMITED" | "USAGE_CAP_REACHED" | "GLOBAL_BUDGET_GUARD"
  ) {
    super(code);
  }
}

export function createUsageGuards(options: {
  repository: InstallationRepository;
  config: UsageProtectionConfig;
  now?: () => number;
}): ExtractionGuard[] {
  const now = options.now ?? Date.now;
  const recentRequests = new Map<string, number[]>();
  const guards: ExtractionGuard[] = [
    {
      name: "installation-enabled",
      assertAllowed: ({ installation }) => {
        if (!installation.enabled) throw new UsageGuardError("INSTALLATION_DISABLED");
        return Promise.resolve();
      }
    },
    {
      name: "rate-limit",
      assertAllowed: ({ installation }) => {
        const cutoff = now() - 60_000;
        const recent = (recentRequests.get(installation.installationId) ?? []).filter(
          (time) => time > cutoff
        );
        if (recent.length >= options.config.rateLimitRequestsPerMinute) {
          throw new UsageGuardError("RATE_LIMITED");
        }
        recent.push(now());
        recentRequests.set(installation.installationId, recent);
        return Promise.resolve();
      }
    },
    {
      name: "usage-cap",
      assertAllowed: ({ installation, estimatedUsageUnits }) => {
        if (
          installation.usageUnits + estimatedUsageUnits >
          options.config.installationUsageCapUnits
        ) {
          throw new UsageGuardError("USAGE_CAP_REACHED");
        }
        return Promise.resolve();
      }
    },
    {
      name: "global-budget",
      assertAllowed: async ({ estimatedUsageUnits }) => {
        if (
          (await options.repository.getGlobalUsage()) + estimatedUsageUnits >
          options.config.globalBudgetCapUnits
        ) {
          throw new UsageGuardError("GLOBAL_BUDGET_GUARD");
        }
      }
    }
  ];
  validateGuardOrder(guards);
  return guards;
}
