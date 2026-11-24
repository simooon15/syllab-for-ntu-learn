/** Provider Activity is an ephemeral transport channel, never a Course fact or stored evidence. */
export interface ActivityScope {
  courseId: string;
  workflowId: string;
  task: string;
  /** Metadata-only linkage to the file package; no Source URL or title. */
  packageUnitId?: string;
}
export interface ActivityView {
  task: string;
  snippets: string[];
}

export function redactActivity(text: string, credential: string): string {
  let safe = text;
  if (credential) {
    safe = safe.split(credential).join("");
    // A streamed credential can stop midway through a delta. Remove any matching tail prefix.
    for (let size = Math.min(credential.length - 1, safe.length); size >= 4; size -= 1) {
      if (safe.endsWith(credential.slice(0, size))) {
        safe = safe.slice(0, -size);
        break;
      }
    }
  }
  return safe
    .split(/\n/)
    .filter(
      (line) =>
        !/(?:api[_ -]?key|authorization|bearer|password|secret|DEEPSEEK_|sourceId|evidenceId|workflowId|draftId|assessmentId|system prompt|syllab\.ai|(?:draft|src|source|airun|invocation|chunk)_[\w-]+|https?:\/\/|\/Users\/)/i.test(
          line
        )
    )
    .join("\n")
    .replace(/sk-[a-z0-9_-]+/gi, "")
    .split("")
    .filter(
      (character) => character.charCodeAt(0) >= 32 || character === "\n" || character === "\t"
    )
    .join("")
    .trim()
    .slice(-600);
}

export class ActivityHub {
  private active = new Map<
    string,
    {
      scope: ActivityScope;
      reasoning: string;
      content: string;
      previewReasoning: string;
      previewContent: string;
      recentReasoning: string;
      recentContent: string;
      credential: string;
    }
  >();
  private listeners = new Set<(scope: ActivityScope, view: ActivityView) => void>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe(listener: (scope: ActivityScope, view: ActivityView) => void): () => void {
    this.listeners.add(listener);
    const scopes = new Map(
      [...this.active.values()].map((item) => [item.scope.workflowId, item.scope])
    );
    for (const scope of scopes.values()) this.emit(scope);
    return () => this.listeners.delete(listener);
  }
  start(id: string, scope: ActivityScope, credential: string): void {
    this.active.set(id, {
      scope,
      reasoning: "",
      content: "",
      previewReasoning: "",
      previewContent: "",
      recentReasoning: "",
      recentContent: "",
      credential
    });
  }
  delta(id: string, text: string, channel: "reasoning" | "content" = "reasoning"): void {
    const state = this.active.get(id);
    if (!state) return;
    state[channel] += text;
    // Existing compact UI preview is separate from the complete ephemeral logical content.
    const preview = channel === "reasoning" ? "previewReasoning" : "previewContent";
    state[preview] = (state[preview] + text).slice(-1200);
    const safe = redactActivity(state[preview], state.credential);
    if (safe) {
      if (channel === "reasoning") state.recentReasoning = safe;
      else state.recentContent = safe;
    }
    if (this.timers.has(id)) return;
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        if (this.active.has(id)) this.emit(state.scope);
      }, 200)
    );
  }
  contents(id: string): { reasoning: string; content: string } | null {
    const state = this.active.get(id);
    return state ? { reasoning: state.reasoning, content: state.content } : null;
  }
  end(id: string): void {
    const state = this.active.get(id);
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.active.delete(id);
    if (state) this.emit(state.scope);
  }
  private emit(scope: ActivityScope): void {
    const snippets = [...this.active.values()]
      .filter((item) => item.scope.workflowId === scope.workflowId)
      .map((item) => [item.recentReasoning, item.recentContent].filter(Boolean).join("\n"))
      .filter(Boolean)
      .slice(-3);
    const perSnippet = Math.floor(600 / Math.max(1, snippets.length));
    for (const listener of this.listeners) {
      try {
        listener(scope, {
          task: scope.task,
          snippets: snippets.map((text) => text.slice(-perSnippet))
        });
      } catch {
        /* Disconnected surfaces are disposable. */
      }
    }
  }
}
export const activityHub = new ActivityHub();
