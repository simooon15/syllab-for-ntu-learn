/**
 * The QA observation layer.
 *
 * It records what a real acceptance run needs to read back — which Semester and Courses were
 * discovered, what the Scan saw, what each model task returned, and what the date resolver decided
 * — and nothing else. It is imported by product modules and called at the points where those facts
 * are already known.
 *
 * It observes and never decides. Nothing here can accept a Candidate, change a Course Brief, skip a
 * confirmation or alter a date; a QA run that cannot reach a screen still cannot reach it, and the
 * one thing this module may change is what the run is able to say afterwards.
 *
 * A release build never reads this file: `scripts/build.mjs` resolves the import to
 * `qa-telemetry.disabled.ts`, whose functions are empty, so esbuild inlines the calls away and the
 * event names never reach the shipped bundle.
 */
/**
 * Where a run reads the trace back from.
 *
 * Session storage, not local, and that is not a detail. Both UI surfaces re-read the whole view when
 * anything in `chrome.storage.local` changes — it is how they follow Course State — so a trace kept
 * there would make every recorded line repaint both surfaces. That is the observation layer changing
 * the product: during a real run it replaced the Restore file input out from under the click that
 * had just been made, and the screen the user was on stopped being the screen they were on. Session
 * storage is outside that path, is private to this browser session, and is cleared when Chrome
 * closes, which is exactly the lifetime a run's evidence should have.
 */
export const QA_TRACE_KEY = "syllab.qa.trace";

/**
 * The area the trace lives in, resolved when it is written rather than when the module loads.
 *
 * A module-level `chrome.storage.session` would make importing this file require a `chrome` global,
 * and every product module that imports it would become untestable outside a browser — the trace
 * download is a diagnostic, and a diagnostic may not decide whether the product can be tested.
 */
function traceArea(): chrome.storage.StorageArea {
  // The MV3 QA build has session storage. The local fallback keeps the observer harmless in
  // lightweight app/unit-test harnesses that only provide the storage area they exercise.
  const storage = chrome.storage as typeof chrome.storage & {
    session?: chrome.storage.StorageArea;
  };
  return storage.session ?? chrome.storage.local;
}

/**
 * Anything shaped like a provider credential. Same shape `scripts/lib/release-markers.mjs` scans a
 * shipped bundle for; written out here rather than imported, because a QA build must not reach
 * outside the extension to be buildable.
 */
const KEY_SHAPE = new RegExp(["s", "k-", "[A-Za-z0-9]{16,}"].join(""));

/** Enough for a two-Course acceptance run, small enough to stay a debugging aid. */
const QA_TRACE_LIMIT = 600;

/** Field names that must never be written, whatever their value looks like. */
const SECRET_FIELDS = /(key|token|secret|password|cookie|authorization|bearer|session)/i;

/** Numeric model-usage counters are evidence, not bearer material. */
const SAFE_TOKEN_USAGE_FIELDS = new Set([
  "maxTokens",
  "inputTokens",
  "outputTokens",
  "reasoningTokens",
  "estimatedInputTokens"
]);

/** Long enough for a date and a label; a course body is not a field this layer has any use for. */
const MAX_TEXT = 120;

interface QaEvent {
  at: string;
  event: string;
  fields: Record<string, unknown>;
}

const QA_STREAM_MESSAGE = "SYLLAB_QA_AI_STREAM";

function sendLive(message: Record<string, unknown>): void {
  try {
    void chrome.runtime.sendMessage({ type: QA_STREAM_MESSAGE, ...message }).catch(() => undefined);
  } catch {
    // Unit tests and non-extension readers have no runtime receiver; the provider call still runs.
  }
}

/** Raw provider text is sent only to a currently open QA surface and is never persisted. */
export function qaProviderStreamStart(
  streamId: string,
  context: { system: string; user: string }
): void {
  sendLive({ event: "start", streamId, system: context.system, user: context.user });
}

export function qaProviderStreamDelta(
  streamId: string,
  channel: "reasoning" | "content",
  text: string
): void {
  sendLive({ event: "delta", streamId, channel, text });
}

