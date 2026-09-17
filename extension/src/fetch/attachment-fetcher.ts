import type { AttachmentFetchResult } from "./domain";

export const PROVISIONAL_FETCH_LIMIT_BYTES = 64 * 1024 * 1024;

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

function hex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function signature(bytes: Uint8Array): string {
  const firstEight = bytes.slice(0, 8);
  const text = new TextDecoder("ascii").decode(firstEight);
  if (text.startsWith("%PDF-")) return "pdf";
  if (firstEight[0] === 0x50 && firstEight[1] === 0x4b) return "zip";
  if (hex(firstEight) === "d0cf11e0a1b11ae1") return "ole";
  return `unknown:${hex(firstEight)}`;
}

async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("ATTACHMENT_SIZE_LIMIT");
  }
  if (!response.body) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let streamComplete = false;
  try {
    while (!streamComplete) {
      const { done, value } = await reader.read();
      if (done) {
        streamComplete = true;
        continue;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("attachment size limit");
        throw new Error("ATTACHMENT_SIZE_LIMIT");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function fetchAttachment(
  sourceId: string,
  requestUrl: string,
  options: {
    fetchImpl?: FetchLike;
    maxBytes?: number;
    signal?: AbortSignal;
  } = {}
): Promise<AttachmentFetchResult> {
  return (await fetchAttachmentPayload(sourceId, requestUrl, options)).result;
}

export async function fetchAttachmentPayload(
  sourceId: string,
  requestUrl: string,
  options: {
    fetchImpl?: FetchLike;
    maxBytes?: number;
    signal?: AbortSignal;
  } = {}
): Promise<{ result: AttachmentFetchResult; bytes?: Uint8Array }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxBytes = options.maxBytes ?? PROVISIONAL_FETCH_LIMIT_BYTES;
  try {
    const response = await fetchImpl(requestUrl, {
      method: "GET",
      credentials: "include",
      redirect: "follow",
      cache: "no-store",
      ...(options.signal ? { signal: options.signal } : {})
    });
    if (!response.ok) {
      return {
        result: { sourceId, status: "failed", httpStatus: response.status, errorCode: "HTTP_ERROR" }
      };
    }
    if (response.status === 206 || response.headers.has("content-range")) {
      await response.body?.cancel();
      return {
        result: {
          sourceId,
          status: "failed",
          httpStatus: response.status,
          errorCode: "PARTIAL_CONTENT"
        }
      };
    }
    const bytes = await readBounded(response, maxBytes);
    const digest = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
    const contentType = response.headers.get("content-type");
    const contentDisposition = response.headers.get("content-disposition");
    return {
      result: {
        sourceId,
        status: "fetched",
        finalOrigin: new URL(response.url || requestUrl).origin,
        httpStatus: response.status,
        ...(contentType ? { contentType } : {}),
        ...(contentDisposition ? { contentDisposition } : {}),
        byteLength: bytes.byteLength,
        signature: signature(bytes),
        sha256: hex(new Uint8Array(digest))
      },
      bytes
    };
  } catch (error) {
    return {
      result: {
        sourceId,
        status: "failed",
        errorCode:
          error instanceof Error && error.message === "ATTACHMENT_SIZE_LIMIT"
            ? "ATTACHMENT_SIZE_LIMIT"
            : error instanceof DOMException && error.name === "AbortError"
              ? "CANCELLED"
              : "FETCH_FAILED"
      }
    };
  }
}
