import { installPrintDisclosure } from "../v2/screens/print";
import { mount, type MountHandle } from "../v2/screens/mount";

let activeHandle: MountHandle | undefined;

/**
 * Boots the surface the page declares. Both surfaces render the same screens; only density
 * and copy differ, and never the semantics.
 */
export function boot(): void {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("APP_ROOT_MISSING");
  const surface =
    document.documentElement.dataset.surface === "side-panel" ? "side-panel" : "full-page";
  installPrintDisclosure();
  activeHandle?.dispose();
  const handle = mount({ root, surface });
  activeHandle = handle;
  if (typeof window !== "undefined") {
    window.addEventListener(
      "pagehide",
      () => {
        if (activeHandle === handle) {
          activeHandle.dispose();
          activeHandle = undefined;
        }
      },
      { once: true }
    );
  }
}

if (document.querySelector("#app")) boot();
