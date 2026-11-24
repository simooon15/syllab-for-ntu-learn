/** P2E-052 cost-only experiment guard. No arbitrary dispatch-count limit or implicit approval. */
export interface WalletAuthorization {
  approvalReference: string;
  maxCNY: number;
  usdToCNY: number;
  initialAvailableCNY: number;
  /** Official CNY peak tariff, verified against this CNY wallet before each transport. */
  pricingBasis?: "verified-cny-peak/1";
}
export interface WalletDispatch {
  id: string;
  reservedCNY: number;
  chargedCNY: number;
  verifiedUsage: boolean;
  inputTokenCeiling?: number;
}
export interface VerifiedTextRequest {
  serializedRequest: string;
  tokenizerSHA256: string;
  verifiedAt: string;
}
/** Official V4.1 Flash identity-normalized ByteLevel BPE, all 256 byte tokens verified.
 * https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/tree/2cba9e42aa026125f3ed06c6d98c1db82f7ca027
 * Two-message high/max wrapper is 170/171 UTF-8 bytes in the official encoding reference.
 * 1024 covers that wrapper plus API JSON-format overhead; serialized wire bytes already
 * overcount escaped message text. Splits do not insert bytes and BPE merges only reduce tokens.
 * Text-only validation adapters opt in with a current codec verification. Historical calls,
 * images, tools and unverified codecs retain the provider-wide 1M input reservation.
 */
export function verifiedTextInputCeiling(proof: VerifiedTextRequest, outputLimit: number): number {
  const at = Date.parse(proof.verifiedAt);
  if (
    proof.tokenizerSHA256 !== "c90dfa01249db1be4245780a052ede752e1361c612ac6d08e2bdada7d599476b" ||
    !Number.isFinite(at) ||
    Date.now() - at < 0 ||
    Date.now() - at > 86400000
  )
    throw Error("WALLET_BUDGET:TEXT_CODEC_UNVERIFIED");
  let raw: unknown;
  try {
    raw = JSON.parse(proof.serializedRequest);
  } catch {
    throw Error("WALLET_BUDGET:TEXT_REQUEST_INVALID");
  }
  if (typeof raw !== "object" || raw === null) throw Error("WALLET_BUDGET:TEXT_REQUEST_INVALID");
  const r = raw as Record<string, unknown>;
  const allowed = [
    "model",
    "thinking",
    "reasoning_effort",
    "max_tokens",
    "response_format",
    "stream",
    "stream_options",
    "messages"
  ];
  if (
    Object.keys(r).some((k) => !allowed.includes(k)) ||
    r.model !== "deepseek-flash" ||
    r.max_tokens !== outputLimit ||
    !Array.isArray(r.messages) ||
    r.messages.length !== 2 ||
    r.messages.some((m: unknown, i: number) => {
      if (typeof m !== "object" || m === null) return true;
      const message = m as Record<string, unknown>;
      return (
        Object.keys(message).some((k) => !["role", "content"].includes(k)) ||
        message.role !== (i === 0 ? "system" : "user") ||
        typeof message.content !== "string"
      );
    })
  )
    throw Error("WALLET_BUDGET:TEXT_REQUEST_INVALID");
  return Math.min(
    WALLET_MAX_INPUT_TOKENS,
    new TextEncoder().encode(proof.serializedRequest).byteLength + 1024
  );
}
export interface WalletUsage {
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens?: number;
  cacheMissTokens?: number;
}
export const WALLET_MAX_INPUT_TOKENS = 1_000_000;
export interface PrepaidWalletAuthorization {
  approvalReference: string;
  policy: "prepaid-wallet/1";
  pricingBasis: "verified-cny-peak/1";
}
function isPrepaidPolicy(policy: string, pricingBasis: string) {
  return policy === "prepaid-wallet/1" && pricingBasis === "verified-cny-peak/1";
}
/** P2E-054 replaces spending caps for future dispatches, not historical accounting.
 * Latest provider balance already includes settled debits. Explicitly named historical
 * UNKNOWN rows stay immutable in the ledger; they are not current in-flight reservations.
 * New uncertain dispatches remain payable risk and cannot be silently reclassified here.
 */
