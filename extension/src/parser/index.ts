import type { ParseResult, ParserLimits } from "./domain";
import { DEFAULT_PARSER_LIMITS } from "./domain";
import { detectDocumentFormat } from "./format-detector";
import { parseDocx, parsePptx, parseXlsx } from "./ooxml-parser";
import { parsePdf } from "./pdf-parser";

export async function parseDocument(
  bytes: Uint8Array,
  limits: ParserLimits = DEFAULT_PARSER_LIMITS
): Promise<ParseResult> {
  if (bytes.byteLength > limits.maxBytes) {
    return { format: "unsupported", status: "failed", units: [], diagnosticsCode: "SIZE_LIMIT" };
  }
  const format = detectDocumentFormat(bytes);
  if (format === "legacy-doc" || format === "legacy-ppt") {
    return { format, status: "unsupported", units: [], diagnosticsCode: "LEGACY_OFFICE" };
  }
  if (format === "unsupported") {
    return { format, status: "unsupported", units: [], diagnosticsCode: "UNSUPPORTED_FORMAT" };
  }
  try {
    const units =
      format === "pdf"
        ? await parsePdf(bytes)
        : format === "pptx"
          ? parsePptx(bytes)
          : format === "xlsx"
            ? parseXlsx(bytes)
            : parseDocx(bytes);
    if (units.length > limits.maxUnits) {
      return { format, status: "failed", units: [], diagnosticsCode: "UNIT_LIMIT" };
    }
    const textCharacters = units.reduce((total, unit) => total + unit.text.length, 0);
    if (textCharacters > limits.maxTextCharacters) {
      return { format, status: "failed", units: [], diagnosticsCode: "TEXT_LIMIT" };
    }
    return {
      format,
      status: units.some((unit) => unit.partial) ? "partial" : "parsed",
      units
    };
  } catch {
    return { format, status: "failed", units: [], diagnosticsCode: "PARSING_FAILED" };
  }
}
