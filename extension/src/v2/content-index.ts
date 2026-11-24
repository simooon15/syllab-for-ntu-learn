import type { SourceRecord } from "./domain";
import { stableDigest } from "./chunking";
import { stableStringify } from "./crypto";
import { decodeNativeHtml } from "./source-triage";
export const INDEX_REPRESENTATION = "native_index/1";
export interface IndexSource {
  ref: string;
  sourceId: string;
  title: string;
  kind: string;
  nativeType: string | null;
  parentRef: string | null;
  fingerprint: string;
  unitCount: number;
  nativeCharacters: number;
  anchors: Array<{ locator: string; text: string }>;
}
/** Tuples keep every native unit addressable without sending full native text. */
export type IndexUnit = [
  ref: string,
  sourceRef: string,
  locator: string,
  anchor: string,
  nativeCharacters: number,
  textBlocks: number,
  cells: number,
  gaps: string[]
];
export interface CourseContentIndex {
  policy: string;
  fingerprint: string;
  unitColumns: string[];
  sources: IndexSource[];
  units: IndexUnit[];
}
export interface NativeExpansion {
  ref: string;
  sourceRef: string;
  locator: string;
  text: string;
  cells?: NonNullable<NonNullable<SourceRecord["parsed"]>["units"]>[number]["cells"];
  unitRefs?: string[];
}
export function nativeFields(source: SourceRecord): Array<{ locator: string; text: string }> {
  const fields = [...(source.discovery?.rawText ?? "").matchAll(/<p>([\s\S]*?)<\/p>/g)].flatMap(
    (m) => {
      const field = (m[1] ?? "").match(/^([\w.[\]]+): ([\s\S]*)$/);
      if (
        !field ||
        ![
          "body",
          "displayText",
          "description",
          "text",
          "html",
          "renderedText",
          "formattedText"
        ].includes((field[1] ?? "").split(".").at(-1) ?? "")
      )
        return [];
      return [
        { locator: `native-field:${field[1] ?? ""}`, text: decodeNativeHtml(field[2] ?? "") }
      ];
    }
  );
  return fields.length ? fields : [{ locator: "native-text", text: source.parsed?.text ?? "" }];
}
function firstSentence(text: string): string {
  return text.split(/(?<=[.!?。！？])\s+|\n+/u).find((s) => s.trim()) ?? "";
}
export function contentIndex(inventory: SourceRecord[]): CourseContentIndex {
  const active = inventory.filter((s) => !s.removedFromNative);
  const refs = new Map(active.map((s) => [s.sourceId, `s:${stableDigest(s.sourceId)}`]));
  const used = new Set<string>();
  const claim = (ref: string) => {
    if (used.has(ref)) throw new Error("PLANNER_REF_COLLISION");
    used.add(ref);
    return ref;
  };
  const units: IndexUnit[] = [];
  const sources = active.map((source) => {
    const ref = claim(refs.get(source.sourceId) ?? "");
    const native = source.parsed?.units ?? [];
    for (const unit of native) {
      const range = unit.textRanges?.[0];
      const anchor = range ? unit.text.slice(range.start, range.end) : firstSentence(unit.text);
      units.push([
        claim(`u:${stableDigest(stableStringify([source.sourceId, unit.locator]))}`),
        ref,
        unit.locator,
        anchor,
        unit.text.length,
        unit.textRanges?.length ?? 0,
        unit.cells?.length ?? 0,
        unit.partial
          ? unit.visualGaps?.length
            ? unit.visualGaps
            : ["unresolved-native-coverage"]
          : []
      ]);
    }
    const fields = nativeFields(source);
    if (source.parentSourceId && !refs.has(source.parentSourceId))
      throw new Error("PLANNER_PARENT_MISSING");
    return {
      ref,
      sourceId: source.sourceId,
      title: source.title,
      kind: source.kind,
      nativeType: source.discovery?.nativeTypeHint ?? null,
      parentRef: source.parentSourceId ? (refs.get(source.parentSourceId) ?? null) : null,
      fingerprint: stableDigest(
        stableStringify({
          machine: source.machine,
          parsed: source.parsed
            ? {
                text: source.parsed.text,
                structure: source.parsed.structure,
                units: source.parsed.units,
                contentHash: source.parsed.contentHash,
                canonicalization: source.parsed.canonicalization
              }
            : null,
          fields,
          parent: source.parentSourceId,
          nativeType: source.discovery?.nativeTypeHint
        })
      ),
      unitCount: native.length,
      nativeCharacters: native.length
        ? native.reduce((n, u) => n + u.text.length, 0)
        : (source.parsed?.text.length ?? fields.reduce((n, f) => n + f.text.length, 0)),
      anchors: native.length
        ? []
        : fields.map((f) => ({ locator: f.locator, text: firstSentence(f.text) }))
    };
  });
  // Parent cycles are malformed provenance, never a reason to silently omit a Source.
  for (const source of sources) {
    const visited = new Set([source.ref]);
    let parent = source.parentRef;
    while (parent) {
      if (visited.has(parent)) throw new Error("PLANNER_PARENT_CYCLE");
      visited.add(parent);
      parent = sources.find((s) => s.ref === parent)?.parentRef ?? null;
    }
  }
  const body = {
    policy: INDEX_REPRESENTATION,
    unitColumns: [
      "ref",
      "sourceRef",
      "locator",
      "firstNativeSpan",
      "nativeCharacters",
      "textBlocks",
      "cells",
      "unresolvedCoverage"
    ],
    sources,
    units
  };
  return { ...body, fingerprint: stableDigest(stableStringify(body)) };
}
export function expandRef(
  index: CourseContentIndex,
  inventory: SourceRecord[],
  ref: string
): NativeExpansion {
  const unit = index.units.find((u) => u[0] === ref);
  const row = index.sources.find((s) => s.ref === (unit?.[1] ?? ref));
  if (!row) throw new Error("PLANNER_UNKNOWN_REF");
  const source = inventory.find((s) => s.sourceId === row.sourceId);
  if (!source) throw new Error("PLANNER_SOURCE_MISSING");
  if (!unit) {
    const unitRefs = index.units.filter((u) => u[1] === row.ref).map((u) => u[0]);
    return {
      ref,
      sourceRef: row.ref,
      locator: "source",
      text: unitRefs.length
        ? ""
        : (source.parsed?.text ??
          nativeFields(source)
            .map((f) => `${f.locator}\n${f.text}`)
            .join("\n\n")),
      unitRefs
    };
  }
  const native = source.parsed?.units?.find((u) => u.locator === unit[2]);
  if (!native) throw new Error("PLANNER_UNIT_MISSING");
  return {
    ref,
    sourceRef: row.ref,
    locator: native.locator,
    text: native.text,
    ...(native.cells ? { cells: native.cells } : {})
  };
}
