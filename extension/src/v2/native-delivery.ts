import { sourceUnits } from "./course-read";
import type { SourceRecord } from "./schema";

const MASK = "[REDACTED_ACCESS_SECRET]";
/** Credential suppression only; does not decide relevance, obligation, dates or identity. */
export function suppressAccessSecrets(text: string): string {
  return text
    .replace(
      /\b(?:fileLocation|requestUrl|signedUrl)\s*["']?\s*[:=]\s*([^\r\n]+)/gi,
      (match: string, value: string) => (/^(?:null|none|false)$/i.test(value.trim()) ? match : MASK)
    )
    .replace(
      /\b(?:password|passcode|access[\s_-]?code|api[\s_-]?key|authorization|cookie|session[\s_-]?token|client[\s_-]?secret)\s*[:=-]\s*[^\r\n]*/gi,
      MASK
    )
    .replace(/\bBearer\s+[\w.~+/-]+=*/gi, MASK)
    .replace(/(https?:\/\/)[^\s/]+:[^\s/@]+@/gi, `$1${MASK}@`)
    .replace(/([?&](?:token|api_key|access_token|sessionid|password)=)[^&#\s"'<>]+/gi, `$1${MASK}`);
}

/** A masked unit is explicitly Partial. Original local Sources remain untouched. */
export function nativeDeliverySource(source: SourceRecord): SourceRecord {
  if (!source.parsed) return { ...source, title: suppressAccessSecrets(source.title) };
  const units = sourceUnits(source).map((unit) => {
    const text = suppressAccessSecrets(unit.text);
    const cells = unit.cells?.map((cell) => ({
      ...cell,
      value: suppressAccessSecrets(cell.value),
      ...(cell.formula ? { formula: suppressAccessSecrets(cell.formula) } : {})
    }));
    return {
      ...unit,
      text,
      ...(text !== unit.text || JSON.stringify(cells) !== JSON.stringify(unit.cells)
        ? { partial: true }
        : {}),
      ...(cells ? { cells } : {})
    };
  });
  return {
    ...source,
    title: suppressAccessSecrets(source.title),
    parsed: {
      ...source.parsed,
      text: suppressAccessSecrets(source.parsed.text),
      structure: source.parsed.structure.map(suppressAccessSecrets),
      units
    }
  };
}
