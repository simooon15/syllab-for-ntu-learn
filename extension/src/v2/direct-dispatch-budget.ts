/** Isolated test ledger policy; no provider access and no implicit authorization. */
export interface DirectAuthorization {
  approvalReference: string;
  maxPhysicalCalls: number;
  maxUSD: number;
}
export interface DirectDispatch {
  id: string;
  /** Until verified usage is settled, the full conservative reservation remains charged. */
  chargedUSD: number;
  verifiedUsage: boolean;
}
// Official Flash maximum 1M input / 384K output, using peak cache-miss pricing.
// Verified 2026-10-10: https://api-docs.deepseek.com/quick_start/pricing/
export const DIRECT_DISPATCH_RESERVE_USD = 0.3 + (384000 * 1.2) / 1000000;
export function reserveDirectDispatch(
  rows: DirectDispatch[],
  approval: DirectAuthorization,
  id: string
): DirectDispatch[] {
  if (
    !approval.approvalReference.trim() ||
    !Number.isSafeInteger(approval.maxPhysicalCalls) ||
    approval.maxPhysicalCalls < 1 ||
    !Number.isFinite(approval.maxUSD) ||
    approval.maxUSD <= 0
  )
    throw Error("DIRECT_BUDGET:AUTHORIZATION_REQUIRED");
  if (
    !id ||
    rows.some((r) => r.id === id) ||
    new Set(rows.map((r) => r.id)).size !== rows.length ||
    rows.some((r) => !Number.isFinite(r.chargedUSD) || r.chargedUSD < 0)
  )
    throw Error("DIRECT_BUDGET:LEDGER_IDENTITY");
  if (rows.length >= approval.maxPhysicalCalls) throw Error("DIRECT_BUDGET:CALL_LIMIT");
  if (rows.reduce((n, r) => n + r.chargedUSD, 0) + DIRECT_DISPATCH_RESERVE_USD > approval.maxUSD)
    throw Error("DIRECT_BUDGET:USD_LIMIT");
  return [...rows, { id, chargedUSD: DIRECT_DISPATCH_RESERVE_USD, verifiedUsage: false }];
}
/** Peak upper bound, not a claimed billing receipt; missing usage never frees the reservation. */
export function settleDirectDispatch(
  rows: DirectDispatch[],
  id: string,
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheHitTokens?: number;
    cacheMissTokens?: number;
  }
): DirectDispatch[] {
  const current = rows.find((r) => r.id === id);
  if (!current) throw Error("DIRECT_BUDGET:UNKNOWN_DISPATCH");
  if (!usage) return rows;
  const { inputTokens, outputTokens } = usage;
  if (
    ![inputTokens, outputTokens].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    inputTokens > 1000000 ||
    outputTokens > 384000
  )
    throw Error("DIRECT_BUDGET:USAGE_INVALID");
  let hits = usage.cacheHitTokens ?? 0;
  if (
    !Number.isSafeInteger(hits) ||
    hits < 0 ||
    hits > inputTokens ||
    (usage.cacheMissTokens !== undefined && usage.cacheMissTokens !== inputTokens - hits)
  )
    hits = 0; // Invalid cache split is never used to lower a conservative charge.
  const chargedUSD = (hits * 0.006 + (inputTokens - hits) * 0.3 + outputTokens * 1.2) / 1000000;
  if (current.verifiedUsage && current.chargedUSD !== chargedUSD)
    throw Error("DIRECT_BUDGET:SETTLEMENT_CONFLICT");
  return rows.map((r) => (r.id === id ? { ...r, chargedUSD, verifiedUsage: true } : r));
}
