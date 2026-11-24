import { extractInIsolatedWorker } from "../parser/runtime";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

import type { DocumentFormat, ParsedTextUnit } from "../parser/domain";
import { withOffice } from "./office-runtime";

export interface VisualPart {
  locator: string;
  dataUrl: string;
}

/** Copy payload bytes, then explicitly release the bitmap backing store before hand-off. */
function snapshotCanvas(canvas: HTMLCanvasElement): string {
  try {
    return canvas.toDataURL("image/png");
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Rasterize only native units with an unresolved visual gap, never every text page by default. */
export async function visualCompletion(
  bytes: Uint8Array,
  format: DocumentFormat,
  units: ParsedTextUnit[]
): Promise<{ parts: VisualPart[]; unresolved: string[] }> {
  let gaps = units.filter((unit) => unit.partial && (unit.visualGaps?.length || !unit.text));
  if (!gaps.length) return { parts: [], unresolved: [] };
  const embeddedParts: VisualPart[] = [];
  if (format === "docx") {
    const wanted = new Set(gaps.flatMap((unit) => unit.embeddedImagePaths ?? []));
    const archive =
      wanted.size > 0
        ? await extractInIsolatedWorker(
            bytes,
            [...wanted],
            () => new Worker(chrome.runtime.getURL("parser-worker.js"))
          )
        : {};
    const completed = new Set<string>();
    for (const unit of gaps) {
      const paths = unit.embeddedImagePaths ?? [];
      if (!paths.length) continue;
      try {
        const images: VisualPart[] = [];
        for (const path of paths) {
          const data = archive[path];
          if (!data) throw new Error("IMAGE_MISSING");
          const bitmap = await createImageBitmap(new Blob([data.slice().buffer]));
          try {
            const scale = Math.min(1, 8192 / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.ceil(bitmap.width * scale));
            canvas.height = Math.max(1, Math.ceil(bitmap.height * scale));
            const context = canvas.getContext("2d");
            if (!context) throw new Error("IMAGE_CANVAS_MISSING");
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const dataUrl = snapshotCanvas(canvas);
            images.push({ locator: unit.locator, dataUrl });
          } finally {
            bitmap.close();
          }
        }
        embeddedParts.push(...images);
        if (unit.visualGaps?.every((gap) => gap === "embedded-image")) completed.add(unit.locator);
      } catch {
        /* Keep the native unit unresolved for deterministic page mapping below. */
      }
    }
    gaps = gaps.filter((unit) => !completed.has(unit.locator));
    if (!gaps.length) return { parts: embeddedParts, unresolved: [] };
  }
  if (format === "pptx" || format === "xlsx")
    return withOffice(async (office) => {
      const parts: VisualPart[] = [];
      const unresolved: string[] = [];
      const rendered = new Map<number, string>();
      for (const unit of gaps) {
        const match = unit.locator.match(
          format === "pptx" ? /^slide:(\d+)$/ : /^sheet:(\d+)(?::visual)?$/
        );
        if (!match) {
          unresolved.push(unit.locator);
          continue;
        }
        const index = Number(match[1]) - 1;
        try {
          let dataUrl = rendered.get(index);
          if (!dataUrl) {
            const page = await office.renderPageFullQuality(bytes, { inputFormat: format }, index, {
              dpi: 144,
              maxDimension: 8192
            });
            if (page.width < 1 || page.height < 1 || page.width > 8192 || page.height > 8192)
              throw new Error("VISUAL_DIMENSION_LIMIT");
            const canvas = document.createElement("canvas");
            canvas.width = page.width;
            canvas.height = page.height;
            try {
              const context = canvas.getContext("2d");
              if (!context) throw new Error("VISUAL_CANVAS_UNAVAILABLE");
              context.putImageData(
                new ImageData(new Uint8ClampedArray(page.data), page.width, page.height),
                0,
                0
              );
              dataUrl = snapshotCanvas(canvas);
            } finally {
              canvas.width = 0;
              canvas.height = 0;
            }
            rendered.set(index, dataUrl);
          }
          parts.push({ locator: unit.locator, dataUrl });
        } catch {
          unresolved.push(unit.locator);
        }
      }
      return { parts, unresolved };
    });
  const pdf =
    format === "pdf"
      ? bytes
      : await withOffice(
          async (office) =>
            (await office.convert(bytes, { outputFormat: "pdf" }, `source.${format}`)).data
        );
  GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf.worker.mjs");
  const task = getDocument({ data: pdf.slice(), useWorkerFetch: false, useSystemFonts: true });
  const parts: VisualPart[] = [...embeddedParts];
  const unresolved: string[] = [];
  try {
    const pdfDocument = await task.promise;
    const pageTexts: string[] = [];
    // Text only for deterministic DOCX locator mapping; this is not visual/model processing.
    if (format !== "pdf")
      for (let number = 1; number <= pdfDocument.numPages; number += 1) {
        const page = await pdfDocument.getPage(number);
        const content = await page.getTextContent();
        pageTexts.push(
          content.items
            .flatMap((item) => ("str" in item ? [item.str] : []))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        );
        page.cleanup();
      }
    const rendered = new Map<number, string>();
    for (const unit of gaps) {
      let number = format === "pdf" ? Number(unit.locator.match(/^page:(\d+)$/)?.[1]) : 0;
      if (format !== "pdf") {
        // A previous paragraph cannot prove which page a following image occupies.
        const anchor = unit.text.replace(/\s+/g, " ").trim();
        const matches = anchor
          ? pageTexts.flatMap((text, page) => (text.includes(anchor) ? [page + 1] : []))
          : [];
        if (matches.length === 1) number = matches[0] ?? 0;
      }
      if (!number || number > pdfDocument.numPages) {
        unresolved.push(unit.locator);
        continue;
      }
      let dataUrl = rendered.get(number);
      if (!dataUrl) {
        try {
          const page = await pdfDocument.getPage(number);
          const original = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: Math.min(2, 8192 / original.width, 8192 / original.height)
          });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          try {
            const context = canvas.getContext("2d");
            if (!context) throw new Error("VISUAL_CANVAS_UNAVAILABLE");
            const rendering = page.render({
              canvasContext: context,
              canvas,
              viewport,
              intent: "print"
            });
            try {
              await rendering.promise;
            } catch (error) {
              rendering.cancel();
              throw error;
            }
            dataUrl = snapshotCanvas(canvas);
          } finally {
            canvas.width = 0;
            canvas.height = 0;
            page.cleanup();
          }

          rendered.set(number, dataUrl);
        } catch {
          unresolved.push(unit.locator);
          continue;
        }
      }
      parts.push({ locator: unit.locator, dataUrl });
    }
    return { parts, unresolved };
  } finally {
    await task.destroy();
  }
}
