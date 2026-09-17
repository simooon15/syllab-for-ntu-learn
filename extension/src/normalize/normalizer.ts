import type { NormalizedBatch, NormalizedUnit, RawSourceUnit } from "./domain";

function hex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function normalizeEvidenceText(text: string): string {
  const withoutMarkup = /<\/?[a-z][\s\S]*>/i.test(text)
    ? text
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/tr>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
    : text;
  return withoutMarkup
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\u00a0", " ")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return hex(new Uint8Array(digest));
}

export async function normalizeSourceUnits(
  rawUnits: readonly RawSourceUnit[]
): Promise<NormalizedUnit[]> {
  const firstByHash = new Map<string, string>();
  const output: NormalizedUnit[] = [];
  for (const raw of rawUnits) {
    const text = normalizeEvidenceText(raw.text);
    const contentHash = await sha256(text);
    const unitId = `${raw.sourceId}:${raw.locator}`;
    const duplicateOfUnitId = firstByHash.get(contentHash);
    if (!duplicateOfUnitId) firstByHash.set(contentHash, unitId);
    output.push({
      ...raw,
      text,
      unitId,
      contentHash,
      ...(duplicateOfUnitId ? { duplicateOfUnitId } : {})
    });
  }
  return output;
}

export function createNormalizedBatches(
  units: readonly NormalizedUnit[],
  maxCharacters = 24_000
): NormalizedBatch[] {
  if (!Number.isSafeInteger(maxCharacters) || maxCharacters < 1) {
    throw new Error("Batch character limit must be a positive safe integer");
  }
  const batches: NormalizedBatch[] = [];
  let current: NormalizedBatch | null = null;
  for (const unit of units) {
    if (unit.text.length > maxCharacters)
      throw new Error(`NORMALIZED_UNIT_TOO_LARGE:${unit.unitId}`);
    const mustStart =
      !current ||
      current.sourceId !== unit.sourceId ||
      current.characterCount + unit.text.length > maxCharacters;
    if (mustStart) {
      current = {
        batchId: `${unit.sourceId}:batch:${String(batches.filter((b) => b.sourceId === unit.sourceId).length + 1)}`,
        sourceId: unit.sourceId,
        units: [],
        characterCount: 0
      };
      batches.push(current);
    }
    const activeBatch = current;
    if (!activeBatch) throw new Error("Normalized batch state is unavailable");
    activeBatch.units.push(unit);
    activeBatch.characterCount += unit.text.length;
  }
  return batches;
}
