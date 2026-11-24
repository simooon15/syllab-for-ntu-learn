import { it, expect } from "vitest";
import {
  reserveWalletDispatch,
  reservePrepaidWalletDispatch,
  settleWalletDispatch,
  verifiedTextInputCeiling,
  type WalletDispatch
} from "./direct-wallet-budget";
const a = {
  approvalReference: "P2E-052/CNY25",
  maxCNY: 25,
  usdToCNY: 7.5,
  initialAvailableCNY: 25.16
};
it("uses a fresh prepaid balance without recharging historical UNKNOWN or imposing superseded caps", () => {
  const prepaid = {
    approvalReference: "P2E-054/prepaid",
    policy: "prepaid-wallet/1" as const,
    pricingBasis: "verified-cny-peak/1" as const
  };
  const historical = [
    { id: "old-known", reservedCNY: 30, chargedCNY: 30, verifiedUsage: true },
    { id: "old-unknown", reservedCNY: 5.572864, chargedCNY: 5.572864, verifiedUsage: false }
  ];
  const wallet = { availableCNY: 3, observedAt: new Date().toISOString() };
  const rows = reservePrepaidWalletDispatch(historical, prepaid, "new", wallet, 98304, [
    "old-unknown"
  ]);
  expect(rows.slice(0, 2)).toEqual(historical);
  expect(rows[2]?.reservedCNY).toBe(2.786432);
  expect(() =>
    reservePrepaidWalletDispatch(rows, prepaid, "another", wallet, 98304, ["old-unknown"])
  ).toThrow("ACCOUNT_EXHAUSTED");
  expect(() => reservePrepaidWalletDispatch(historical, prepaid, "new", wallet, 98304, [])).toThrow(
    "ACCOUNT_EXHAUSTED"
  );
  expect(settleWalletDispatch(rows, "new", prepaid)).toEqual(rows);
  expect(
    settleWalletDispatch(rows, "new", prepaid, { inputTokens: 100, outputTokens: 100 })[2]
  ).toMatchObject({ verifiedUsage: true, chargedCNY: 0.001 });
  expect(() =>
    reservePrepaidWalletDispatch(rows, prepaid, "new", wallet, 98304, ["old-unknown"])
  ).toThrow("IDENTITY");
  expect(() =>
    reservePrepaidWalletDispatch(
      historical,
      prepaid,
      "new",
      { ...wallet, observedAt: "2026-01-01" },
      98304,
      ["old-unknown"]
    )
  ).toThrow("BALANCE_UNAVAILABLE");
});
it("supports more than24 low-cost settled dispatches while enforcing both CNY boundaries", () => {
  let rows: WalletDispatch[] = [];
  for (let i = 0; i < 30; i++) {
    rows = reserveWalletDispatch(rows, a, String(i), 25, 65536);
    rows = settleWalletDispatch(rows, String(i), a, { inputTokens: 100, outputTokens: 100 });
  }
  expect(rows).toHaveLength(30);
  expect(() => reserveWalletDispatch(rows, a, "low-wallet", 1, 65536)).toThrow("ACCOUNT_EXHAUSTED");
});
it("bounds a verified text wire request by byte BPE without freeing inherited UNKNOWN costs", () => {
  const cny = {
    ...a,
    maxCNY: 7,
    initialAvailableCNY: 7.03,
    pricingBasis: "verified-cny-peak/1" as const
  };
  const proof = {
    serializedRequest: JSON.stringify({
      model: "deepseek-flash",
      max_tokens: 16384,
      messages: [
        { role: "system", content: "JSON" },
        { role: "user", content: "课程资料😀" }
      ]
    }),
    tokenizerSHA256: "c90dfa01249db1be4245780a052ede752e1361c612ac6d08e2bdada7d599476b",
    verifiedAt: new Date().toISOString()
  };
  const unknown = [
    { id: "inherited-unknown", reservedCNY: 5.572864, chargedCNY: 5.572864, verifiedUsage: false }
  ];
  expect(() => reserveWalletDispatch(unknown, cny, "old-provider-bound", 7.03, 16384)).toThrow(
    "AUTHORIZATION_EXHAUSTED"
  );
  const rows = reserveWalletDispatch(unknown, cny, "bounded", 7.03, 16384, proof);
  expect(rows[0]).toEqual(unknown[0]);
  expect(rows[1]?.inputTokenCeiling).toBe(
    new TextEncoder().encode(proof.serializedRequest).byteLength + 1024
  );
  expect(() => reserveWalletDispatch(rows, cny, "low-account", 5.6, 16384, proof)).toThrow(
    "ACCOUNT_EXHAUSTED"
  );
  expect(settleWalletDispatch(rows, "bounded", cny)).toEqual(rows);
});
it("rejects stale codecs, images, extra roles and mismatched output caps in a text reservation proof", () => {
  const request = {
    model: "deepseek-flash",
    max_tokens: 16384,
    messages: [
      { role: "system", content: "JSON" },
      { role: "user", content: "Source" }
    ]
  };
  const proof = {
    serializedRequest: JSON.stringify(request),
    tokenizerSHA256: "c90dfa01249db1be4245780a052ede752e1361c612ac6d08e2bdada7d599476b",
    verifiedAt: new Date().toISOString()
  };
  expect(() => verifiedTextInputCeiling({ ...proof, tokenizerSHA256: "unknown" }, 16384)).toThrow(
    "CODEC_UNVERIFIED"
  );
  expect(() => verifiedTextInputCeiling({ ...proof, verifiedAt: "2026-01-01" }, 16384)).toThrow(
    "CODEC_UNVERIFIED"
  );
  expect(() => verifiedTextInputCeiling(proof, 32768)).toThrow("REQUEST_INVALID");
  expect(() =>
    verifiedTextInputCeiling(
      { ...proof, serializedRequest: JSON.stringify({ ...request, tools: [] }) },
      16384
    )
  ).toThrow("REQUEST_INVALID");
  expect(() =>
    verifiedTextInputCeiling(
      {
        ...proof,
        serializedRequest: JSON.stringify({
          ...request,
          messages: [
            { role: "system", content: "JSON" },
            { role: "user", content: [{ type: "image_url" }] }
          ]
        })
      },
      16384
    )
  ).toThrow("REQUEST_INVALID");
});
it("counts unknown/inflight costs and forbids duplicate or over-budget claims before transport", () => {
  let rows: WalletDispatch[] = [];
  for (let i = 0; i < 3; i++) rows = reserveWalletDispatch(rows, a, String(i), 25, 384000);
  expect(() => reserveWalletDispatch(rows, a, "fourth", 25, 384000)).not.toThrow();
  expect(() => reserveWalletDispatch(rows, a, "wallet-low", 7, 384000)).toThrow(
    "ACCOUNT_EXHAUSTED"
  );
  expect(() => reserveWalletDispatch(rows, a, "0", 25, 384000)).toThrow("IDENTITY");
  rows = reserveWalletDispatch(rows, a, "fourth", 25, 384000);
  expect(() => reserveWalletDispatch(rows, a, "fifth", 25, 384000)).toThrow(
    "AUTHORIZATION_EXHAUSTED"
  );
  expect(settleWalletDispatch(rows, "0", a)).toEqual(rows);
});
it("deducts external wallet debits, independently of low local ledger usage", () => {
  expect(() => reserveWalletDispatch([], a, "externally-debited", 2.9, 65536)).toThrow(
    "WALLET_DEBITS_EXHAUSTED"
  );
  expect(() => reserveWalletDispatch([], a, "refill", 100, 384000)).not.toThrow();
  let rows = reserveWalletDispatch([], a, "first", 100, 384000);
  rows = settleWalletDispatch(rows, "first", a, { inputTokens: 1000000, outputTokens: 384000 });
  for (let i = 0; i < 3; i++) {
    rows = reserveWalletDispatch(rows, a, `paid${String(i)}`, 100, 384000);
    rows = settleWalletDispatch(rows, `paid${String(i)}`, a, {
      inputTokens: 1000000,
      outputTokens: 384000
    });
  }
  expect(() => reserveWalletDispatch(rows, a, "refill-not-new-approval", 100, 384000)).toThrow(
    "AUTHORIZATION_EXHAUSTED"
  );
});
it("uses verified official CNY peak tariffs without deleting failed or historical dispatches", () => {
  const cny = { ...a, pricingBasis: "verified-cny-peak/1" as const };
  const rows = reserveWalletDispatch([], cny, "cny", 25, 98304);
  expect(rows[0]?.reservedCNY).toBe(2.786432);
  expect(
    settleWalletDispatch(rows, "cny", cny, { inputTokens: 1000000, outputTokens: 98304 })[0]
      ?.chargedCNY
  ).toBe(2.786432);
  expect(settleWalletDispatch(rows, "cny", cny)).toEqual(rows);
  expect(() =>
    reserveWalletDispatch(
      [{ id: "failed", reservedCNY: 25, chargedCNY: 25, verifiedUsage: false }],
      cny,
      "next",
      25,
      98304
    )
  ).toThrow("AUTHORIZATION_EXHAUSTED");
});
it("settles verified same-day weekend usage at official half tariff while keeping uncertain transports reserved", () => {
  const cny = { ...a, pricingBasis: "verified-cny-peak/1" as const };
  const rows = reserveWalletDispatch([], cny, "cny-weekend", 25, 98304);
  const usage = { inputTokens: 1000000, outputTokens: 98304 };
  expect(
    settleWalletDispatch(rows, "cny-weekend", cny, usage, {
      startedAt: "2026-10-09T21:00:00Z",
      finishedAt: "2026-10-09T21:05:00Z"
    })[0]?.chargedCNY
  ).toBe(1.393216);
  expect(
    settleWalletDispatch(rows, "cny-weekend", cny, usage, {
      startedAt: "2026-10-09T02:00:00Z",
      finishedAt: "2026-10-09T02:05:00Z"
    })[0]?.chargedCNY
  ).toBe(2.786432);
  expect(settleWalletDispatch(rows, "cny-weekend", cny)).toEqual(rows);
  expect(
    settleWalletDispatch(rows, "cny-weekend", cny, usage, {
      startedAt: "2026-10-11T15:59:00Z",
      finishedAt: "2026-10-11T16:01:00Z"
    })[0]?.chargedCNY
  ).toBe(2.786432);
});

