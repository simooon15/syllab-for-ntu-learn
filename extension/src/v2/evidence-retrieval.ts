import { evidenceRegistry, GROUNDED_B_SCHEMA } from "./task-b-grounding";
import { stableDigest } from "./chunking";
import type { AiCall, AiEvidence } from "./ai-pipeline";
import type { SourceRecord } from "./domain";
import { computeOutputSafetyCeiling, invocationFingerprint } from "./invocation-policy";

export interface EvidenceRequest {
  refId: string;
  start?: number;
  length?: number;
}
export interface EvidenceCatalogEntry {
  refId: string;
  sourceId: string;
  locator: string;
  characters: number;
}
export interface EvidenceReply {
  refId: string;
  status: "available" | "unknown-ref" | "invalid-range";
  evidence?: AiEvidence;
  start?: number;
  end?: number;
  truncated?: boolean;
  /** Original reference coordinates for no-progress detection through excerpt aliases. */
  coverageRef?: string;
  coverageStart?: number;
  coverageEnd?: number;
}

/** Exact Source/unit references only; titles and course semantics never enter retrieval. */
export function evidenceCatalog(sources: SourceRecord[]): EvidenceCatalogEntry[] {
  return sources.flatMap((source) =>
    (source.parsed?.units ?? []).map((unit) => ({
      refId: `native_${stableDigest([source.sourceId, source.parsed?.contentHash ?? "", unit.locator].join("\u0000"))}`,
      sourceId: source.sourceId,
      locator: unit.locator,
      characters: unit.text.length
    }))
  );
}

export function retrieveEvidence(
  requests: EvidenceRequest[],
  sources: SourceRecord[],
  supplied: AiEvidence[]
): EvidenceReply[] {
  const catalog = evidenceCatalog(sources);
  return requests.map((request) => {
    const entry = catalog.find((item) => item.refId === request.refId);
    const captured = supplied.find((item) => item.evidenceId === request.refId);
    const source = entry ? sources.find((item) => item.sourceId === entry.sourceId) : undefined;
    const unit = entry
      ? source?.parsed?.units?.find((item) => item.locator === entry.locator)
      : undefined;
    const raw = unit?.text ?? captured?.excerpt;
    if (raw === undefined) return { refId: request.refId, status: "unknown-ref" };
    const start = request.start ?? 0;
    const length = request.length ?? Math.max(0, raw.length - start);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(length) ||
      start < 0 ||
      start >= raw.length ||
      length < 1
    )
      return { refId: request.refId, status: "invalid-range" };
    const end = start + Math.min(raw.length - start, length);
    let coverageRef = request.refId;
    let offset = 0;
    for (;;) {
      const match = /^(.*):chars:(\d+)-(\d+)$/.exec(coverageRef);
      if (!match) break;
      coverageRef = match[1] ?? coverageRef;
      offset += Number(match[2]);
    }
    if (!Number.isSafeInteger(offset + end))
      return { refId: request.refId, status: "invalid-range" };
    return {
      refId: request.refId,
      status: "available",
      coverageRef,
      coverageStart: offset + start,
      coverageEnd: offset + end,
      start,
      end,
      truncated: start > 0 || end < raw.length,
      evidence: {
        evidenceId: `${request.refId}:chars:${String(start)}-${String(end)}`,
        sourceId: entry?.sourceId ?? captured?.sourceId ?? "",
        locator: entry?.locator ?? captured?.locator ?? "",
        excerpt: raw.slice(start, end),
        ...(captured?.objectId ? { objectId: captured.objectId } : {})
      }
    };
  });
}

/** Progress is new character coverage, not a new request ID or a differently shaped overlap. */
export class EvidenceProgress {
  private readonly ranges = new Map<string, Array<[number, number]>>();
  constructor(supplied: AiEvidence[] = []) {
    for (const evidence of supplied) {
      let key = evidence.evidenceId,
        offset = 0;
      for (;;) {
        const match = /^(.*):chars:(\d+)-(\d+)$/.exec(key);
        if (!match) break;
        key = match[1] ?? key;
        offset += Number(match[2]);
      }
      this.accept({
        refId: evidence.evidenceId,
        status: "available",
        evidence,
        start: 0,
        end: evidence.excerpt.length,
        coverageRef: key,
        coverageStart: offset,
        coverageEnd: offset + evidence.excerpt.length
      });
    }
  }
  accept(reply: EvidenceReply): boolean {
    if (!reply.evidence || reply.start === undefined || reply.end === undefined) return false;
    const key = reply.coverageRef ?? reply.refId;
    const ranges = this.ranges.get(key) ?? [];
    const start = reply.coverageStart ?? reply.start,
      end = reply.coverageEnd ?? reply.end;
    if (ranges.some(([left, right]) => left <= start && right >= end)) return false;
    const merged: Array<[number, number]> = [];
    for (const range of [...ranges, [start, end] as [number, number]].sort((a, b) => a[0] - b[0])) {
      const previous = merged.at(-1);
      if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
      else merged.push([...range]);
    }
    this.ranges.set(key, merged);
    return true;
  }
}

/** Preserve the stable prefix and append the last B response and exact local retrieval result. */
export function continueTaskB(
  base: AiCall,
  previous: unknown,
  replies: EvidenceReply[],
  round: number
): AiCall {
  const messages = [
    ...(base.messages ?? [{ role: "user" as const, content: base.user }]),
    { role: "assistant" as const, content: JSON.stringify(previous) },
    {
      role: "user" as const,
      content: JSON.stringify({
        evidenceReplies: replies,
        ...(base.schemaVersion === GROUNDED_B_SCHEMA
          ? {
              suppliedEvidenceRegistry: [
                ...evidenceRegistry(replies.flatMap((r) => (r.evidence ? [r.evidence] : [])))
              ].map(([ref, item]) => ({ ref, ...item }))
            }
          : {}),
        expansionRound: round,
        instruction:
          "Continue this Task B judgment. Use only available excerpts; unavailable or truncated evidence does not justify certainty. Return the complete Task B JSON envelope."
      })
    }
  ];
  const user = base.user; // First user message remains byte-identical for provider prefix caching.
  const maxTokens = computeOutputSafetyCeiling(
    "task-b-expand",
    base.system,
    messages.map((item) => item.content).join("\n")
  );
  return {
    ...base,
    task: "task-b-expand",
    user,
    messages,
    maxTokens,
    idempotencyKey: `${base.idempotencyKey}:evidence:${String(round)}`,
    invocationFingerprint: invocationFingerprint({
      task: "task-b-expand",
      promptVersion: base.promptVersion,
      schemaVersion: base.schemaVersion,
      system: base.system,
      user: JSON.stringify(messages),
      maxTokens,
      ...(base.providerRequestCompatibility
        ? { providerRequestCompatibility: base.providerRequestCompatibility }
        : {})
    })
  };
}