export function reservePrepaidWalletDispatch(
  rows: WalletDispatch[],
  approval: PrepaidWalletAuthorization,
  id: string,
  wallet: { availableCNY: number; observedAt: string },
  outputLimit: number,
  historicalUnknownIds: readonly string[],
  textProof?: VerifiedTextRequest
): WalletDispatch[] {
  if (
    !approval.approvalReference.trim() ||
    !isPrepaidPolicy(approval.policy, approval.pricingBasis)
  )
    throw Error("WALLET_BUDGET:AUTHORIZATION");
  const observed = Date.parse(wallet.observedAt);
  if (
    !Number.isFinite(wallet.availableCNY) ||
    wallet.availableCNY < 0 ||
    !Number.isFinite(observed) ||
    Date.now() - observed < 0 ||
    Date.now() - observed > 60000
  )
    throw Error("WALLET_BUDGET:BALANCE_UNAVAILABLE");
  const historical = new Set(historicalUnknownIds);
  if (
    !id ||
    rows.some((r) => r.id === id) ||
    new Set(rows.map((r) => r.id)).size !== rows.length ||
    rows.some((r) => !Number.isFinite(r.chargedCNY) || r.chargedCNY < 0) ||
    historical.size !== historicalUnknownIds.length ||
    historicalUnknownIds.some((oldId) => !rows.some((r) => r.id === oldId && !r.verifiedUsage)) ||
    !Number.isSafeInteger(outputLimit) ||
    outputLimit < 1 ||
    outputLimit > 384000
  )
    throw Error("WALLET_BUDGET:IDENTITY_OR_BOUNDARY");
  const inputTokenCeiling = textProof
    ? verifiedTextInputCeiling(textProof, outputLimit)
    : WALLET_MAX_INPUT_TOKENS;
  const reservedCNY = (inputTokenCeiling * 2 + outputLimit * 8) / 1000000;
  const pending = rows
    .filter((r) => !r.verifiedUsage && !historical.has(r.id))
    .reduce((n, r) => n + r.chargedCNY, 0);
  if (pending + reservedCNY > wallet.availableCNY) throw Error("WALLET_BUDGET:ACCOUNT_EXHAUSTED");
  return [
    ...rows,
    {
      id,
      reservedCNY,
      chargedCNY: reservedCNY,
      verifiedUsage: false,
      ...(textProof ? { inputTokenCeiling } : {})
    }
  ];
}
export function reserveWalletDispatch(
  rows: WalletDispatch[],
  approval: WalletAuthorization,
  id: string,
  availableCNY: number,
  outputLimit: number,
  textProof?: VerifiedTextRequest
): WalletDispatch[] {
  if (
    !approval.approvalReference.trim() ||
    !Number.isFinite(approval.maxCNY) ||
    approval.maxCNY <= 0 ||
    approval.maxCNY > 25 ||
    !Number.isFinite(approval.usdToCNY) ||
    approval.usdToCNY < 7.5 ||
    !Number.isFinite(approval.initialAvailableCNY) ||
    approval.initialAvailableCNY < approval.maxCNY
  )
    throw Error("WALLET_BUDGET:AUTHORIZATION");
  if (
    !id ||
    rows.some((r) => r.id === id) ||
    new Set(rows.map((r) => r.id)).size !== rows.length ||
    rows.some((r) => !Number.isFinite(r.chargedCNY) || r.chargedCNY < 0) ||
    !Number.isSafeInteger(outputLimit) ||
    outputLimit < 1 ||
    outputLimit > 384000
  )
    throw Error("WALLET_BUDGET:IDENTITY_OR_BOUNDARY");
  if (!Number.isFinite(availableCNY) || availableCNY < 0)
    throw Error("WALLET_BUDGET:BALANCE_UNAVAILABLE");
  // All provider-admitted input can be as large as 1M. Cold peak prices, exact enforced output cap.
  const cny = approval.pricingBasis === "verified-cny-peak/1";
  if (textProof && !cny) throw Error("WALLET_BUDGET:TEXT_TARIFF_UNVERIFIED");
  const inputTokenCeiling = textProof
    ? verifiedTextInputCeiling(textProof, outputLimit)
    : WALLET_MAX_INPUT_TOKENS;
  const reservedCNY = cny
    ? (inputTokenCeiling * 2 + outputLimit * 8) / 1000000
    : (0.3 + (outputLimit * 1.2) / 1000000) * approval.usdToCNY;
  if (rows.reduce((n, r) => n + r.chargedCNY, 0) + reservedCNY > approval.maxCNY)
    throw Error("WALLET_BUDGET:AUTHORIZATION_EXHAUSTED");
  if (
    rows.filter((r) => !r.verifiedUsage).reduce((n, r) => n + r.chargedCNY, 0) + reservedCNY >
    availableCNY
  )
    throw Error("WALLET_BUDGET:ACCOUNT_EXHAUSTED");
  // Wallet debits (including other processes, delayed fees and failed requests) also consume
  // this authorization. A refill cannot enlarge the originally authorized total.
  const walletDebits = Math.max(0, approval.initialAvailableCNY - availableCNY);
  const pending = rows.filter((r) => !r.verifiedUsage).reduce((n, r) => n + r.chargedCNY, 0);
  if (walletDebits + pending + reservedCNY > approval.maxCNY)
    throw Error("WALLET_BUDGET:WALLET_DEBITS_EXHAUSTED");
  return [
    ...rows,
    {
      id,
      reservedCNY,
      chargedCNY: reservedCNY,
      verifiedUsage: false,
      ...(textProof ? { inputTokenCeiling } : {})
    }
  ];
}
export function settleWalletDispatch(
  rows: WalletDispatch[],
  id: string,
  approval: WalletAuthorization | PrepaidWalletAuthorization,
  usage?: WalletUsage,
  window?: { startedAt: string; finishedAt: string }
): WalletDispatch[] {
  const row = rows.find((r) => r.id === id);
  if (!row) throw Error("WALLET_BUDGET:UNKNOWN_DISPATCH");
  if (!usage) return rows;
  if (
    ![usage.inputTokens, usage.outputTokens].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    usage.inputTokens > 1000000 ||
    usage.outputTokens > 384000
  )
    throw Error("WALLET_BUDGET:INVALID_USAGE");
  let hits = usage.cacheHitTokens ?? 0;
  if (
    !Number.isSafeInteger(hits) ||
    hits < 0 ||
    hits > usage.inputTokens ||
    (usage.cacheMissTokens !== undefined && usage.cacheMissTokens !== usage.inputTokens - hits)
  )
    hits = 0;
  const start = window ? Date.parse(window.startedAt) : NaN;
  const end = window ? Date.parse(window.finishedAt) : NaN;
  // Official weekend tariff is half peak. Default remains peak when timing is unknown,
  // crosses days or exceeds the bounded request deadline. No holiday assumptions.
  const chinaDay = (t: number) => new Date(t + 8 * 3600000).toISOString().slice(0, 10);
  const weekend =
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end >= start &&
    end - start <= 1800000 &&
    chinaDay(start) === chinaDay(end) &&
    [0, 6].includes(new Date(start + 8 * 3600000).getUTCDay());
  const chargedCNY =
    approval.pricingBasis === "verified-cny-peak/1"
      ? ((hits * 0.04 + (usage.inputTokens - hits) * 2 + usage.outputTokens * 8) / 1000000) *
        (weekend ? 0.5 : 1)
      : ((hits * 0.006 + (usage.inputTokens - hits) * 0.3 + usage.outputTokens * 1.2) / 1000000) *
        ("usdToCNY" in approval ? approval.usdToCNY : NaN);
  if (chargedCNY - row.reservedCNY > 1e-9) throw Error("WALLET_BUDGET:RESERVATION_EXCEEDED");
  if (row.verifiedUsage && row.chargedCNY !== chargedCNY)
    throw Error("WALLET_BUDGET:SETTLEMENT_CONFLICT");
  return rows.map((r) => (r.id === id ? { ...r, chargedCNY, verifiedUsage: true } : r));
}

