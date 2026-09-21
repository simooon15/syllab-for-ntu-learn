import { mount } from "../v2/screens/mount";

/**
 * Boots the surface the page declares. Both surfaces render the same screens; only density
 * and copy differ, and never the semantics.
 */
export function boot(): void {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("APP_ROOT_MISSING");
  const surface =
    document.documentElement.dataset.surface === "side-panel" ? "side-panel" : "full-page";
  mount({ root, surface });
}

if (document.querySelector("#app")) boot();
