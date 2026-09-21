/**
 * The observation layer of a release build: every call site is real, and this is what it reaches.
 *
 * The exported names are the ones `qa-telemetry.ts` exports, so a product module imports one path
 * and the build decides what is behind it. The bodies are deliberately empty — an empty function is
 * what esbuild inlines away, which is how the caller's event name leaves the shipped bundle too.
 */
export const QA_TRACE_KEY = "syllab.qa.trace";

export function qaTrace(_event: string, _fields: Record<string, unknown> = {}): void {
  return;
}

export function qaBuild(): boolean {
  return false;
}

export function mountQaMonitor(): () => void {
  return () => undefined;
}

export function qaProviderStreamStart(
  _streamId: string,
  _context: { system: string; user: string }
): void {
  return;
}

export function qaProviderStreamDelta(
  _streamId: string,
  _channel: "reasoning" | "content",
  _text: string
): void {
  return;
}

export function qaProviderStreamEnd(_streamId: string): void {
  return;
}
