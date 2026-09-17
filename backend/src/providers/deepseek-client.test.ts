import { CONTRACT_VERSION, type AiExtractRequest } from "@syllab/contracts";
import { describe, expect, it, vi } from "vitest";

import { DeepSeekClient, DeepSeekProviderError } from "./deepseek-client";

const request: AiExtractRequest = {
  contractVersion: CONTRACT_VERSION,
  requestId: "request_1",
  courseId: "course_1",
  units: [
    {
      sourceId: "source_1",
      sourceType: "attachment",
      title: "Course guide",
      locator: "page:2",
      text: "Final assessment due 12 Sep 2026",
      contentHash: "a".repeat(64)
    }
  ]
};

function providerResponse(content: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(content) } }],
      usage: { prompt_tokens: 20, completion_tokens: 5 }
    }),
    { status, headers: { "content-type": "application/json" } }
  );
}

describe("DeepSeek client", () => {
  it("uses only deepseek-flash and validates evidence references", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        providerResponse({
          candidates: [
            {
              kind: "assessment",
              proposedValue: { title: "Final assessment", dueDate: "2026-09-12" },
              evidenceRefs: [{ sourceId: "source_1", locator: "page:2" }]
            }
          ]
        })
      )
    );
    const client = new DeepSeekClient({ apiKey: "server-secret" }, fetchImpl);
    const response = await client.extract(request);
    expect(response).toMatchObject({ model: "deepseek-flash", provider: "deepseek" });
    const init = fetchImpl.mock.calls[0]?.[1];
    const bodyText = init?.body;
    if (typeof bodyText !== "string") throw new Error("Expected JSON request body");
    const body = JSON.parse(bodyText) as { model: string };
    expect(body.model).toBe("deepseek-flash");
    expect(init?.headers).toMatchObject({ authorization: "Bearer server-secret" });
    expect(JSON.stringify(response)).not.toContain("server-secret");
  });

  it("rejects candidates without evidence or with unknown source references", async () => {
    const noEvidence = new DeepSeekClient({ apiKey: "secret" }, () =>
      Promise.resolve(
        providerResponse({
          candidates: [{ kind: "important_rule", proposedValue: {}, evidenceRefs: [] }]
        })
      )
    );
    await expect(noEvidence.extract(request)).rejects.toThrow(
      "PROVIDER_CANDIDATE_EVIDENCE_MISSING"
    );

    const unknownSource = new DeepSeekClient({ apiKey: "secret" }, () =>
      Promise.resolve(
        providerResponse({
          candidates: [
            {
              kind: "important_date",
              proposedValue: { label: "Date" },
              evidenceRefs: [{ sourceId: "not-supplied", locator: "page:1" }]
            }
          ]
        })
      )
    );
    await expect(unknownSource.extract(request)).rejects.toThrow("EVIDENCE_REFERENCE_INVALID");
  });

  it("retries one safe transient failure and never switches model", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(providerResponse({ candidates: [] }));
    const client = new DeepSeekClient({ apiKey: "secret" }, fetchImpl);
    await expect(client.extract(request)).resolves.toMatchObject({ model: "deepseek-flash" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const call of fetchImpl.mock.calls) {
      const bodyText = call[1]?.body;
      if (typeof bodyText !== "string") throw new Error("Expected JSON request body");
      expect(JSON.parse(bodyText)).toMatchObject({ model: "deepseek-flash" });
    }
  });

  it("retains only a safe upstream status and error code for diagnostics", async () => {
    const client = new DeepSeekClient({ apiKey: "secret" }, () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              message: "Sensitive provider detail",
              type: "invalid_request_error",
              code: "model_not_available"
            }
          }),
          { status: 400, headers: { "content-type": "application/json" } }
        )
      )
    );

    const failure = await client.extract(request).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(DeepSeekProviderError);
    expect(failure).toMatchObject({ status: 400, providerCode: "model_not_available" });
    expect(String(failure)).not.toContain("Sensitive provider detail");
  });

  it("accepts stable Assessment ownership and course-level rules", async () => {
    const client = new DeepSeekClient({ apiKey: "secret" }, () =>
      Promise.resolve(
        providerResponse({
          candidates: [
            {
              kind: "important_rule",
              scope: "assessment",
              appliesToAssessmentKey: "assessment:ca1",
              proposedValue: { rule: "Maximum 8 slides" },
              evidenceRefs: [{ sourceId: "source_1", locator: "page:2" }]
            },
            {
              kind: "important_rule",
              scope: "course",
              proposedValue: { rule: "General attendance policy" },
              evidenceRefs: [{ sourceId: "source_1", locator: "page:2" }]
            }
          ]
        })
      )
    );

    await expect(client.extract(request)).resolves.toMatchObject({
      candidates: [
        { scope: "assessment", appliesToAssessmentKey: "assessment:ca1" },
        { scope: "course" }
      ]
    });
  });

  it("rejects an invalid or silently missing relationship", async () => {
    const missing = new DeepSeekClient({ apiKey: "secret" }, () =>
      Promise.resolve(
        providerResponse({
          candidates: [
            {
              kind: "important_rule",
              proposedValue: { rule: "Maximum 8 slides" },
              evidenceRefs: [{ sourceId: "source_1", locator: "page:2" }]
            }
          ]
        })
      )
    );
    await expect(missing.extract(request)).rejects.toThrow(
      "PROVIDER_CANDIDATE_RELATIONSHIP_INVALID"
    );

    const ambiguous = new DeepSeekClient({ apiKey: "secret" }, () =>
      Promise.resolve(
        providerResponse({
          candidates: [
            {
              kind: "important_rule",
              proposedValue: { rule: "Maximum 8 slides" },
              reviewReason: "The parent Assessment is unclear.",
              evidenceRefs: [{ sourceId: "source_1", locator: "page:2" }]
            }
          ]
        })
      )
    );
    await expect(ambiguous.extract(request)).resolves.toMatchObject({
      candidates: [{ reviewReason: "The parent Assessment is unclear." }]
    });
  });
});
