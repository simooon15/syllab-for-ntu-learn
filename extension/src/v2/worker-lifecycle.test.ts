import { afterEach, expect, it, vi } from "vitest";
import { withActiveWorker } from "./worker-lifecycle";
afterEach(() => vi.useRealTimers());
it("keeps only an active long operation alive and releases on success", async () => {
  vi.useFakeTimers();
  const pulse = vi.fn(() => Promise.resolve());
  let finish: () => void = () => undefined;
  const pending = withActiveWorker(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    pulse,
    () => undefined
  );
  await vi.advanceTimersByTimeAsync(55_000);
  expect(pulse).toHaveBeenCalledTimes(2);
  finish();
  await pending;
  await vi.advanceTimersByTimeAsync(55_000);
  expect(pulse).toHaveBeenCalledTimes(2);
});
it("reports pulse failure and releases the heartbeat on operation failure", async () => {
  vi.useFakeTimers();
  const failed = vi.fn();
  let reject: (e: Error) => void = () => undefined;
  const pending = withActiveWorker(
    () =>
      new Promise<void>((_r, j) => {
        reject = j;
      }),
    () => Promise.reject(Error("synthetic")),
    failed
  );
  await vi.advanceTimersByTimeAsync(25_000);
  expect(failed).toHaveBeenCalledTimes(1);
  const check = expect(pending).rejects.toThrow("operation");
  reject(Error("operation"));
  await check;
  expect(vi.getTimerCount()).toBe(0);
});
