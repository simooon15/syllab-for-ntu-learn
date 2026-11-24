import { getDocument, GlobalWorkerOptions, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

import type { ParsedTextUnit } from "./domain";

export function configurePdfWorker(workerSrc: string): void {
  GlobalWorkerOptions.workerSrc = workerSrc;
}

export async function parsePdf(bytes: Uint8Array): Promise<ParsedTextUnit[]> {
  const task = getDocument({ data: bytes.slice(), useSystemFonts: true, useWorkerFetch: false });
  try {
    const document = await task.promise;
    const units: ParsedTextUnit[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = "";
      const textRanges: NonNullable<ParsedTextUnit["textRanges"]> = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const value = item.str.replace(/\s+/g, " ").trim();
        if (!value) continue;
        if (text) text += " ";
        const start = text.length;
        text += value;
        textRanges.push({
          start,
          end: text.length,
          x: item.transform[4] as number,
          y: item.transform[5] as number,
          width: item.width,
          height: item.height
        });
      }
      const operators = await page.getOperatorList();
      const visualGaps = pdfVisualGaps(operators, page.view, text.length > 0);
      units.push({
        locator: `page:${String(pageNumber)}`,
        text,
        textRanges,
        partial: text.length === 0 || visualGaps.length > 0,
        ...(visualGaps.length ? { visualGaps } : {})
      });
      page.cleanup();
    }
    await document.cleanup();
    return units;
  } finally {
    await task.destroy();
  }
}

/** Mechanical coverage, not local visual semantics. Only provably non-information-bearing
 * clipping / unpainted paths and exact page-boundary backgrounds are dismissed. Unknown painted
 * geometry stays explicit Partial, rather than claiming every drawing proves missing semantics. */
export function pdfVisualGaps(
  operators: { fnArray: number[]; argsArray: unknown[][] },
  pageView: number[],
  hasText: boolean
): string[] {
  const gaps = new Set<string>();
  let transformed = false;
  let patternedFill = false;
  let textPainted = false;
  const stateStack: Array<{ transformed: boolean; patternedFill: boolean }> = [];
  if (!hasText) gaps.add("no-native-text");
  const imageOps = [
    OPS.paintImageXObject,
    OPS.paintInlineImageXObject,
    OPS.paintImageMaskXObject,
    OPS.paintInlineImageXObjectGroup,
    OPS.paintImageXObjectRepeat,
    OPS.paintImageMaskXObjectRepeat
  ];
  for (const [index, operation] of operators.fnArray.entries()) {
    if (operation === OPS.save) stateStack.push({ transformed, patternedFill });
    if (operation === OPS.restore) {
      const restored = stateStack.pop();
      if (restored) {
        transformed = restored.transformed;
        patternedFill = restored.patternedFill;
      } else {
        transformed = true;
        patternedFill = true;
      }
    }
    if (operation === OPS.transform) {
      const matrix = operators.argsArray[index] ?? [];
      if (matrix.some((n, i) => n !== [1, 0, 0, 1, 0, 0][i])) transformed = true;
    }
    if (operation === OPS.setFillColorN) patternedFill = true;
    if ([OPS.setFillRGBColor, OPS.setFillGray, OPS.setFillCMYKColor].includes(operation))
      patternedFill = false;
    if (
      [
        OPS.showText,
        OPS.showSpacedText,
        OPS.nextLineShowText,
        OPS.nextLineSetSpacingShowText
      ].includes(operation)
    )
      textPainted = true;
    if (operation === OPS.rawFillPath) gaps.add("unresolved-vector-region");

    if (imageOps.includes(operation)) gaps.add("unrepresented-image-region");
    if (operation === OPS.shadingFill) gaps.add("unresolved-shading-region");
    if (operation !== OPS.constructPath) continue;
    const args = operators.argsArray[index] ?? [];
    const paint = args[0];
    if (paint === OPS.endPath || paint === OPS.clip || paint === OPS.eoClip) continue; // clipping is not painted semantic content
    const data = args[1];
    const path: unknown = Array.isArray(data) ? data[0] : undefined;
    const commands =
      Array.isArray(path) || ArrayBuffer.isView(path) ? Array.from(path as ArrayLike<number>) : [];
    const bounds = args[2];
    // PDF.js 6 DrawOPS rectangle: M x0 y0 L x1 y0 L x1 y1 L x0 y1 Z.
    const rectangle =
      commands.length === 13 &&
      commands[0] === 0 &&
      commands[3] === 1 &&
      commands[6] === 1 &&
      commands[9] === 1 &&
      commands[12] === 4 &&
      commands[2] === commands[5] &&
      commands[4] === commands[7] &&
      commands[8] === commands[11] &&
      commands[10] === commands[1];
    const box =
      Array.isArray(bounds) || ArrayBuffer.isView(bounds)
        ? Array.from(bounds as ArrayLike<number>)
        : [];
    const pageBoundary =
      rectangle && box.length === pageView.length && box.every((n, i) => n === pageView[i]);
    const simplePaint =
      paint === OPS.stroke ||
      paint === OPS.closeStroke ||
      (!patternedFill && !textPainted && [OPS.fill, OPS.eoFill].includes(paint as number));
    if (pageBoundary && !transformed && simplePaint) continue;
    gaps.add("unresolved-vector-region");
  }
  return [...gaps];
}
