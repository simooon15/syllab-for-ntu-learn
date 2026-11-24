import { describe, expect, it } from "vitest";
import { schedulePackages } from "./package-scheduler";

describe("file package admission", () => {
  it("bounds concurrent requests and returns deterministic source order", async () => {
    let active = 0;
    let peak = 0;
    const results = await schedulePackages(
      [0, 1, 2, 3, 4, 5],
      async (value) => {
        peak = Math.max(peak, ++active);
        await new Promise((resolve) => setTimeout(resolve, (6 - value) * 2));
        active -= 1;
        return value;
      },
      { initialConcurrency: 3, maxConcurrency: 3 }
    );
    expect(peak).toBe(3);
    expect(active).toBe(0);
    expect(results).toEqual([0, 1, 2, 3, 4, 5].map((value) => ({ ok: true, value })));
  });

  it("halves admission on pressure, preserves successes, without an estimated memory weight", async () => {
    const limits: number[] = [];
    const results = await schedulePackages(
      [1, 2, 3],
      (value) => {
        if (value === 1) return Promise.reject(new Error("pressure"));
        return Promise.resolve(value);
      },
      {
        initialConcurrency: 4,
        maxConcurrency: 4,
        pressure: () => true,
        onConcurrency: (limit) => limits.push(limit)
      }
    );
    expect(limits).toContain(2);
    expect(results[0]?.ok).toBe(false);
    expect(results.slice(1)).toEqual([
      { ok: true, value: 2 },
      { ok: true, value: 3 }
    ]);
  });

  it("stops admission on fatal failure and waits for already admitted work", async () => {
    const started: number[] = [];
    let settled = false;
    await expect(
      schedulePackages(
        [0, 1, 2, 3],
        async (value) => {
          started.push(value);
          if (value === 0) throw new Error("auth");
          await new Promise((resolve) => setTimeout(resolve, 10));
          settled = true;
          return value;
        },
        { initialConcurrency: 2, fatal: () => true }
      )
    ).rejects.toThrow("auth");
    expect(started).toEqual([0, 1]);
    expect(settled).toBe(true);
  });
});

it("stops admitting after cancellation and drains the admitted package", async () => {
  const controller = new AbortController();
  const started: number[] = [];
  let settled = false;
  await expect(
    schedulePackages(
      [0, 1, 2],
      async (value) => {
        started.push(value);
        controller.abort(new Error("lease lost"));
        await Promise.resolve();
        settled = true;
        return value;
      },
      { initialConcurrency: 1, signal: controller.signal }
    )
  ).rejects.toThrow("lease lost");
  expect(started).toEqual([0]);
  expect(settled).toBe(true);
});

it("returns drained successes and unresolved non-admitted items for local reconciliation", async () => {
  const started: number[] = [];
  const error = new Error("transport failed");
  const result = await schedulePackages(
    [0, 1, 2, 3],
    async (item) => {
      started.push(item);
      await Promise.resolve();
      if (item === 0) throw error;
      return item;
    },
    { initialConcurrency: 2, fatal: () => true, retainSettledOnStop: true }
  );
  expect(started).toEqual([0, 1]);
  expect(result).toEqual([
    { ok: false, error },
    { ok: true, value: 1 },
    { ok: false, error },
    { ok: false, error }
  ]);
});
