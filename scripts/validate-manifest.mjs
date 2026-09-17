import { readFile } from "node:fs/promises";

const manifestPath = new URL("../extension/dist/manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const requiredPermissions = ["storage", "activeTab", "scripting", "webRequest", "offscreen"];
const allowedPermissions = new Set(requiredPermissions);
const actualPermissions = manifest.permissions ?? [];

for (const permission of requiredPermissions) {
  if (!actualPermissions.includes(permission)) throw new Error(`Missing permission: ${permission}`);
}

for (const permission of actualPermissions) {
  if (!allowedPermissions.has(permission)) throw new Error(`Unexpected permission: ${permission}`);
}

const grantedHosts = manifest.host_permissions ?? [];
if (grantedHosts.length !== 1 || grantedHosts[0] !== "https://ntulearn.ntu.edu.sg/*") {
  throw new Error(`Unexpected install-time host permissions: ${grantedHosts.join(", ")}`);
}

const optionalHosts = new Set(manifest.optional_host_permissions ?? []);
for (const expected of ["https://*.blackboard.com/*", "https://*.prod.files.blackboard.com/*"]) {
  if (!optionalHosts.has(expected))
    throw new Error(`Missing optional host declaration: ${expected}`);
}

if (manifest.manifest_version !== 3) throw new Error("Manifest V3 is required");
if (manifest.content_security_policy?.extension_pages.includes("http")) {
  throw new Error("Remote extension code is forbidden");
}

process.stdout.write("Manifest validation passed.\n");