/** Physical dispatch allocation follows available authorized money, not a guessed task capacity.
 * The full logical task remains pending on truncation/stall. A lower allocation cannot certify it.
 * Callers reserialize the chosen max_tokens and reserve that exact wire request before dispatch.
 */
export function prepaidOutputAllocation(
  rows: WalletDispatch[],
  availableCNY: number,
  inputTokenCeiling: number,
  historicalUnknownIds: readonly string[],
  providerMaximum = 384000
): { outputTokens: number; reason: "provider-boundary" | "wallet-boundary" } {
  if (
    !Number.isFinite(availableCNY) ||
    availableCNY < 0 ||
    !Number.isSafeInteger(inputTokenCeiling) ||
    inputTokenCeiling < 1 ||
    !Number.isSafeInteger(providerMaximum) ||
    providerMaximum < 1 ||
    providerMaximum > 384000
  )
    throw Error("WALLET_BUDGET:IDENTITY_OR_BOUNDARY");
  const historical = new Set(historicalUnknownIds);
  const pending = rows
    .filter((r) => !r.verifiedUsage && !historical.has(r.id))
    .reduce((sum, r) => sum + r.chargedCNY, 0);
  const affordable = Math.floor(((availableCNY - pending) * 1000000 - inputTokenCeiling * 2) / 8);
  if (affordable < 1) throw Error("WALLET_BUDGET:ACCOUNT_EXHAUSTED");
  const outputTokens = Math.min(providerMaximum, affordable);
  return {
    outputTokens,
    reason: outputTokens === providerMaximum ? "provider-boundary" : "wallet-boundary"
  };
}
