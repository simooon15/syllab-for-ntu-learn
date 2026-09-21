export type DocumentFormat =
  "pdf" | "pptx" | "docx" | "xlsx" | "legacy-ppt" | "legacy-doc" | "unsupported";

export interface ParsedTextUnit {
  locator: string;
  text: string;
  partial: boolean;
}

export interface ParseResult {
  format: DocumentFormat;
  status: "parsed" | "partial" | "unsupported" | "failed";
  units: ParsedTextUnit[];
  diagnosticsCode?: string;
}

export interface ParserLimits {
  maxBytes: number;
  maxUnits: number;
  maxTextCharacters: number;
}

export const DEFAULT_PARSER_LIMITS: ParserLimits = {
  maxBytes: 64 * 1024 * 1024,
  maxUnits: 500,
  maxTextCharacters: 2_000_000
};
