import { strFromU8, unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

import type { ParsedTextUnit } from "./domain";

const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false });

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