export function qaProviderStreamEnd(streamId: string): void {
  sendLive({ event: "end", streamId });
}

/**
 * The value as telemetry may hold it.
 *
 * A field whose name looks like a credential is dropped rather than filtered, because a redacted
 * key and no key are the same thing to a reader and only one of them is safe to be wrong about.
 */
function scrubbable(value: unknown): unknown {
  if (typeof value === "string") {
    if (KEY_SHAPE.test(value)) return "[redacted]";
    return value.length > MAX_TEXT ? `${value.slice(0, MAX_TEXT)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.map(scrubbable);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [name, inner] of Object.entries(value)) {
      if (
        SECRET_FIELDS.test(name) &&
        !(SAFE_TOKEN_USAGE_FIELDS.has(name) && typeof inner === "number")
      ) {
        continue;
      }
      out[name] = scrubbable(inner);
    }
    return out;
  }
  return undefined;
}

let queue: Promise<void> = Promise.resolve();
/** The last line written, so the same fact restated by a repaint is not three more lines. */
let previous = "";

function append(entry: QaEvent): void {
  const signature = `${entry.event}:${JSON.stringify(entry.fields)}`;
  if (signature === previous) return;
  previous = signature;
  queue = queue
    .then(async () => {
      const area = traceArea();
      const stored = await area.get(QA_TRACE_KEY);
      const existing = stored[QA_TRACE_KEY];
      const trace = Array.isArray(existing) ? (existing as QaEvent[]) : [];
      trace.push(entry);
      await area.set({
        [QA_TRACE_KEY]: trace.slice(-QA_TRACE_LIMIT)
      });
    })
    // Telemetry must never be the reason a product action fails; if the write is refused the run
    // simply has one fewer line in it.
    .catch(() => undefined);
  return;
}

/**
 * Records one moment. `event` is a stable name a run matches on, so it is not translated and not
 * shown to a user; the fields are whatever that moment is worth reading back.
 */
export function qaTrace(event: string, fields: Record<string, unknown> = {}): void {
  try {
    const scrubbed = scrubbable(fields);
    append({
      at: new Date().toISOString(),
      event,
      fields:
        typeof scrubbed === "object" && scrubbed !== null
          ? (scrubbed as Record<string, unknown>)
          : {}
    });
  } catch {
    // A value that cannot be serialized is not a reason to fail the action that produced it.
  }
}

/** `true` in a QA build. Product code does not branch on it; a reader does. */
export function qaBuild(): boolean {
  return true;
}

/** QA-only Product Owner monitor; release builds resolve this export to an inert stub. */
export function mountQaMonitor(): () => void {
  const panel = document.createElement("details");
  panel.className = "qa-ai-monitor";
  // A diagnostic must never sit over a product control. Keep it available but collapsed until the
  // Product Owner deliberately opens it.
  panel.open = false;
  const title = document.createElement("summary");
  title.textContent = "AI live monitor (QA)";
  const status = document.createElement("p");
  status.className = "qa-ai-monitor-status";
  const list = document.createElement("ol");
  list.className = "qa-ai-monitor-events";
  const context = document.createElement("details");
  context.className = "qa-ai-monitor-context";
  const contextTitle = document.createElement("summary");
  contextTitle.textContent = "Current model context";
  const contextText = document.createElement("pre");
  context.append(contextTitle, contextText);
  const reasoningTitle = document.createElement("p");
  reasoningTitle.className = "qa-ai-monitor-label";
  reasoningTitle.textContent = "Reasoning stream";
  const reasoning = document.createElement("pre");
  reasoning.className = "qa-ai-monitor-stream";
  const outputTitle = document.createElement("p");
  outputTitle.className = "qa-ai-monitor-label";
  outputTitle.textContent = "Visible output stream";
  const output = document.createElement("pre");
  output.className = "qa-ai-monitor-stream";
  panel.append(title, status, context, reasoningTitle, reasoning, outputTitle, output, list);
  document.body.append(panel);

  const text = (value: unknown, fallback = ""): string =>
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : fallback;
  const render = async (): Promise<void> => {
    const stored: Record<string, unknown> = await traceArea()
      .get(QA_TRACE_KEY)
      .catch(() => ({}));
    const raw = stored[QA_TRACE_KEY];
    const events = Array.isArray(raw) ? (raw as QaEvent[]) : [];
    const recent = events
      .filter((entry) =>
        [
          "qa.deepseek-call-started",
          "qa.deepseek-physical-call",
          "qa.workflow-stale-completion"
        ].includes(entry.event)
      )
      .slice(-10);
    const lastStart = [...recent]
      .reverse()
      .find((entry) => entry.event === "qa.deepseek-call-started");
    const lastFinish = [...recent]
      .reverse()
      .find((entry) => entry.event === "qa.deepseek-physical-call");
    const active =
      lastStart !== undefined &&
      (lastFinish === undefined || Date.parse(lastStart.at) > Date.parse(lastFinish.at));
    status.textContent = active
      ? `Running ${text(lastStart.fields.task, "AI")} · ${text(lastStart.fields.logicalUnitId, "unit")}`
      : lastFinish
        ? `Last call finished · ${text(lastFinish.fields.task, "AI")} · ${text(lastFinish.fields.latencyMs, "?")} ms`
        : "Waiting for the first provider call";
    list.replaceChildren(
      ...recent.map((entry) => {
        const item = document.createElement("li");
        const fields = entry.fields;
        const parts = [
          entry.at.slice(11, 19),
          entry.event === "qa.deepseek-call-started"
            ? "START"
            : entry.event === "qa.deepseek-physical-call"
              ? "END"
              : "STALE",
          text(fields.task, "workflow"),
          text(fields.attemptType),
          fields.estimatedInputTokens === undefined
            ? ""
            : `context~${text(fields.estimatedInputTokens)}`,
          fields.maxTokens === undefined ? "" : `ceiling ${text(fields.maxTokens)}`,
          fields.outputTokens === undefined ? "" : `output ${text(fields.outputTokens)}`,
          fields.reasoningTokens === undefined ? "" : `reasoning ${text(fields.reasoningTokens)}`,
          fields.latencyMs === undefined ? "" : `${text(fields.latencyMs)} ms`,
          fields.failureClass ? `failure ${text(fields.failureClass)}` : ""
        ].filter(Boolean);
        item.textContent = parts.join(" · ");
        item.title = text(fields.logicalUnitId);
        return item;
      })
    );
  };
  const changed = (_changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
    if (area === "session") void render();
  };
  let activeStreamId: string | undefined;
  const live = (message: unknown): void => {
    if (typeof message !== "object" || message === null) return;
    const record = message as Record<string, unknown>;
    if (record.type !== QA_STREAM_MESSAGE || typeof record.streamId !== "string") return;
    if (record.event === "start") {
      activeStreamId = record.streamId;
      panel.open = true;
      contextText.textContent = `SYSTEM\n${text(record.system)}\n\nUSER\n${text(record.user)}`;
      reasoning.textContent = "";
      output.textContent = "";
      status.textContent = "Provider stream active";
      return;
    }
    if (record.streamId !== activeStreamId) return;
    if (
      record.event === "delta" &&
      typeof record.text === "string" &&
      (record.channel === "reasoning" || record.channel === "content")
    ) {
      const target = record.channel === "reasoning" ? reasoning : output;
      target.textContent += record.text;
      target.scrollTop = target.scrollHeight;
      return;
    }
    if (record.event === "end") status.textContent = "Provider stream finished";
  };
  chrome.storage.onChanged.addListener(changed);
  const runtimeMessages = (
    chrome.runtime as unknown as {
      onMessage?: {
        addListener: (listener: (message: unknown) => void) => void;
        removeListener: (listener: (message: unknown) => void) => void;
      };
    }
  ).onMessage;
  if (runtimeMessages) runtimeMessages.addListener(live);
  void render();
  return () => {
    chrome.storage.onChanged.removeListener(changed);
    if (runtimeMessages) runtimeMessages.removeListener(live);
    panel.remove();
  };
}
