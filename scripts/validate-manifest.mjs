import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const manifestPath = new URL("../extension/dist/manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const requiredPermissions = [
  "storage",
  "activeTab",
  "scripting",
  "webRequest",
  "offscreen",
  "sidePanel",
  "tabs",
  "alarms",
  "downloads"
];
const allowedPermissions = new Set(requiredPermissions);
const actualPermissions = manifest.permissions ?? [];

for (const permission of requiredPermissions) {
  if (!actualPermissions.includes(permission)) throw new Error(`Missing permission: ${permission}`);
}

for (const permission of actualPermissions) {
  if (!allowedPermissions.has(permission)) throw new Error(`Unexpected permission: ${permission}`);
}

const grantedHosts = new Set(manifest.host_permissions ?? []);
if (
  grantedHosts.size !== 2 ||
  !grantedHosts.has("https://ntulearn.ntu.edu.sg/*") ||
  !grantedHosts.has("https://api.deepseek.com/*")
) {
  throw new Error(`Unexpected install-time host permissions: ${[...grantedHosts].join(", ")}`);
}

const optionalHosts = new Set(manifest.optional_host_permissions ?? []);
for (const expected of ["https://*.blackboard.com/*", "https://*.prod.files.blackboard.com/*"]) {
  if (!optionalHosts.has(expected))
    throw new Error(`Missing optional host declaration: ${expected}`);
}

if (manifest.manifest_version !== 3) throw new Error("Manifest V3 is required");
if (manifest.action?.default_popup) throw new Error("v0.2.0 must not declare a Popup");
if (manifest.side_panel?.default_path !== "sidepanel.html") {
  throw new Error("Side Panel entry is required");
}
if (manifest.content_security_policy?.extension_pages.includes("http")) {
  throw new Error("Remote extension code is forbidden");
}

// Every declared icon must exist in the built bundle: the Product Mark is the one asset a user
// sees before the product opens, and a path that resolves to nothing ships an empty toolbar slot.
const dist = new URL("../extension/dist/", import.meta.url);
const declared = [
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {})
];
if (declared.length === 0) throw new Error("The manifest declares no icons");
for (const icon of new Set(declared)) {
  try {
    await access(new URL(icon, dist));
  } catch {
    throw new Error(`Declared icon is not in the bundle: ${icon}`);
  }
}

// The locked brand set: the SVG Master lives in the repository, the PNGs are what ships.
// `fileURLToPath` rather than `.pathname`: this repository path contains a space, which a URL
// pathname keeps percent-encoded.
const master = fileURLToPath(new URL("../assets/logo/syllab-logo-master.svg", import.meta.url));
try {
  await readFile(master, "utf8");
} catch {
  throw new Error("The Product Mark SVG Master is missing from assets/logo/");
}

process.stdout.write(
  `Manifest validation passed (${String(new Set(declared).size)} icons resolve, Product Mark Master present).\n`
);
