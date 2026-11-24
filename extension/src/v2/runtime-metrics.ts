import { stableDigest } from "./chunking";
import { qaTrace } from "./qa-telemetry";

const active = new Map<string, number>();
/** Counts actual lifecycle occupancy. No prompt, source URL, credential or course text. */
export function runtimeSpan(
  kind: "package" | "render" | "ai" | "consolidation",
  scope: string,
  identity: string,
  packageUnitId?: string
): () => void {
  const key = `${scope}:${kind}`;
  const started = performance.now();
  active.set(key, (active.get(key) ?? 0) + 1);
  qaTrace("qa.runtime", {
    phase: "start",
    ...(packageUnitId ? { packageUnitId } : {}),
    kind,
    scopeId: stableDigest(scope),
    unitId: stableDigest(identity),
    active: active.get(key)
  });
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    const remaining = Math.max(0, (active.get(key) ?? 1) - 1);
    if (remaining) active.set(key, remaining);
    else active.delete(key);
    qaTrace("qa.runtime", {
      phase: "end",
      ...(packageUnitId ? { packageUnitId } : {}),
      kind,
      scopeId: stableDigest(scope),
      unitId: stableDigest(identity),
      active: remaining,
      elapsedMs: performance.now() - started
    });
  };
}
export function runtimeWait(
  kind: "package" | "office",
  identity: string,
  started: number,
  scope?: string
): void {
  qaTrace("qa.runtime-wait", {
    kind,
    ...(scope ? { scopeId: stableDigest(scope) } : {}),
    unitId: stableDigest(identity),
    waitMs: performance.now() - started
  });
}
