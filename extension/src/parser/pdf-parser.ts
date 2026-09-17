import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

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
      const text = content.items
        .flatMap((item) => ("str" in item && typeof item.str === "string" ? [item.str] : []))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      units.push({ locator: `page:${String(pageNumber)}`, text, partial: text.length === 0 });
      page.cleanup();
    }
    await document.cleanup();
    return units;
  } finally {
    await task.destroy();
  }
}
