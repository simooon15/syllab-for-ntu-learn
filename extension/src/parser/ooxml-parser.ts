import { strFromU8, unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

import type { ParsedTextUnit } from "./domain";

function unpack(bytes: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(bytes);
}

const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false });
const objectParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

function collectText(nodes: unknown, element: string, output: string[]): void {
  if (Array.isArray(nodes)) {
    for (const node of nodes) collectText(node, element, output);
    return;
  }
  if (typeof nodes !== "object" || nodes === null) return;
  for (const [key, value] of Object.entries(nodes)) {
    if (key === element && Array.isArray(value)) {
      for (const child of value) {
        if (typeof child === "object" && child !== null && "#text" in child) {
          const text: unknown = (child as Record<string, unknown>)["#text"];
          if (typeof text === "string" || typeof text === "number") output.push(String(text));
        }
      }
    } else collectText(value, element, output);
  }
}

function textOf(nodes: unknown, element: string): string {
  const text: string[] = [];
  collectText(nodes, element, text);
  return text.join(" ").replace(/\s+/g, " ").trim();
}

function asArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

/** Resolve only package-local relationship targets. No URL is followed by the parser. */
function relationships(archive: Record<string, Uint8Array>, path: string, base: string) {
  const xml = archive[path];
  const result = new Map<string, string>();
  if (!xml) return result;
  const root = objectParser.parse(strFromU8(xml)) as {
    Relationships?: { Relationship?: Array<{ Id: string; Target: string; TargetMode?: string }> };
  };
  for (const relation of asArray(root.Relationships?.Relationship)) {
    if (relation.TargetMode === "External" || !relation.Target || /[?#:]/.test(relation.Target))
      continue;
    const segments: string[] = [];
    for (const part of (relation.Target.startsWith("/")
      ? relation.Target
      : `${base}/${relation.Target}`
    ).split("/")) {
      if (part === "..") segments.pop();
      else if (part && part !== ".") segments.push(part);
    }
    result.set(relation.Id, segments.join("/"));
  }
  return result;
}

function naturalNumber(path: string): number {
  return Number(path.match(/(\d+)\.xml$/)?.[1] ?? Number.MAX_SAFE_INTEGER);
}

export function parsePptx(bytes: Uint8Array): ParsedTextUnit[] {
  const archive = unpack(bytes);
  const presentation = archive["ppt/presentation.xml"];
  const rels = relationships(archive, "ppt/_rels/presentation.xml.rels", "ppt");
  const ordered = presentation
    ? asArray(
        (
          objectParser.parse(strFromU8(presentation)) as {
            "p:presentation"?: { "p:sldIdLst"?: { "p:sldId"?: Array<{ "r:id": string }> } };
          }
        )["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"]
      ).map((slide) => rels.get(slide["r:id"]))
    : Object.keys(archive)
        .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
        .sort((a, b) => naturalNumber(a) - naturalNumber(b));
  return ordered.map((path, index) => {
    const slide = path ? archive[path] : undefined;
    if (!slide || !path) throw new Error("PPTX_SLIDE_MISSING");
    const xml = strFromU8(slide);
    const notesRels = relationships(
      archive,
      path.replace("/slides/", "/slides/_rels/") + ".rels",
      "ppt/slides"
    );
    const notesPath = [...notesRels.values()].find((target) =>
      target.startsWith("ppt/notesSlides/")
    );
    const notes = notesPath ? archive[notesPath] : undefined;
    const slideNodes = parser.parse(xml) as unknown;
    const tables = findChildren(slideNodes, "a:tbl");
    const cells = tables.flatMap((table, tableIndex) =>
      findChildren(table, "a:tr").flatMap((row, rowIndex) =>
        findChildren(row, "a:tc").map((cell, cellIndex) => ({
          reference: `table:${String(tableIndex + 1)}:row:${String(rowIndex + 1)}:cell:${String(cellIndex + 1)}`,
          value: textOf(cell, "a:t")
        }))
      )
    );
    const text = [
      textOf(slideNodes, "a:t"),
      notes ? textOf(parser.parse(strFromU8(notes)), "a:t") : ""
    ]
      .filter(Boolean)
      .join("\nNotes: ");
    const visualGaps = [
      ...(/<p:pic\b/.test(xml) ? ["embedded-image"] : []),
      ...(/<(?:c:chart|dgm:relIds)\b/.test(xml) ? ["chart-or-diagram"] : []),
      ...(/<(?:a:custGeom|p:oleObj)\b/.test(xml) ? ["drawing-or-object"] : [])
    ];
    return {
      locator: `slide:${String(index + 1)}`,
      kind: "slide",
      ...(cells.length ? { cells } : {}),
      text,
      partial: visualGaps.length > 0,
      ...(visualGaps.length ? { visualGaps } : {})
    };
  });
}

function findChildren(nodes: unknown, element: string): unknown[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap((node: unknown) => {
    if (typeof node !== "object" || node === null) return [];
    const entries = Object.entries(node as Record<string, unknown>);
    return entries.flatMap(([key, value]) =>
      key === element ? [value] : findChildren(value, element)
    );
  });
}

/** Body order, paragraph runs and table row/cell boundaries remain native locators. */
export function parseDocx(bytes: Uint8Array): ParsedTextUnit[] {
  const archive = unpack(bytes);
  const document = archive["word/document.xml"];
  if (!document) throw new Error("DOCX_DOCUMENT_MISSING");
  const body = findChildren(parser.parse(strFromU8(document)), "w:body")[0];
  if (!Array.isArray(body)) throw new Error("DOCX_BODY_MISSING");
  const units: ParsedTextUnit[] = [];
  const imageRels = relationships(archive, "word/_rels/document.xml.rels", "word");
  const images = (encoded: string): string[] =>
    [...encoded.matchAll(/"(?:@_)?r:embed":"([^"]+)"/g)].flatMap((match) => {
      const path = imageRels.get(match[1] ?? "");
      return path ? [path] : [];
    });
  let paragraph = 0;
  let table = 0;
  let section: string | undefined;
  for (const node of body as Array<Record<string, unknown>>) {
    if (node["w:p"]) {
      paragraph += 1;
      const text = textOf(node["w:p"], "w:t");
      const encoded = JSON.stringify(node["w:p"]);
      if (/Heading[1-9]/i.test(encoded) && text) section = text;
      const visualGaps = [
        ...(/w:drawing|w:pict/.test(encoded) ? ["embedded-image"] : []),
        ...(/c:chart|dgm:relIds/.test(encoded) ? ["chart-or-diagram"] : []),
        ...(/m:oMath/.test(encoded) ? ["equation"] : [])
      ];
      const embedded = images(encoded);
      units.push({
        locator: `paragraph:${String(paragraph)}`,
        kind: "paragraph",
        text,
        partial: visualGaps.length > 0,
        ...(embedded.length ? { embeddedImagePaths: embedded } : {}),
        ...(section ? { section } : {}),
        ...(visualGaps.length ? { visualGaps } : {})
      });
    } else if (node["w:tbl"]) {
      table += 1;
      const rows = findChildren(node["w:tbl"], "w:tr");
      const text = rows
        .map((row) =>
          findChildren(row, "w:tc")
            .map((cell) => textOf(cell, "w:t"))
            .join(" | ")
        )
        .join("\n");
      const encoded = JSON.stringify(node);
      const visualGaps = [
        ...(/w:drawing|w:pict/.test(encoded) ? ["embedded-image"] : []),
        ...(/c:chart|dgm:relIds/.test(encoded) ? ["chart-or-diagram"] : []),
        ...(/m:oMath/.test(encoded) ? ["equation"] : [])
      ];
      const cells = rows.flatMap((row, rowIndex) =>
        findChildren(row, "w:tc").map((cell, cellIndex) => ({
          reference: `row:${String(rowIndex + 1)}:cell:${String(cellIndex + 1)}`,
          value: textOf(cell, "w:t")
        }))
      );
      const embedded = images(encoded);
      units.push({
        locator: `table:${String(table)}`,
        kind: "table",
        cells,
        text,
        partial: visualGaps.length > 0,
        ...(embedded.length ? { embeddedImagePaths: embedded } : {}),
        ...(section ? { section } : {}),
        ...(visualGaps.length ? { visualGaps } : {})
      });
    }
  }
  // Headers/footers are course evidence too, but do not perturb body paragraph numbering.
  for (const path of Object.keys(archive)
    .filter((path) => /^word\/(?:header|footer)\d+\.xml$/.test(path))
    .sort((left, right) => {
      const leftKind = left.startsWith("word/header") ? 0 : 1;
      const rightKind = right.startsWith("word/header") ? 0 : 1;
      if (leftKind !== rightKind) return leftKind - rightKind;
      return naturalNumber(left) - naturalNumber(right);
    })) {
    const xml = strFromU8(archive[path] ?? new Uint8Array());
    const text = textOf(parser.parse(xml), "w:t");
    const hasVisual = /<(?:w:drawing|w:pict|m:oMath)\b/.test(xml);
    if (text || hasVisual)
      units.push({
        locator: `section:${path.slice(5, -4)}`,
        kind: "paragraph",
        text,
        partial: hasVisual,
        ...(hasVisual ? { visualGaps: ["header-footer-object"] } : {})
      });
  }
  return units;
}

