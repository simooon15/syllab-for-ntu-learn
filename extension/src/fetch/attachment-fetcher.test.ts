import { describe, expect, it } from "vitest";

import { fetchAttachment } from "./attachment-fetcher";

describe("attachment fetcher", () => {
  it("validates real bytes and produces a SHA-256 without retaining the buffer", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nfixture");
    const result = await fetchAttachment("attachment:1", "https://files.example.test/a.pdf", {
      fetchImpl: () =>
        Promise.resolve(
          new Response(bytes, {
            status: 200,
            headers: {
              "content-type": "application/pdf",
              "content-disposition": 'attachment; filename="a.pdf"'
            }
          })
        )
    });
    expect(result).toMatchObject({
      status: "fetched",
      byteLength: bytes.byteLength,
      signature: "pdf",
      contentType: "application/pdf"
    });
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("stops when the declared or streamed payload exceeds the cap", async () => {
    const result = await fetchAttachment("attachment:1", "https://files.example.test/a.pdf", {
      maxBytes: 4,
      fetchImpl: () =>
        Promise.resolve(
          new Response(new Uint8Array(8), {
            status: 200,
            headers: { "content-length": "8" }
          })
        )
    });
    expect(result).toMatchObject({ status: "failed", errorCode: "ATTACHMENT_SIZE_LIMIT" });
  });

  it("rejects a partial response instead of treating one byte as a fetched file", async () => {
    const result = await fetchAttachment("attachment:1", "https://files.example.test/a.pdf", {
      fetchImpl: () =>
        Promise.resolve(
          new Response(new Uint8Array([0x25]), {
            status: 206,
            headers: { "content-range": "bytes 0-0/1000" }
          })
        )
    });
    expect(result).toMatchObject({ status: "failed", errorCode: "PARTIAL_CONTENT" });
  });
});
