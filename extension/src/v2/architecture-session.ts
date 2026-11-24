import { AI_SCHEMAS } from "./contract-registry";
import { isRecord } from "@syllab/contracts";
import { stableStringify } from "./crypto";
import { stableDigest } from "./chunking";

export const ARCHITECTURE_POLICY = "source_registry_group/1" as const;
export const SESSION_SCHEMA = AI_SCHEMAS.session;
export type Stage = "A" | "B1" | "B2" | "C";
export type RoundCause = "INITIAL" | "NEW_ADMISSION" | "FOCUSED_CHECK" | "AI_REQUESTED_READ";
export interface Segment {
  id: string;
  ordinal: number;
  start: number;
  end: number;
  text: string;
  digest: string;
  visualRefs?: Array<{ sourceId: string; locator: string }>;
}
export interface PhysicalRequest {
  compensation?: { authorization: string; replacesRequestId: string };
  id: string;
  roundId: string;
  segmentId: string;
  request: string;
  state: "prepared" | "dispatched" | "captured" | "applied" | "failed" | "paid-unverified";
  response?: unknown;
  error?: string;
}
export interface Round {
  id: string;
  ordinal: number;
  cause: RoundCause;
  inputDigest: string;
  segments: Segment[];
  cursor: number;
  complete: boolean;
  finalizationRequired: boolean;
}
export interface Session {
  semanticPolicy?:
    | "assessment-relevance/1"
    | "assessment-relevance/2"
    | "assessment-relevance/3"
    | "assessment-relevance/4";
  promptFingerprint?: string;
  b2Phase?: "facets" | "synthesis";
  precedingSemanticRounds?: number;
  compatibilityRepairs?: Array<{
    requestId: string;
    kind: "deterministic_compat_repair";
    from: string;
    to: string;
    originalHash: string;
    repairedHash: string;
  }>;
  policy: typeof ARCHITECTURE_POLICY;
  id: string;
  stage: Stage;
  snapshot: string;
  rounds: Round[];
  requests: PhysicalRequest[];
  effectiveRounds: number;
  carry: unknown;
  output?: unknown;
  pendingReads?: unknown[];
  outputParts?: string[];
  pendingTransportReads?: unknown[];
  renderedRefs?: string[];
  carryArchive?: Record<string, unknown>;
  state: "active" | "final" | "failed" | "paid-unverified";
}
export class ArchitectureError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
export const digest = (value: unknown): string => stableDigest(stableStringify(value));
export const semanticRoundMaximum = (session: Session): number => {
  const maximum = { A: Infinity, B1: 6, B2: 4, C: 3 }[session.stage];
  if (!session.b2Phase) return maximum;
  const prior = session.precedingSemanticRounds ?? 0;
  if (
    session.stage !== "B2" ||
    !Number.isInteger(prior) ||
    prior < 0 ||
    prior > 3 ||
    (session.b2Phase === "facets" && prior !== 0) ||
    (session.b2Phase === "synthesis" && prior === 0)
  )
    throw new ArchitectureError("B2_PHASE_BUDGET");
  // One logical Group retains the Product maximum4 across both durable phases.
  return session.b2Phase === "facets" ? 3 : maximum - prior;
};

