export type DocumentFormat =
  "pdf" | "pptx" | "docx" | "xlsx" | "legacy-ppt" | "legacy-doc" | "legacy-xls" | "unsupported";

export interface ParsedTextUnit {
  locator: string;
  text: string;
  partial: boolean;
  /** Native structure is retained independently of the model's semantic organization. */
  kind?: "page" | "slide" | "paragraph" | "table" | "row";
  section?: string;
  sheetName?: string;
  cells?: Array<{ reference: string; value: string; formula?: string }>;
  mergedRanges?: string[];
  visualGaps?: string[];
  embeddedImagePaths?: string[];
  textRanges?: Array<{
    start: number;
    end: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface ParseResult {
  format: DocumentFormat;
  status: "parsed" | "partial" | "unsupported" | "failed";
  units: ParsedTextUnit[];
  contentHash?: string;
  diagnosticsCode?: string;
  canonicalization?: {
    originalFormat: DocumentFormat;
    canonicalFormat: DocumentFormat;
    tool: string;
    canonicalHash?: string;
  };
}

export interface ParserLimits {
  maxBytes?: number;
  maxUnits?: number;
  maxTextCharacters?: number;
}

export const DEFAULT_PARSER_LIMITS: ParserLimits = {};

/** Narrow the offscreen message boundary before consuming native parser units. */
export function isParsedTextUnit(value: unknown): value is ParsedTextUnit {
  if (typeof value !== "object" || value === null) return false;
  const unit = value as Record<string, unknown>;
  return (
    typeof unit.locator === "string" &&
    typeof unit.text === "string" &&
    typeof unit.partial === "boolean" &&
    (unit.embeddedImagePaths === undefined ||
      (Array.isArray(unit.embeddedImagePaths) &&
        unit.embeddedImagePaths.every((path: unknown) => typeof path === "string"))) &&
    (unit.visualGaps === undefined ||
      (Array.isArray(unit.visualGaps) &&
        unit.visualGaps.every((gap: unknown) => typeof gap === "string")))
  );
}