it("allocates only the financial output boundary, preserves UNKNOWN reserves and has no fixed task ceiling", async () => {
  const { prepaidOutputAllocation } = await import("./direct-wallet-budget");
  const rows = [{ id: "unknown", reservedCNY: 0.07524, chargedCNY: 0.07524, verifiedUsage: false }];
  expect(prepaidOutputAllocation(rows, 4, 10928, [])).toEqual({
    outputTokens: 384000,
    reason: "provider-boundary"
  });
  const limited = prepaidOutputAllocation(rows, 2.38268788, 10928, []);
  expect(limited.reason).toBe("wallet-boundary");
  expect(limited.outputTokens).toBeGreaterThan(16384);
  expect((limited.outputTokens * 8 + 10928 * 2) / 1000000 + 0.07524).toBeLessThanOrEqual(
    2.38268788
  );
  expect(() => prepaidOutputAllocation(rows, 0.08, 10928, [])).toThrow("ACCOUNT_EXHAUSTED");
  expect(rows[0]?.verifiedUsage).toBe(false);
});

it("does not debit settled historical estimates a second time from prepaid provider availability", async () => {
  const { prepaidOutputAllocation } = await import("./direct-wallet-budget");
  const settled = [{ id: "paid", reservedCNY: 9.23, chargedCNY: 8.87, verifiedUsage: true }];
  expect(prepaidOutputAllocation(settled, 0.8, 10_000, [])).toEqual(
    prepaidOutputAllocation([], 0.8, 10_000, [])
  );
  const pending = [
    ...settled,
    { id: "in-flight", reservedCNY: 0.7, chargedCNY: 0.7, verifiedUsage: false }
  ];
  const allocation = prepaidOutputAllocation(pending, 0.8, 10_000, []);
  expect(allocation.outputTokens).toBeLessThan(
    prepaidOutputAllocation(settled, 0.8, 10_000, []).outputTokens
  );
  expect(() => prepaidOutputAllocation(pending, 0.71, 10_000, [])).toThrow("ACCOUNT_EXHAUSTED");
});
