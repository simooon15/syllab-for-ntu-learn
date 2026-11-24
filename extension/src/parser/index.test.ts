import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { detectDocumentFormat } from "./format-detector";
import { parseDocument } from "./index";

function makePdf(pageTexts: string[]): Uint8Array {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageTexts.map((_, index) => `${String(3 + index)} 0 R`).join(" ")}] /Count ${String(pageTexts.length)} >>`
  ];
  const fontObject = 3 + pageTexts.length;
  const firstStreamObject = fontObject + 1;
  for (const [index] of pageTexts.entries()) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${String(fontObject)} 0 R >> >> /Contents ${String(firstStreamObject + index)} 0 R >>`
    );
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  for (const text of pageTexts) {
    const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
    objects.push(`<< /Length ${String(stream.length)} >>\nstream\n${stream}\nendstream`);
  }
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${String(index + 1)} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xref)}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function makePptx(): Uint8Array {
  return zipSync({
    "[Content_Types].xml": strToU8(
      '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>'
    ),
    "ppt/slides/slide2.xml": strToU8("<p:sld><a:t>Second</a:t></p:sld>"),
    "ppt/slides/slide1.xml": strToU8("<p:sld><a:t>First</a:t><a:t>slide</a:t></p:sld>")
  });
}

function makeDocx(): Uint8Array {
  return zipSync({
    "[Content_Types].xml": strToU8(
      '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    ),
    "word/document.xml": strToU8(
      "<w:document><w:body><w:p><w:r><w:t>First paragraph</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell text</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>"
    )
  });
}

function makeXlsx(): Uint8Array {
  return zipSync({
    "[Content_Types].xml": strToU8(
      '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>'
    ),
    "xl/sharedStrings.xml": strToU8(
      "<sst><si><t>Assessment</t></si><si><r><t>Due </t></r><r><t>date</t></r></si></sst>"
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Weight</t></is></c><c r="C1"><v>25</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c></row></sheetData></worksheet>'
    )
  });
}

describe("document parser", () => {
  it("extracts PDF text in page order with locators", async () => {
    const result = await parseDocument(makePdf(["First page", "Second page"]));
    expect(result).toMatchObject({ format: "pdf", status: "parsed" });
    expect(result.units).toMatchObject([
      { locator: "page:1", text: "First page", partial: false },
      { locator: "page:2", text: "Second page", partial: false }
    ]);
  });

  it("extracts PPTX slides and DOCX paragraphs in document order", async () => {
    await expect(parseDocument(makePptx())).resolves.toMatchObject({
      format: "pptx",
      units: [
        { locator: "slide:1", text: "First slide" },
        { locator: "slide:2", text: "Second" }
      ]
    });
    await expect(parseDocument(makeDocx())).resolves.toMatchObject({
      format: "docx",
      units: [
        { locator: "paragraph:1", text: "First paragraph" },
        { locator: "table:1", text: "Cell text" }
      ]
    });
  });

  it("extracts every populated XLSX cell with sheet and row locators", async () => {
    await expect(parseDocument(makeXlsx())).resolves.toMatchObject({
      format: "xlsx",
      status: "parsed",
      units: [
        { locator: "sheet:1:row:1", text: "A1: Assessment | B1: Weight | C1: 25" },
        { locator: "sheet:1:row:2", text: "A2: Due date" }
      ]
    });
  });

  it("detects legacy Office and rejects unsupported or oversized input", async () => {
    const ole = new Uint8Array(64);
    ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    ole.set(new TextEncoder().encode("WordDocument"), 16);
    expect(detectDocumentFormat(ole)).toBe("legacy-doc");
    await expect(parseDocument(ole)).resolves.toMatchObject({
      status: "unsupported",
      diagnosticsCode: "LEGACY_OFFICE"
    });
    await expect(
      parseDocument(new Uint8Array(9), { maxBytes: 8, maxUnits: 1, maxTextCharacters: 1 })
    ).resolves.toMatchObject({ status: "failed", diagnosticsCode: "SIZE_LIMIT" });
  });

  it("uses presentation relationships instead of slide filenames and keeps visual gaps partial", async () => {
    const result = await parseDocument(
      zipSync({
        "[Content_Types].xml": strToU8("<Types>presentationml</Types>"),
        "ppt/presentation.xml": strToU8(
          '<p:presentation><p:sldIdLst><p:sldId r:id="second"/><p:sldId r:id="first"/></p:sldIdLst></p:presentation>'
        ),
        "ppt/_rels/presentation.xml.rels": strToU8(
          '<Relationships><Relationship Id="first" Target="slides/slide1.xml"/><Relationship Id="second" Target="slides/slide2.xml"/></Relationships>'
        ),
        "ppt/slides/slide1.xml": strToU8("<p:sld><a:t>First file</a:t></p:sld>"),
        "ppt/slides/slide2.xml": strToU8("<p:sld><a:t>Second file</a:t><p:pic/></p:sld>")
      })
    );
    expect(result.status).toBe("partial");
    expect(result.units[0]).toMatchObject({
      locator: "slide:1",
      text: "Second file",
      partial: true
    });
    expect(result.units[1]?.text).toBe("First file");
  });

  it("retains DOCX image relationships at the original paragraph locator", async () => {
    const result = await parseDocument(
      zipSync({
        "[Content_Types].xml": strToU8("<Types>wordprocessingml</Types>"),
        "word/document.xml": strToU8(
          '<w:document><w:body><w:p><w:drawing><a:blip r:embed="image1"/></w:drawing></w:p></w:body></w:document>'
        ),
        "word/_rels/document.xml.rels": strToU8(
          '<Relationships><Relationship Id="image1" Target="media/image1.png"/><Relationship Id="remote" Target="https://invalid.example/image" TargetMode="External"/></Relationships>'
        )
      })
    );
    expect(result).toMatchObject({
      status: "partial",
      units: [
        { locator: "paragraph:1", partial: true, embeddedImagePaths: ["word/media/image1.png"] }
      ]
    });
  });

  it("does not repeat a spreadsheet drawing for each native row", async () => {
    const result = await parseDocument(
      zipSync({
        "[Content_Types].xml": strToU8("<Types>spreadsheetml</Types>"),
        "xl/worksheets/sheet1.xml": strToU8(
          '<worksheet><sheetData><row r="1"><c r="A1"><v>10</v></c></row><row r="2"><c r="A2"><v>20</v></c></row></sheetData><drawing r:id="drawing1"/></worksheet>'
        )
      })
    );
    expect(result.status).toBe("partial");
    expect(result.units.filter((unit) => unit.partial)).toMatchObject([
      { locator: "sheet:1:visual" }
    ]);
    expect(result.units.slice(0, 2).every((unit) => !unit.partial)).toBe(true);
  });

  it("retains native table cell boundaries and marks uncached formulas unresolved", async () => {
    const doc = await parseDocument(makeDocx());
    expect(doc.units[1]?.cells).toEqual([{ reference: "row:1:cell:1", value: "Cell text" }]);
    const sheet = await parseDocument(
      zipSync({
        "[Content_Types].xml": strToU8("<Types>spreadsheetml</Types>"),
        "xl/worksheets/sheet1.xml": strToU8(
          '<worksheet><sheetData><row r="1"><c r="A1"><f>SUM(B1:B2)</f></c></row></sheetData></worksheet>'
        )
      })
    );
    expect(sheet.status).toBe("partial");
    expect(sheet.units).toContainEqual(
      expect.objectContaining({
        locator: "sheet:1:visual",
        partial: true,
        visualGaps: ["formula-without-cached-value"]
      })
    );
    expect(sheet.units[0]?.cells?.[0]).toMatchObject({ reference: "A1", formula: "SUM(B1:B2)" });
  });

  it("does not certify image-only header coverage as native complete", async () => {
    const result = await parseDocument(
      zipSync({
        "[Content_Types].xml": strToU8("<Types>wordprocessingml</Types>"),
        "word/document.xml": strToU8(
          "<w:document><w:body><w:p><w:r><w:t>Body</w:t></w:r></w:p></w:body></w:document>"
        ),
        "word/header1.xml": strToU8("<w:hdr><w:p><w:drawing/></w:p></w:hdr>")
      })
    );
    expect(result.status).toBe("partial");
    expect(result.units[1]).toMatchObject({ locator: "section:header1", partial: true });
  });

  it("isolates a damaged ZIP as one parsing failure", async () => {
    await expect(parseDocument(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).resolves.toMatchObject({
      status: "unsupported",
      diagnosticsCode: "UNSUPPORTED_FORMAT"
    });
  });
});

it("conserves all paragraphs and text beyond the old unit and text caps", async () => {
  const paragraphs = Array.from(
    { length: 601 },
    (_, n) => `paragraph-${String(n)} ${"x".repeat(3500)}`
  );
  const bytes = zipSync({
    "[Content_Types].xml": strToU8("<Types>wordprocessingml</Types>"),
    "word/document.xml": strToU8(
      `<w:document><w:body>${paragraphs.map((text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`
    )
  });
  const result = await parseDocument(bytes);
  expect(result.status).toBe("parsed");
  expect(result.units.map((unit) => unit.text)).toEqual(paragraphs);
  expect(new Set(result.units.map((unit) => unit.locator)).size).toBe(paragraphs.length);
});
