import { runtimeWait } from "./runtime-metrics";
/** File packages run concurrently; callers commit semantic results in Source order afterwards. */
export type PackageOutcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

export interface PackageScheduleOptions<T> {
  identity?: (item: T) => string;
  scope?: string;
  initialConcurrency?: number;
  maxConcurrency?: number;
  pressure?: (error: unknown) => boolean;
  fatal?: (error: unknown) => boolean;
  cooldown?: (error: unknown) => number;
  signal?: AbortSignal;
  onConcurrency?: (limit: number) => void;
  /** Drain and return per-item outcomes so a workflow can still commit verified successes. */
  retainSettledOnStop?: boolean;
}

/** AIMD backpressure: pressure halves admission, sustained successes restore it gradually. */
export async function schedulePackages<T, R>(
  items: readonly T[],
  run: (item: T, index: number) => Promise<R>,
  options: PackageScheduleOptions<T> = {}
): Promise<PackageOutcome<R>[]> {
  const maximum = Math.max(1, options.maxConcurrency ?? items.length);
  let limit = Math.max(1, Math.min(maximum, options.initialConcurrency ?? 10));
  const results: PackageOutcome<R>[] = [];
  const active = new Map<number, Promise<void>>();
  const queuedAt = performance.now();
  let next = 0;
  let successes = 0;
  let stopped = false;
  let fatalError: { error: unknown } | undefined;
  let blockedUntil = 0;
  const setLimit = (value: number) => {
    limit = value;
    options.onConcurrency?.(limit);
  };
  options.onConcurrency?.(limit);
  while (next < items.length || active.size) {
    if (options.signal?.aborted) stopped = true;
    if (!stopped && Date.now() < blockedUntil) {
      await new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          options.signal?.removeEventListener("abort", done);
          resolve();
        };
        const timer = setTimeout(done, Math.min(2_147_483_647, blockedUntil - Date.now()));
        options.signal?.addEventListener("abort", done, { once: true });
        if (active.size) void Promise.race(active.values()).then(done);
      });
      continue;
    }
    while (!stopped && next < items.length && active.size < limit) {
      const index = next;
      const item = items[index] as T;
      next += 1;
      // Defer execution so even a synchronous throw is a settled package and admission is atomic.
      const promise = Promise.resolve()
        .then(() => {
          runtimeWait(
            "package",
            options.identity?.(item) ?? String(index),
            queuedAt,
            options.scope
          );
          return run(item, index);
        })
        .then(
          (value) => {
            results[index] = { ok: true, value };
            successes += 1;
            if (successes >= limit && limit < maximum) {
              successes = 0;
              setLimit(limit + 1);
            }
          },
          (error: unknown) => {
            results[index] = { ok: false, error };
            if (options.pressure?.(error)) {
              successes = 0;
              blockedUntil = Math.max(
                blockedUntil,
                Date.now() + Math.max(0, options.cooldown?.(error) ?? 0)
              );
              setLimit(Math.max(1, Math.floor(limit / 2)));
            }
            if (options.fatal?.(error)) {
              stopped = true;
              fatalError ??= { error };
            }
          }
        )
        .finally(() => {
          active.delete(index);
        });
      active.set(index, promise);
    }
    if (active.size) await Promise.race(active.values());
    else break;
  }
  // Already admitted calls settle before returning, so no late write can escape the phase.
  if (options.retainSettledOnStop && (stopped || options.signal?.aborted)) {
    const failure = fatalError ?? Object.values(results).find((result) => !result.ok);
    const reason: unknown =
      options.signal?.reason ??
      (failure ? failure.error : new DOMException("Package was not admitted", "AbortError"));
    for (let index = 0; index < items.length; index++)
      results[index] ??= { ok: false, error: reason };
    return results;
  }
  if (options.signal?.aborted)
    throw options.signal.reason instanceof Error
      ? options.signal.reason
      : new DOMException("Cancelled", "AbortError");
  if (stopped) {
    const failure =
      fatalError ??
      Object.values(results).find((result): result is { ok: false; error: unknown } => !result.ok);
    if (failure) throw failure.error;
  }
  return results;
}
