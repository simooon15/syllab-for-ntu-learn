import { describe, it, expect } from "vitest";
import {
  reserveDirectDispatch,
  settleDirectDispatch,
  DIRECT_DISPATCH_RESERVE_USD
} from "./direct-dispatch-budget";
describe("independent physical dispatch count and USD hard limits", () => {
  const approval = {
    approvalReference: "synthetic test authorization",
    maxPhysicalCalls: 2,
    maxUSD: 2
  };
  it("rejects zero authority and duplicate dispatch IDs", () => {
    expect(() => reserveDirectDispatch([], { ...approval, maxPhysicalCalls: 0 }, "a")).toThrow(
      "AUTHORIZATION_REQUIRED"
    );
    const rows = reserveDirectDispatch([], approval, "a");
    expect(() => reserveDirectDispatch(rows, approval, "a")).toThrow("LEDGER_IDENTITY");
  });
  it("counts failed/unknown calls and continuation IDs without releasing unknown charges", () => {
    const rows = reserveDirectDispatch(
      reserveDirectDispatch([], approval, "a"),
      approval,
      "continuation"
    );
    expect(() => reserveDirectDispatch(rows, approval, "retry")).toThrow("CALL_LIMIT");
    expect(settleDirectDispatch(rows, "a")).toEqual(rows);
    expect(rows.every((r) => r.chargedUSD === DIRECT_DISPATCH_RESERVE_USD)).toBe(true);
  });
  it("enforces USD before dispatch independently from call count", () => {
    const low = { ...approval, maxUSD: DIRECT_DISPATCH_RESERVE_USD + 0.01 };
    const rows = reserveDirectDispatch([], low, "a");
    expect(() => reserveDirectDispatch(rows, low, "b")).toThrow("USD_LIMIT");
    const settled = settleDirectDispatch(rows, "a", { inputTokens: 100, outputTokens: 100 });
    expect(reserveDirectDispatch(settled, low, "b")).toHaveLength(2);
    expect(() =>
      settleDirectDispatch(settled, "a", { inputTokens: 200, outputTokens: 100 })
    ).toThrow("SETTLEMENT_CONFLICT");
  });
});