/** Splits Unicode text only at measured envelope admission, never by Source relevance. */
export function segments(text: string, fits: (part: string) => boolean): Segment[] {
  const result: Segment[] = [];
  let start = 0;
  do {
    const remaining = text.slice(start);
    let length = remaining.length;
    if (!fits(remaining)) {
      const points = Array.from(remaining);
      let lo = 0,
        hi = points.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(points.slice(0, mid).join(""))) lo = mid;
        else hi = mid - 1;
      }
      if (!lo) throw new ArchitectureError("TRANSPORT_MINIMUM_ENVELOPE");
      length = points.slice(0, lo).join("").length;
    }
    const part = text.slice(start, start + length);
    result.push({
      id: digest([digest(text), start, start + length]),
      ordinal: result.length,
      start,
      end: start + length,
      text: part,
      digest: digest(part)
    });
    start += length;
  } while (start < text.length);
  return result;
}
export function newSession(id: string, stage: Stage, snapshot: string): Session {
  return {
    policy: ARCHITECTURE_POLICY,
    id,
    stage,
    snapshot,
    rounds: [],
    requests: [],
    effectiveRounds: 0,
    carry: null,
    state: "active"
  };
}
export function beginRound(
  session: Session,
  input: unknown,
  cause: RoundCause,
  fits: (part: string) => boolean = () => true
): Round {
  if (session.state !== "active" || session.rounds.some((r) => !r.complete))
    throw new ArchitectureError("ROUND_ACTIVE_OR_TERMINAL");
  if (session.effectiveRounds >= semanticRoundMaximum(session))
    throw new ArchitectureError("SEMANTIC_BUDGET");
  const ordinal = session.rounds.length;
  const round: Round = {
    id: `${session.id}:round:${String(ordinal)}`,
    ordinal,
    cause,
    inputDigest: digest(input),
    segments:
      Array.isArray(input) && input.some((r) => isRecord(r) && r.kind === "visual")
        ? input
            .flatMap((item, index) => {
              const parts = segments(stableStringify(item), fits);
              if (isRecord(item) && item.kind === "visual" && parts.length !== 1)
                throw new ArchitectureError("VISUAL_ATOMIC_ENVELOPE");
              return parts.map((part) => ({
                ...part,
                id: `${session.id}:${String(ordinal)}:read:${String(index)}:${part.id}`,
                ...(isRecord(item) && item.kind === "visual"
                  ? {
                      visualRefs: [
                        { sourceId: String(item.sourceId), locator: String(item.locator) }
                      ]
                    }
                  : {})
              }));
            })
            .map((part, index) => ({ ...part, ordinal: index }))
        : segments(stableStringify(input), fits),
    cursor: 0,
    complete: false,
    finalizationRequired: session.effectiveRounds + 1 === semanticRoundMaximum(session)
  };
  session.rounds.push(round);
  return round;
}
export interface SessionReply {
  schema: typeof SESSION_SCHEMA;
  roundId: string;
  segmentId: string;
  kind:
    | "DELIVERY_ACK"
    | "TRANSPORT_CONTINUE"
    | "ROUND_OUTPUT_SEGMENT"
    | "ROUND_COMPLETE_CONTINUE"
    | "ROUND_COMPLETE_FINAL";
  carry: unknown;
  output?: unknown;
  requestedReads?: unknown[];
  requestedTransportReads?: unknown[];
}
export function validateReply(value: unknown, round: Round, segment: Segment): SessionReply {
  if (
    !isRecord(value) ||
    value.schema !== SESSION_SCHEMA ||
    value.roundId !== round.id ||
    value.segmentId !== segment.id ||
    ![
      "DELIVERY_ACK",
      "TRANSPORT_CONTINUE",
      "ROUND_OUTPUT_SEGMENT",
      "ROUND_COMPLETE_CONTINUE",
      "ROUND_COMPLETE_FINAL"
    ].includes(String(value.kind)) ||
    !("carry" in value)
  )
    throw new ArchitectureError("SESSION_ENVELOPE");
  const transportReads = value.requestedTransportReads;
  if (
    transportReads !== undefined &&
    (!Array.isArray(transportReads) ||
      value.kind !== "TRANSPORT_CONTINUE" ||
      transportReads.some((r) => !isRecord(r) || r.kind !== "object"))
  )
    throw new ArchitectureError("TRANSPORT_READ_SCOPE");
  const reads = value.requestedReads;
  if (reads !== undefined && !Array.isArray(reads)) throw new ArchitectureError("READ_SHAPE");
  if (
    value.kind === "ROUND_OUTPUT_SEGMENT" &&
    (typeof value.output !== "string" || !value.output.length || reads?.length)
  )
    throw new ArchitectureError("OUTPUT_SEGMENT_SHAPE");
  const finalSegment = round.cursor === round.segments.length - 1;
  if (!finalSegment && String(value.kind).startsWith("ROUND_COMPLETE"))
    throw new ArchitectureError("ROUND_BEFORE_DELIVERY_COMPLETE");
  if ((value.kind === "DELIVERY_ACK" || value.kind === "TRANSPORT_CONTINUE") && reads?.length)
    throw new ArchitectureError("TRANSPORT_NEW_SEMANTIC_READ");
  if (value.kind === "ROUND_COMPLETE_CONTINUE" && (round.finalizationRequired || !reads?.length))
    throw new ArchitectureError("ROUND_CONTINUE_INVALID");
  if (value.kind === "ROUND_COMPLETE_FINAL" && (reads?.length || !("output" in value)))
    throw new ArchitectureError("FINAL_OUTPUT_OR_READ");
  return value as unknown as SessionReply;
}
/** Idempotent completion uses the persisted physical response, never semantic interpretation. */
export function applyReply(session: Session, physical: PhysicalRequest): SessionReply | undefined {
  if (physical.state === "applied") return undefined;
  const round = session.rounds.find((r) => r.id === physical.roundId);
  const segment = round?.segments[round.cursor];
  if (!round || !segment || segment.id !== physical.segmentId || physical.state !== "captured")
    throw new ArchitectureError("DELIVERY_ORDER");
  const value = validateReply(physical.response, round, segment);
  session.carry = value.carry;
  if (value.requestedTransportReads?.length) {
    if (round.cursor !== round.segments.length - 1)
      throw new ArchitectureError("TRANSPORT_READ_BEFORE_DELIVERY");
    session.pendingTransportReads = value.requestedTransportReads;
  }
  if (value.kind === "DELIVERY_ACK") {
    if (round.cursor === round.segments.length - 1) throw new ArchitectureError("LAST_SEGMENT_ACK");
    round.cursor++;
  } else if (value.kind === "ROUND_OUTPUT_SEGMENT") {
    if (round.cursor !== round.segments.length - 1)
      throw new ArchitectureError("OUTPUT_BEFORE_DELIVERY");
    (session.outputParts ??= []).push(value.output as string);
  } else if (value.kind.startsWith("ROUND_COMPLETE")) {
    round.complete = true;
    session.effectiveRounds++;
    if (value.kind === "ROUND_COMPLETE_CONTINUE") session.pendingReads = value.requestedReads ?? [];
    if (value.kind === "ROUND_COMPLETE_FINAL") {
      session.output = session.outputParts?.length
        ? (JSON.parse(session.outputParts.join("") + String(value.output)) as unknown)
        : value.output;
      delete session.outputParts;
      session.state = "final";
    }
  }
  physical.state = "applied";
  return value;
}
export function splitRefusedSegment(session: Session, round: Round): void {
  const old = round.segments[round.cursor];
  if (!old) throw new ArchitectureError("SEGMENT_MISSING");
  if (old.visualRefs?.length) throw new ArchitectureError("VISUAL_ATOMIC_BOUNDARY");
  const points = Array.from(old.text);
  if (points.length < 2) throw new ArchitectureError("TRANSPORT_MINIMUM_ENVELOPE");
  const mid = Math.floor(points.length / 2);
  const texts = [points.slice(0, mid).join(""), points.slice(mid).join("")];
  let start = old.start;
  const pieces = texts.map((text) => {
    const part = {
      id: digest([round.inputDigest, start, start + text.length]),
      ordinal: 0,
      start,
      end: start + text.length,
      text,
      digest: digest(text)
    };
    start += text.length;
    return part;
  });
  round.segments.splice(round.cursor, 1, ...pieces);
  round.segments.forEach((part, i) => (part.ordinal = i));
  // The round reservation remains the same, no matter how many refusals/segments.
  if (session.effectiveRounds >= semanticRoundMaximum(session))
    throw new ArchitectureError("SEMANTIC_BUDGET");
}

export function requireValue<T>(value: T | undefined): T {
  if (value === undefined) throw new ArchitectureError("MISSING_RUNTIME_VALUE");
  return value;
}
