import { strFromU8, unzipSync } from "fflate";

import type { DocumentFormat } from "./domain";

const OLE_SIGNATURE = "d0cf11e0a1b11ae1";

const asciiDecoder = new TextDecoder("ascii");
const latin1Decoder = new TextDecoder("latin1");
const utf16leDecoder = new TextDecoder("utf-16le");

function hex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function detectDocumentFormat(bytes: Uint8Array): DocumentFormat {
  const prefix = asciiDecoder.decode(bytes.slice(0, 8));
  if (prefix.startsWith("%PDF-")) return "pdf";
  if (hex(bytes.slice(0, 8)) === OLE_SIGNATURE) {
    const latin1 = latin1Decoder.decode(bytes);
    const utf16 = utf16leDecoder.decode(bytes);
    const has = (text: string): boolean => latin1.includes(text) || utf16.includes(text);
    if (has("PowerPoint Document")) return "legacy-ppt";
    if (has("WordDocument")) return "legacy-doc";
    if (has("Workbook") || has("Book")) return "legacy-xls";
    return "unsupported";
  }
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return "unsupported";
  try {
    const archive = unzipSync(bytes, {
      filter: (file) => file.name === "[Content_Types].xml"
    });
    const types = archive["[Content_Types].xml"];
    if (!types) return "unsupported";
    const xml = strFromU8(types);
    if (xml.includes("presentationml")) return "pptx";
    if (xml.includes("wordprocessingml")) return "docx";
    if (xml.includes("spreadsheetml")) return "xlsx";
    return "unsupported";
  } catch {
    return "unsupported";
  }
}
