/** Print mode is view-only. Temporary print documents and disclosures restore afterwards. */
let installed = false;
export function installPrintDisclosure(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const states = new Map<HTMLDetailsElement, boolean>();
  window.addEventListener("beforeprint", () => {
    document.querySelector(".course-screen")?.dispatchEvent(new Event("syllab-prepare-print"));
    states.clear();
    for (const node of Array.from(document.querySelectorAll<HTMLDetailsElement>("#app details"))) {
      states.set(node, node.open);
      node.open = true;
    }
  });
  window.addEventListener("afterprint", () => {
    for (const [node, open] of states) if (node.isConnected) node.open = open;
    states.clear();
    document.querySelectorAll(".course-print-document").forEach((node) => node.remove());
    document
      .querySelectorAll(".has-print-document")
      .forEach((node) => node.classList.remove("has-print-document"));
  });
}
