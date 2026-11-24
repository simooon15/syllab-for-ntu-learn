import { DEEPSEEK_FLASH_CAPABILITIES } from "./invocation-policy";

/** Verified for the official POST /chat/completions inline vision API, 2026-10-06.
 * https://api-docs.deepseek.com/guides/vision/ */
export const INLINE_BODY_BYTES = 48 * 1024 * 1024;
export const INLINE_IMAGE_BYTES = 32 * 1024 * 1024;
export const INLINE_TOTAL_IMAGE_BYTES = 64 * 1024 * 1024;
export const INLINE_IMAGE_COUNT = 600;
export interface ProviderRequest {
  /** Task-specific effort; semantic audits keep high until low is quality-validated. */
  reasoningEffort?: "low" | "high";
  /** Optional API max_tokens is omitted for current physical-work paths; no owned output cap. */
  providerRequestCompatibility?: "provider-default";
  system: string;
  user: string;
  maxTokens: number;
  visualParts?: Array<{ locator: string; dataUrl: string }>;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
}
/** Official JSON-mode configuration rule, not an owned capacity limit. */
export function providerConfigurationError(request: ProviderRequest): string | undefined {
  const text = [
    request.system,
    ...(request.messages?.map((m) => m.content) ?? [request.user])
  ].join("\n");
  return /\bjson\b/i.test(text) ? undefined : "provider-json-directive";
}
/** Single serializer shared by planner and actual fetch: envelope, locators, text and base64. */
export function serializeProviderRequest(request: ProviderRequest): string {
  return JSON.stringify({
    model: DEEPSEEK_FLASH_CAPABILITIES.model,
    thinking: { type: DEEPSEEK_FLASH_CAPABILITIES.thinking },
    reasoning_effort: request.reasoningEffort ?? DEEPSEEK_FLASH_CAPABILITIES.reasoningEffort,
    ...(request.providerRequestCompatibility === "provider-default"
      ? {}
      : { max_tokens: request.maxTokens }),
    response_format: { type: "json_object" },
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: "system", content: request.system },
      ...(request.messages ?? [
        {
          role: "user",
          content: request.visualParts?.length
            ? [
                { type: "text", text: request.user },
                ...request.visualParts.flatMap((part) => [
                  {
                    type: "text",
                    text: `Visual completion at ${part.locator}. Supplement native structure only; cite this locator.`
                  },
                  { type: "image_url", image_url: { url: part.dataUrl } }
                ])
              ]
            : request.user
        }
      ])
    ]
  });
}
export function decodedImageBytes(dataUrl: string): number {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return (
    Math.floor((encoded.length * 3) / 4) -
    (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0)
  );
}
export function requestBoundary(request: ProviderRequest): { bytes: number; reason?: string } {
  const bytes = new TextEncoder().encode(serializeProviderRequest(request)).byteLength;
  const configuration = providerConfigurationError(request);
  if (configuration) return { bytes, reason: configuration };
  const parts = request.visualParts ?? [];
  if (parts.length && bytes > INLINE_BODY_BYTES)
    return { bytes, reason: "provider-inline-body-bytes" };
  if (parts.length > INLINE_IMAGE_COUNT) return { bytes, reason: "provider-image-count" };
  if (parts.some((part) => decodedImageBytes(part.dataUrl) > INLINE_IMAGE_BYTES))
    return { bytes, reason: "provider-single-image-bytes" };
  if (parts.reduce((n, part) => n + decodedImageBytes(part.dataUrl), 0) > INLINE_TOTAL_IMAGE_BYTES)
    return { bytes, reason: "provider-total-image-bytes" };
  // Production renderer supplies PNGs. Dimension checks concern decoded pixels, not string size.
  const maxDimension = parts.length >= 15 ? 4096 : 8192;
  for (const part of parts) {
    if (!part.dataUrl.startsWith("data:image/png;base64,iVBORw0KGgo")) continue;
    const header = atob(
      part.dataUrl.slice(part.dataUrl.indexOf(",") + 1, part.dataUrl.indexOf(",") + 45)
    );
    const dimension = (offset: number) =>
      header.charCodeAt(offset) * 0x1000000 +
      (header.charCodeAt(offset + 1) << 16) +
      (header.charCodeAt(offset + 2) << 8) +
      header.charCodeAt(offset + 3);
    if (dimension(16) > maxDimension || dimension(20) > maxDimension)
      return { bytes, reason: "provider-image-dimension" };
  }
  return { bytes };
}
