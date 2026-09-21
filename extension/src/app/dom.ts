/**
 * The only DOM construction helpers the v0.2.0 surfaces use. Everything is built with
 * `document.createElement`; there is no framework and no template layer.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Writes dataset entries, skipping the ones this render pass does not set. */
export function data<T extends HTMLElement>(
  node: T,
  values: Record<string, string | number | undefined>
): T {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    node.dataset[key] = String(value);
  }
  return node;
}

export function attr<T extends HTMLElement>(
  node: T,
  values: Record<string, string | undefined>
): T {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    node.setAttribute(key, value);
  }
  return node;
}

/** A button that runs one handler. Buttons are the only interactive element in the product. */
export function control(
  label: string,
  className: string,
  onActivate: () => void,
  options: { title?: string; disabled?: boolean } = {}
): HTMLButtonElement {
  const node = el("button", className, label);
  node.type = "button";
  if (options.title !== undefined) node.title = options.title;
  if (options.disabled === true) node.disabled = true;
  node.addEventListener("click", onActivate);
  return node;
}

export function paragraph(className: string, text: string): HTMLParagraphElement {
  return el("p", className, text);
}

/** Appends children in order, ignoring the ones a render pass chose not to build. */
export function append(
  parent: HTMLElement,
  ...children: Array<HTMLElement | null | undefined>
): void {
  for (const child of children) {
    if (child) parent.append(child);
  }
}

/** Long prose (a requirement, a fact value) is cut at a reading-friendly length. */
export const PROSE_LIMIT = 180;
