import { OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { pdfVisualGaps, parsePdf } from "./pdf-parser";
const view = [0, 0, 612, 792];
const rectangle = [0, 0, 0, 1, 612, 0, 1, 612, 792, 1, 0, 792, 4];
function pdf(stream: string): Uint8Array {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${String(stream.length)} >>\nstream\n${stream}\nendstream`
  ];
  let value = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const [i, obj] of objs.entries()) {
    offsets.push(value.length);
    value += `${String(i + 1)} 0 obj\n${obj}\nendobj\n`;
  }
  const xref = value.length;
  value += `xref\n0 6\n0000000000 65535 f \n${offsets.map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${String(xref)}\n%%EOF`;
  return new TextEncoder().encode(value);
}
describe("PDF mechanical visual coverage", () => {
  it("does not send native-text pages to Vision just because page background or clipping paths exist", async () => {
    const units = await parsePdf(
      pdf(
        "0.9 g 0 0 612 792 re f 0 0 612 792 re W n BT /F1 12 Tf 72 720 Td (Assessment due Friday) Tj ET"
      )
    );
    expect(units).toMatchObject([
      { locator: "page:1", text: "Assessment due Friday", partial: false }
    ]);
    expect(
      pdfVisualGaps(
        {
          fnArray: [OPS.constructPath],
          argsArray: [[OPS.fill, [new Float32Array(rectangle)], view]]
        },
        view,
        true
      )
    ).toEqual([]);
  });
  it("keeps transformed or patterned rectangles and text-covering overlays unresolved", () => {
    for (const operation of [OPS.transform, OPS.setFillColorN, OPS.showText]) {
      const args = operation === OPS.transform ? [2, 0, 0, 2, 0, 0] : [];
      expect(
        pdfVisualGaps(
          {
            fnArray: [operation, OPS.constructPath],
            argsArray: [args, [OPS.fill, [rectangle], view]]
          },
          view,
          true
        )
      ).toEqual(["unresolved-vector-region"]);
    }
  });
  it("keeps unknown diagrams and shading Partial without inventing a semantic result", () => {
    expect(
      pdfVisualGaps(
        {
          fnArray: [OPS.constructPath, OPS.shadingFill],
          argsArray: [[OPS.stroke, [[0, 10, 10, 1, 50, 60]], [10, 10, 50, 60]], []]
        },
        view,
        true
      )
    ).toEqual(["unresolved-vector-region", "unresolved-shading-region"]);
  });
  it("keeps image-only and mixed image regions as gaps including repeated images", () => {
    expect(
      pdfVisualGaps({ fnArray: [OPS.paintImageXObjectRepeat], argsArray: [[]] }, view, false)
    ).toEqual(["no-native-text", "unrepresented-image-region"]);
    expect(
      pdfVisualGaps({ fnArray: [OPS.paintImageXObject], argsArray: [[]] }, view, true)
    ).toEqual(["unrepresented-image-region"]);
  });
  it("does not equate an arbitrary rectangle with a decorative full-page background", () => {
    expect(
      pdfVisualGaps(
        { fnArray: [OPS.constructPath], argsArray: [[OPS.fill, [rectangle], [10, 10, 200, 200]]] },
        view,
        true
      )
    ).toEqual(["unresolved-vector-region"]);
  });
});
