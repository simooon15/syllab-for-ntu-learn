import {
  CONTRACT_VERSION,
  MODEL_NAME,
  MODEL_PROVIDER,
  isRecord,
  type AiExtractRequest,
  type AiExtractResponse,
  type ExtractedCandidate
} from "@syllab/contracts";

import type { DeepSeekSecret } from "../config";
import { EXTRACTION_SYSTEM_PROMPT } from "../prompts/extraction-system-prompt";

export interface AiProviderClient {
  readonly provider: typeof MODEL_PROVIDER;
  readonly model: typeof MODEL_NAME;
  extract(request: AiExtractRequest): Promise<AiExtractResponse>;
}

export class DeepSeekClient implements AiProviderClient {
  readonly provider = MODEL_PROVIDER;
  readonly model = MODEL_NAME;

  constructor(
    private readonly secret: DeepSeekSecret,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly endpoint = "https://api.deepseek.com/chat/completions"
  ) {}

  async extract(request: AiExtractRequest): Promise<AiExtractResponse> {
    if (this.secret.apiKey.length === 0 || request.units.length === 0) {
      throw new Error("DeepSeek adapter received invalid input");
    }
    const sourceIds = new Set(request.units.map((unit) => unit.sourceId));
    const body = {
      model: MODEL_NAME,
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: EXTRACTION_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify({ courseId: request.courseId, units: request.units })
        }
      ]
    };
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await this.fetchImpl.call(globalThis, this.endpoint, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.secret.apiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30_000)
        });
      } catch {
        throw new Error("PROVIDER_TRANSPORT_FAILED");
      }
      if (![429, 500, 503].includes(response.status) || attempt === 1) break;
    }
    if (!response?.ok) {
      let providerCode: string | undefined;
      try {
        const failure: unknown = await response?.json();
        const providerError = isRecord(failure) && isRecord(failure.error) ? failure.error : null;
        providerCode =
          providerError && typeof providerError.code === "string"
            ? providerError.code
            : providerError && typeof providerError.type === "string"
              ? providerError.type
              : undefined;
      } catch {
        providerCode = undefined;
      }
      throw new DeepSeekProviderError(response?.status ?? 503, providerCode);
    }
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.choices) || !isRecord(payload.choices[0])) {
      throw new Error("PROVIDER_ENVELOPE_INVALID");
    }
    const message = payload.choices[0].message;
    if (!isRecord(message) || typeof message.content !== "string") {
      throw new Error("PROVIDER_CONTENT_MISSING");
    }
    let extracted: unknown;
    try {
      extracted = JSON.parse(message.content) as unknown;
    } catch {
      throw new Error("PROVIDER_CONTENT_JSON_INVALID");
    }
    if (!isRecord(extracted) || !Array.isArray(extracted.candidates)) {
      throw new Error("PROVIDER_CONTENT_SCHEMA_INVALID");
    }
    const candidates: ExtractedCandidate[] = extracted.candidates.map((candidate) => {
      if (!isRecord(candidate)) throw new Error("PROVIDER_CANDIDATE_NOT_OBJECT");
      if (
        candidate.kind !== "assessment" &&
        candidate.kind !== "important_date" &&
        candidate.kind !== "important_rule"
      )
        throw new Error("PROVIDER_CANDIDATE_KIND_INVALID");
      if (!isRecord(candidate.proposedValue)) throw new Error("PROVIDER_CANDIDATE_VALUE_INVALID");
      if (!Array.isArray(candidate.evidenceRefs) || candidate.evidenceRefs.length === 0)
        throw new Error("PROVIDER_CANDIDATE_EVIDENCE_MISSING");
      const evidenceRefs = candidate.evidenceRefs.map((reference) => {
        if (
          !isRecord(reference) ||
          typeof reference.sourceId !== "string" ||
          typeof reference.locator !== "string" ||
          !sourceIds.has(reference.sourceId)
        ) {
          throw new Error("EVIDENCE_REFERENCE_INVALID");
        }
        return { sourceId: reference.sourceId, locator: reference.locator };
      });
      const kind = candidate.kind;
      const scope = candidate.scope;
      const parentKey = candidate.appliesToAssessmentKey;
      const reviewReason =
        typeof candidate.reviewReason === "string" ? candidate.reviewReason : undefined;
      if (kind === "assessment" && (scope !== undefined || parentKey !== undefined)) {
        throw new Error("PROVIDER_CANDIDATE_RELATIONSHIP_INVALID");
      }
      if (kind !== "assessment") {
        const validCourse = scope === "course" && parentKey === undefined;
        const validAssessment =
          scope === "assessment" &&
          typeof parentKey === "string" &&
          /^assessment:[a-z0-9][a-z0-9-]*$/.test(parentKey);
        const validAmbiguous =
          scope === undefined && parentKey === undefined && reviewReason !== undefined;
        if (!validCourse && !validAssessment && !validAmbiguous) {
          throw new Error("PROVIDER_CANDIDATE_RELATIONSHIP_INVALID");
        }
      }
      return {
        kind,
        ...(scope === "course" || scope === "assessment" ? { scope } : {}),
        ...(typeof parentKey === "string" ? { appliesToAssessmentKey: parentKey } : {}),
        proposedValue: candidate.proposedValue,
        evidenceRefs,
        ...(reviewReason ? { reviewReason } : {})
      };
    });
    const usage = isRecord(payload.usage) ? payload.usage : {};
    return {
      contractVersion: CONTRACT_VERSION,
      requestId: request.requestId,
      provider: MODEL_PROVIDER,
      model: MODEL_NAME,
      candidates,
      usage: {
        inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : 0,
        outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : 0
      }
    };
  }
}

export class DeepSeekProviderError extends Error {
  constructor(
    readonly status: number,
    readonly providerCode?: string
  ) {
    super(`DeepSeek request failed with status ${String(status)}`);
  }
}
