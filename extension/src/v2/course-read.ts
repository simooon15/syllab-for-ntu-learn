import { isRecord } from "@syllab/contracts";
import type { SourceRecord } from "./schema";
import type { AiEvidence } from "./ai-contracts";
import { ArchitectureError, digest } from "./architecture-session";
export interface ReadScope {
  sources: SourceRecord[];
  evidence: AiEvidence[];
  objects: Record<string, unknown>;
  rendered?: Set<string>;
}
export function sourceUnits(source: SourceRecord) {
  return source.parsed?.units?.length
    ? source.parsed.units
    : [{ locator: "native-text", text: source.parsed?.text ?? "", partial: false }];
}
export function sourceIndex(source: SourceRecord) {
  return {
    sourceId: source.sourceId,
    nativeItemId: source.nativeItemId,
    kind: source.kind,
    title: source.title,
    parentSourceId: source.parentSourceId ?? null,
    units: sourceUnits(source).map((unit) => ({
      locator: unit.locator,
      kind: unit.kind ?? null,
      characters: unit.text.length,
      partial: unit.partial,
      gaps: unit.visualGaps ?? [],
      section: unit.section ?? null,
      sheetName: unit.sheetName ?? null,
      cells: (unit.cells ?? []).map((cell) => ({
        reference: cell.reference,
        hasFormula: cell.formula !== undefined
      }))
    }))
  };
}
/** Native body is already the logical item; files bootstrap their first native unit, in order. */
export function bootstrap(source: SourceRecord) {
  const units = sourceUnits(source);
  const native = source.kind !== "attachment" && source.kind !== "file";
  const included = native ? units : units.slice(0, 1);
  return {
    index: sourceIndex(source),
    initialContent: included.map((unit) => ({
      locator: unit.locator,
      text: unit.text,
      cells: unit.cells ?? [],
      partial: unit.partial
    })),
    omittedLocators: units.slice(included.length).map((unit) => unit.locator),
    snapshot: digest(source.parsed)
  };
}
export function resolveReads(reads: unknown[], scope: ReadScope): unknown[] {
  return reads.map((raw, ordinal) => {
    if (!isRecord(raw) || typeof raw.kind !== "string") throw new ArchitectureError("READ_SHAPE");
    if (raw.kind === "object") {
      if (typeof raw.id !== "string" || !Object.hasOwn(scope.objects, raw.id))
        throw new ArchitectureError("READ_UNAUTHORIZED_OBJECT");
      return { ordinal, kind: raw.kind, id: raw.id, payload: scope.objects[raw.id] };
    }
    if (raw.kind === "evidence") {
      const evidence = scope.evidence.find((e) => e.evidenceId === raw.id);
      if (!evidence) throw new ArchitectureError("READ_UNAUTHORIZED_EVIDENCE");
      return { ordinal, kind: raw.kind, payload: evidence };
    }
    const source = scope.sources.find((s) => s.sourceId === raw.sourceId);
    if (!source) throw new ArchitectureError("READ_UNAUTHORIZED_SOURCE");
    if (raw.snapshot !== undefined && raw.snapshot !== digest(source.parsed))
      throw new ArchitectureError("READ_STALE_SNAPSHOT");
    if (raw.kind === "metadata") return { ordinal, payload: sourceIndex(source) };
    const units = sourceUnits(source);
    if (raw.kind === "search") {
      if (typeof raw.exactLiteral !== "string" || !raw.exactLiteral.length)
        throw new ArchitectureError("READ_SEARCH_LITERAL");
      const matches = units.flatMap((unit) => {
        const result: Array<{ locator: string; start: number; end: number }> = [];
        for (
          let offset = unit.text.indexOf(raw.exactLiteral as string);
          offset >= 0;
          offset = unit.text.indexOf(raw.exactLiteral as string, offset + 1)
        )
          result.push({
            locator: unit.locator,
            start: offset,
            end: offset + (raw.exactLiteral as string).length
          });
        return result;
      });
      return { ordinal, sourceId: source.sourceId, matches };
    }
    if (raw.kind === "visual") {
      if (typeof raw.locator !== "string" || !source.parsed?.pageLocators?.includes(raw.locator))
        throw new ArchitectureError("READ_VISUAL_LOCATOR");
      return {
        ordinal,
        kind: "visual",
        sourceId: source.sourceId,
        locator: raw.locator,
        snapshot: digest(source.parsed)
      };
    }
    if (raw.kind !== "range") throw new ArchitectureError("READ_KIND");
    const unit = units.find((u) => u.locator === raw.locator);
    if (!unit) throw new ArchitectureError("READ_LOCATOR");
    let start = raw.start ?? 0,
      end = raw.end ?? unit.text.length;
    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      end < start ||
      end > unit.text.length
    )
      throw new ArchitectureError("READ_RANGE");
    const low = (n: number) => n >= 0xdc00 && n <= 0xdfff;
    if (start > 0 && low(unit.text.charCodeAt(start))) start--;
    if (end < unit.text.length && low(unit.text.charCodeAt(end))) end++;
    return {
      ordinal,
      sourceId: source.sourceId,
      locator: unit.locator,
      start,
      end,
      text: unit.text.slice(start, end),
      snapshot: digest(source.parsed),
      cells: unit.cells ?? []
    };
  });
}
