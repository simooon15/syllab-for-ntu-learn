/** Detect repeated reasoning checkpoints, not token count or semantic truth.
 * Three recurrences of the same three distinct complete lines before any answer is a
 * runaway signal. Two passes remain possible. The saved 384k failure repeated such
 * checkpoints hundreds of times. This heuristic fails closed; it never certifies work.
 */
export class ReasoningCycleGuard {
  private pending = "";
  private lines: string[] = [];
  private readonly visits = new Map<string, number>();
  add(delta: string): boolean {
    this.pending += delta;
    const completed = this.pending.split("\n");
    this.pending = completed.pop() ?? "";
    for (const raw of completed) {
      const line = raw.trim().replace(/\s+/g, " ");
      if (!line) continue;
      // Repeated JSON fields across separate propositions are ordinary output planning.
      // Break the checkpoint window rather than joining prose around ignored structures.
      if (["{", "}", "[", "]", '"', ","].includes(line[0] ?? "")) {
        this.lines = [];
        continue;
      }
      this.lines.push(line);
      if (this.lines.length > 3) this.lines.shift();
      if (this.lines.length !== 3 || new Set(this.lines).size !== 3) continue;
      const checkpoint = JSON.stringify(this.lines);
      const count = (this.visits.get(checkpoint) ?? 0) + 1;
      this.visits.set(checkpoint, count);
      if (count >= 3) return true;
    }
    return false;
  }
}
