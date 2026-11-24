/** One text node per channel. Frame-coalesced appends preserve every character without per-delta
 * DOM nodes, cumulative rewrites, layout reads, timers or capacity limits.
 */
export class StreamTextRenderer {
  private node: Text;
  private pending: string[] = [];
  private full = "";
  private frame: number | undefined;
  private disposed = false;
  private visible = true;
  constructor(
    private target: HTMLElement,
    private schedule: (callback: FrameRequestCallback) => number = (callback) =>
      requestAnimationFrame(callback),
    private cancel: (id: number) => void = (id) => cancelAnimationFrame(id),
    private projection?: (text: string) => string
  ) {
    this.node = target.ownerDocument.createTextNode("");
    target.replaceChildren(this.node);
  }
  append(text: string): void {
    if (this.disposed) return;
    this.pending.push(text);
    if (this.visible && this.frame === undefined)
      this.frame = this.schedule(() => {
        this.frame = undefined;
        this.flush();
      });
  }
  flush(): void {
    if (this.disposed || !this.visible) return;
    if (this.frame !== undefined) this.cancel(this.frame);
    this.frame = undefined;
    if (this.pending.length) {
      this.full += this.pending.join("");
      if (this.projection) this.node.data = this.projection(this.full);
      else this.node.appendData(this.pending.join(""));
      this.pending = [];
    }
  }
  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) this.flush();
    else if (this.frame !== undefined) {
      this.cancel(this.frame);
      this.frame = undefined;
    }
  }
  contents(): string {
    return this.full + this.pending.join("");
  }
  clear(): void {
    if (this.frame !== undefined) this.cancel(this.frame);
    this.frame = undefined;
    this.pending = [];
    this.node.data = "";
    this.full = "";
  }
  dispose(): void {
    this.clear();
    this.disposed = true;
    this.target.replaceChildren();
  }
}

/** QA viewport projection. Dimensions are measured from the existing monitor, not capacity guesses. */
export function viewportProjection(target: HTMLElement, text: string): string {
  const style = getComputedStyle(target);
  const canvas = target.ownerDocument.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return "Live projection unavailable; complete private trace retained.";
  context.font = style.font;
  const width = context.measureText("M").width;
  const line = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize);
  const height =
    Number.parseFloat(style.maxHeight) || target.ownerDocument.defaultView?.innerHeight || 0;
  const columns = Math.floor(target.clientWidth / width),
    rows = Math.floor(height / line);
  if (columns <= 0 || rows <= 0)
    return "Live projection waiting for visible viewport; complete private trace retained.";
  const capacity = columns * rows;
  return text.length > capacity
    ? "Latest viewport · complete private trace retained\n" + text.slice(-capacity)
    : text;
}
