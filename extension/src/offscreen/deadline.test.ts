import { afterEach, expect, it, vi } from "vitest";
import { withinDeadline } from "./deadline";

afterEach(() => vi.useRealTimers());

it("rejects a renderer that never completes and clears its deadline", async () => {
  vi.useFakeTimers();
  const result = withinDeadline(new Promise<never>(() => undefined), 30_000);
  const check = expect(result).rejects.toThrow("VISUAL_RENDER_TIMEOUT");
  await vi.advanceTimersByTimeAsync(30_000);
  await check;
  expect(vi.getTimerCount()).toBe(0);
});

it("preserves successful results and original errors without leaving timers", async () => {
  vi.useFakeTimers();
  await expect(withinDeadline(Promise.resolve("rendered"), 30_000)).resolves.toBe("rendered");
  await expect(withinDeadline(Promise.reject(new Error("damaged PDF")), 30_000)).rejects.toThrow(
    "damaged PDF"
  );
  expect(vi.getTimerCount()).toBe(0);
});
