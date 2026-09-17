import {
  CONTRACT_VERSION,
  isAiExtractRequest,
  isRegisterInstallationRequest,
  type ApiErrorResponse,
  type RegisterInstallationResponse
} from "@syllab/contracts";

import { hashInstallationToken } from "./domain/in-memory-installations";
import type {
  InstallationRepository,
  InstallationTokenIssuer,
  RegistrationAbuseGuard
} from "./domain/installations";
import { UsageGuardError, validateGuardOrder, type ExtractionGuard } from "./domain/usage-guards";
import { DeepSeekProviderError, type AiProviderClient } from "./providers/deepseek-client";

export interface AppRequest {
  method: string;
  url: string;
  headers: Readonly<Record<string, string | undefined>>;
  body?: unknown;
  networkKey?: string;
}

export interface AppResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  body: unknown;
}

export interface AppDependencies {
  installations: InstallationRepository;
  tokenIssuer: InstallationTokenIssuer;
  registrationGuard: RegistrationAbuseGuard;
  extractionGuards: ExtractionGuard[];
  provider: AiProviderClient;
  now?: () => Date;
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS"
} as const;

function error(
  status: number,
  code: ApiErrorResponse["error"]["code"],
  message: string
): AppResponse {
  return {
    status,
    headers: jsonHeaders,
    body: { contractVersion: CONTRACT_VERSION, error: { code, message } } satisfies ApiErrorResponse
  };
}

function operationError(value: unknown): AppResponse {
  if (value instanceof UsageGuardError) {
    return error(value.code === "RATE_LIMITED" ? 429 : 403, value.code, value.code);
  }
  if (value instanceof DeepSeekProviderError) {
    const providerCode = value.providerCode ? `, code ${value.providerCode}` : "";
    return error(
      value.status === 429 ? 429 : 503,
      "PROVIDER_UNAVAILABLE",
      `AI provider unavailable (upstream status ${String(value.status)}${providerCode})`
    );
  }
  const safeIntegrationCodes = new Set([
    "PROVIDER_TRANSPORT_FAILED",
    "PROVIDER_ENVELOPE_INVALID",
    "PROVIDER_CONTENT_MISSING",
    "PROVIDER_CONTENT_JSON_INVALID",
    "PROVIDER_CONTENT_SCHEMA_INVALID",
    "PROVIDER_CANDIDATE_NOT_OBJECT",
    "PROVIDER_CANDIDATE_KIND_INVALID",
    "PROVIDER_CANDIDATE_VALUE_INVALID",
    "PROVIDER_CANDIDATE_EVIDENCE_MISSING",
    "PROVIDER_CANDIDATE_RELATIONSHIP_INVALID",
    "EVIDENCE_REFERENCE_INVALID"
  ]);
  if (value instanceof Error && safeIntegrationCodes.has(value.message)) {
    return error(
      503,
      "PROVIDER_UNAVAILABLE",
      `AI extraction could not complete (${value.message})`
    );
  }
  return error(503, "PROVIDER_UNAVAILABLE", "AI extraction could not complete");
}

export function createApp(
  dependencies: AppDependencies
): (request: AppRequest) => Promise<AppResponse> {
  validateGuardOrder(dependencies.extractionGuards);
  const now = dependencies.now ?? (() => new Date());
  return async (request) => {
    if (request.method === "OPTIONS") {
      return { status: 204, headers: jsonHeaders, body: null };
    }
    if (request.method === "GET" && request.url === "/health") {
      return {
        status: 200,
        headers: jsonHeaders,
        body: { status: "ok", contractVersion: CONTRACT_VERSION, phase: "ai-proxy" }
      };
    }

    if (request.method === "POST" && request.url === "/installation/register") {
      if (!isRegisterInstallationRequest(request.body)) {
        return error(400, "INVALID_REQUEST", "Invalid installation registration request");
      }
      try {
        await dependencies.registrationGuard.assertRegistrationAllowed(
          request.networkKey ?? "unavailable"
        );
        const existing = await dependencies.installations.findByInstallationId(
          request.body.installationId
        );
        if (existing) return error(400, "INVALID_REQUEST", "Installation already registered");
        const issued = await dependencies.tokenIssuer.issue(request.body.installationId);
        await dependencies.installations.create({
          installationId: request.body.installationId,
          tokenHash: issued.tokenHash,
          enabled: true,
          usageUnits: 0,
          createdAt: now().toISOString()
        });
        return {
          status: 201,
          headers: jsonHeaders,
          body: {
            contractVersion: CONTRACT_VERSION,
            installationToken: issued.token,
            tokenType: "Bearer"
          } satisfies RegisterInstallationResponse
        };
      } catch {
        return error(429, "RATE_LIMITED", "Installation registration limit reached");
      }
    }

    if (request.method === "POST" && request.url === "/ai/extract") {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer ")) {
        return error(401, "UNAUTHORIZED", "A valid installation token is required");
      }
      if (!isAiExtractRequest(request.body)) {
        return error(400, "INVALID_REQUEST", "Invalid extraction request");
      }
      const installation = await dependencies.installations.findByTokenHash(
        hashInstallationToken(authorization.slice("Bearer ".length))
      );
      if (!installation)
        return error(401, "UNAUTHORIZED", "A valid installation token is required");
      const estimatedUsageUnits = request.body.units.reduce(
        (total, unit) => total + unit.text.length,
        0
      );
      try {
        for (const guard of dependencies.extractionGuards) {
          await guard.assertAllowed({
            installation,
            estimatedUsageUnits,
            requestId: request.body.requestId
          });
        }
        const result = await dependencies.provider.extract(request.body);
        await dependencies.installations.addUsage(
          installation.installationId,
          result.usage.inputTokens + result.usage.outputTokens
        );
        return { status: 200, headers: jsonHeaders, body: result };
      } catch (failure) {
        return operationError(failure);
      }
    }

    return error(404, "INVALID_REQUEST", "Route not found");
  };
}
