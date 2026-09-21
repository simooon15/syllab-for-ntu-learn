import { strFromU8, unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

import type { ParsedTextUnit } from "./domain";

const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false });
const objectParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

function collectText(nodes: unknown, textElement: "a:t" | "w:t", output: string[]): void {
  if (Array.isArray(nodes)) {
    for (const node of nodes) collectText(node, textElement, output);
    return;
  }
  if (typeof nodes !== "object" || nodes === null) return;
  for (const [key, value] of Object.entries(nodes)) {
    if (key === textElement && Array.isArray(value)) {
      for (const child of value) {
        if (typeof child === "object" && child !== null && "#text" in child) {
          const text = (child as { "#text": unknown })["#text"];
          if (typeof text === "string" || typeof text === "number") output.push(String(text));
        }
      }
    } else {
      collectText(value, textElement, output);
    }
  }
}

function naturalNumber(path: string): number {
  return Number(path.match(/(\d+)\.xml$/)?.[1] ?? Number.MAX_SAFE_INTEGER);
}

export function parsePptx(bytes: Uint8Array): ParsedTextUnit[] {
  const archive = unzipSync(bytes);
  return Object.keys(archive)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((left, right) => naturalNumber(left) - naturalNumber(right))
    .map((path, index) => {
      const text: string[] = [];
      const slide = archive[path];
      if (!slide) throw new Error("PPTX_SLIDE_MISSING");
      collectText(parser.parse(strFromU8(slide)), "a:t", text);
      return {
        locator: `slide:${String(index + 1)}`,
        text: text.join(" ").trim(),
        partial: text.length === 0
      };
    });
}

function collectParagraphs(nodes: unknown, output: string[]): void {
  if (Array.isArray(nodes)) {
    for (const node of nodes) collectParagraphs(node, output);
    return;
  }
  if (typeof nodes !== "object" || nodes === null) return;
  for (const [key, value] of Object.entries(nodes)) {
    if (key === "w:p") {
      const text: string[] = [];
      collectText(value, "w:t", text);
      output.push(text.join(" ").trim());
    } else {
      collectParagraphs(value, output);
    }
  }
}

export function parseDocx(bytes: Uint8Array): ParsedTextUnit[] {
  const archive = unzipSync(bytes);
  const document = archive["word/document.xml"];
  if (!document) throw new Error("DOCX_DOCUMENT_MISSING");
  const paragraphs: string[] = [];
  collectParagraphs(parser.parse(strFromU8(document)), paragraphs);
  return paragraphs.map((text, index) => ({
    locator: `paragraph:${String(index + 1)}`,
    text,
    partial: text.length === 0
  }));
}

function asArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function collectObjectText(value: unknown, output: string[]): void {
  if (typeof value === "string" || typeof value === "number") {
    output.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectObjectText(item, output);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, item] of Object.entries(value)) {
    if (key === "t") collectObjectText(item, output);
    else if (!key.startsWith("@_")) collectObjectText(item, output);
  }
}

function joinTextParts(parts: string[]): string {
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Mechanical XLSX extraction: every populated cell is retained with its native cell reference. */
export function parseXlsx(bytes: Uint8Array): ParsedTextUnit[] {
  const archive = unzipSync(bytes);
  const shared: string[] = [];
  const sharedXml = archive["xl/sharedStrings.xml"];
  if (sharedXml) {
    const parsed = objectParser.parse(strFromU8(sharedXml)) as {
      sst?: { si?: unknown };
    };
    for (const item of asArray(parsed.sst?.si)) {
      const text: string[] = [];
      collectObjectText(item, text);
      shared.push(joinTextParts(text));
    }
  }

  return Object.keys(archive)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
    .sort((left, right) => naturalNumber(left) - naturalNumber(right))
    .flatMap((path, sheetIndex) => {
      const sheet = archive[path];
      if (!sheet) throw new Error("XLSX_SHEET_MISSING");
      const parsed = objectParser.parse(strFromU8(sheet)) as {
        worksheet?: { sheetData?: { row?: unknown } };
      };
      return asArray(parsed.worksheet?.sheetData?.row).map((unknownRow, rowIndex) => {
        const row = unknownRow as {
          r?: string | number;
          c?: Array<Record<string, unknown>> | Record<string, unknown>;
        };
        const cells = asArray(row.c).flatMap((cell) => {
          const reference = typeof cell.r === "string" ? cell.r : "cell";
          const raw = cell.v;
          let value = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
          if (cell.t === "s" && value !== "") value = shared[Number(value)] ?? value;
          if (cell.t === "inlineStr") {
            const inline: string[] = [];
            collectObjectText(cell.is, inline);
            value = joinTextParts(inline);
          }
          return value === "" ? [] : [`${reference}: ${value}`];
        });
        return {
          locator: `sheet:${String(sheetIndex + 1)}:row:${String(row.r ?? rowIndex + 1)}`,
          text: cells.join(" | "),
          partial: cells.length === 0
        };
      });
    });
}
