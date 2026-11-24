/** Shared surface continuity: fresh event handlers, retained edits/focus, and interruptible layout. */
export function replaceSurface(root: HTMLElement, nodes: HTMLElement[], sameScreen: boolean): void {
  const focused = typeof document === "undefined" ? undefined : document.activeElement;
  const edits = new Map<
    string,
    { value: string; focused: boolean; start: number | null; end: number | null }
  >();
  if (sameScreen)
    for (const input of Array.from(
      root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input[data-edit-key], select[data-edit-key]"
      )
    )) {
      if (!input.dataset.editKey) continue;
      edits.set(input.dataset.editKey, {
        value: input.value,
        focused: input === focused,
        start: "selectionStart" in input ? input.selectionStart : null,
        end: "selectionEnd" in input ? input.selectionEnd : null
      });
    }
  const oldHeight =
    typeof root.getBoundingClientRect === "function" ? root.getBoundingClientRect().height : 0;
  root.replaceChildren(...nodes);
  for (const input of Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input[data-edit-key], select[data-edit-key]"
    )
  )) {
    const previous = edits.get(input.dataset.editKey ?? "");
    if (!previous) continue;
    input.value = previous.value;
    if (previous.focused && typeof input.focus === "function") {
      input.focus({ preventScroll: true });
      if (previous.start !== null && "setSelectionRange" in input)
        input.setSelectionRange(previous.start, previous.end);
    }
  }
  if (
    typeof matchMedia !== "function" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    typeof root.animate !== "function"
  )
    return;
  // Read the displayed geometry before replacement; reversals start there, not at a stale target.
  root.getAnimations().forEach((animation) => animation.cancel());
  if (!sameScreen) {
    root.animate(
      [
        { opacity: 0.6, transform: "translateY(3px)" },
        { opacity: 1, transform: "none" }
      ],
      { duration: 200, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }
    );
  } else {
    const height = root.getBoundingClientRect().height;
    if (oldHeight > 0 && Math.abs(height - oldHeight) > 1)
      root.animate(
        [{ minHeight: `${String(oldHeight)}px` }, { minHeight: `${String(height)}px` }],
        {
          duration: 180,
          easing: "cubic-bezier(0.2, 0.7, 0.2, 1)"
        }
      );
  }
}
