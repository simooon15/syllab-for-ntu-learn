import { strFromU8, unzipSync } from "fflate";

import type { DocumentFormat } from "./domain";

const OLE_SIGNATURE = "d0cf11e0a1b11ae1";

function hex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function containsAscii(bytes: Uint8Array, text: string): boolean {
  return new TextDecoder("latin1").decode(bytes).includes(text);
}

export function detectDocumentFormat(bytes: Uint8Array): DocumentFormat {
  const prefix = new TextDecoder("ascii").decode(bytes.slice(0, 8));
  if (prefix.startsWith("%PDF-")) return "pdf";
  if (hex(bytes.slice(0, 8)) === OLE_SIGNATURE) {
    if (containsAscii(bytes, "PowerPoint Document")) return "legacy-ppt";
    if (containsAscii(bytes, "WordDocument")) return "legacy-doc";
    return "unsupported";
  }
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return "unsupported";
  try {
    const archive = unzipSync(bytes, { filter: (file) => file.name === "[Content_Types].xml" });
    const types = archive["[Content_Types].xml"];
    if (!types) return "unsupported";
    const xml = strFromU8(types);
    if (xml.includes("presentationml")) return "pptx";
    if (xml.includes("wordprocessingml")) return "docx";
    return "unsupported";
  } catch {
    return "unsupported";
  }
}