function collectObjectText(value: unknown, output: string[]): void {
  if (typeof value === "string" || typeof value === "number") output.push(String(value));
  else if (Array.isArray(value)) for (const item of value) collectObjectText(item, output);
  else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value))
      if (key === "t" || key === "r") collectObjectText(item, output);
  }
}

/** Preserve workbook sheet identity, formulas, cached values and merged ranges without evaluation. */
export function parseXlsx(bytes: Uint8Array): ParsedTextUnit[] {
  const archive = unpack(bytes);
  const shared: string[] = [];
  const sharedXml = archive["xl/sharedStrings.xml"];
  if (sharedXml) {
    const parsed = objectParser.parse(strFromU8(sharedXml)) as { sst?: { si?: unknown } };
    for (const item of asArray(parsed.sst?.si)) {
      const text: string[] = [];
      collectObjectText(item, text);
      shared.push(text.join(" ").replace(/\s+/g, " ").trim());
    }
  }
  const workbook = archive["xl/workbook.xml"];
  const rels = relationships(archive, "xl/_rels/workbook.xml.rels", "xl");
  const sheets = workbook
    ? asArray(
        (
          objectParser.parse(strFromU8(workbook)) as {
            workbook?: { sheets?: { sheet?: Array<{ name: string; "r:id": string }> } };
          }
        ).workbook?.sheets?.sheet
      ).map((sheet) => ({ path: rels.get(sheet["r:id"]), name: sheet.name }))
    : Object.keys(archive)
        .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
        .sort((a, b) => naturalNumber(a) - naturalNumber(b))
        .map((path) => ({ path, name: undefined }));
  return sheets.flatMap(({ path, name }, sheetIndex) => {
    const sheet = path ? archive[path] : undefined;
    if (!sheet || !path) throw new Error("XLSX_SHEET_MISSING");
    const xml = strFromU8(sheet);
    const parsed = objectParser.parse(xml) as {
      worksheet?: {
        sheetData?: { row?: unknown };
        mergeCells?: { mergeCell?: Array<{ ref: string }> };
      };
    };
    const mergedRanges = asArray(parsed.worksheet?.mergeCells?.mergeCell).map((cell) => cell.ref);
    const visualGaps = /<(?:drawing|legacyDrawing)\b/.test(xml) ? ["drawing-or-chart"] : [];
    const rows = asArray(parsed.worksheet?.sheetData?.row).map((unknownRow, rowIndex) => {
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
          const parts: string[] = [];
          collectObjectText(cell.is, parts);
          value = parts.join(" ").replace(/\s+/g, " ").trim();
        }
        const rawFormula =
          typeof cell.f === "object" && cell.f !== null && "#text" in cell.f
            ? (cell.f as Record<string, unknown>)["#text"]
            : cell.f;
        const formulaText =
          typeof rawFormula === "string" || typeof rawFormula === "number"
            ? String(rawFormula)
            : undefined;
        const formula = formulaText !== undefined && formulaText !== "" ? formulaText : undefined;
        return value === "" && formula === undefined
          ? []
          : [{ reference, value, ...(formula === undefined ? {} : { formula }) }];
      });
      return {
        locator: `sheet:${String(sheetIndex + 1)}:row:${String(row.r ?? rowIndex + 1)}`,
        kind: "row" as const,
        text: cells
          .map(
            (cell) =>
              `${cell.reference}: ${cell.value}${cell.formula === undefined ? "" : ` [formula: ${cell.formula}]`}`
          )
          .join(" | "),
        cells,
        ...(name ? { sheetName: name } : {}),
        ...(mergedRanges.length ? { mergedRanges } : {}),
        partial: false
      };
    });
    if (rows.some((row) => row.cells.some((cell) => cell.formula !== undefined && !cell.value)))
      visualGaps.push("formula-without-cached-value");
    const native: ParsedTextUnit[] = rows.length
      ? rows
      : [
          {
            locator: `sheet:${String(sheetIndex + 1)}`,
            kind: "row",
            text: "",
            partial: false,
            ...(name ? { sheetName: name } : {})
          }
        ];
    const sheetRelations = relationships(
      archive,
      path.replace("/worksheets/", "/worksheets/_rels/") + ".rels",
      "xl/worksheets"
    );
    for (const tablePath of sheetRelations.values()) {
      if (!/^xl\/tables\/[^/]+\.xml$/.test(tablePath)) continue;
      const tableBytes = archive[tablePath];
      if (!tableBytes) throw new Error("XLSX_TABLE_MISSING");
      const table = (
        objectParser.parse(strFromU8(tableBytes)) as {
          table?: {
            name?: string;
            displayName?: string;
            ref?: string;
            tableColumns?: { tableColumn?: Array<{ name: string }> };
          };
        }
      ).table;
      if (!table?.ref) continue;
      const tableName = table.displayName ?? table.name ?? tablePath;
      native.push({
        locator: `sheet:${String(sheetIndex + 1)}:table:${tableName}:range:${table.ref}`,
        kind: "table",
        text: `${tableName} [${table.ref}]\n${asArray(table.tableColumns?.tableColumn)
          .map((column) => column.name)
          .join(" | ")}`,
        partial: false,
        ...(name ? { sheetName: name } : {})
      });
    }
    if (visualGaps.length)
      native.push({
        locator: `sheet:${String(sheetIndex + 1)}:visual`,
        kind: "table",
        text: "",
        partial: true,
        visualGaps,
        ...(name ? { sheetName: name } : {})
      });
    return native;
  });
}
