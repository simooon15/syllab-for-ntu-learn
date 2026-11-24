/** Only exact Blackboard redirect origins declared in optional_host_permissions can be requested. */
export function isAllowedOptionalOrigin(entry: string): boolean {
  try {
    const url = new URL(entry);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.origin === entry &&
      url.hostname.endsWith(".blackboard.com") &&
      /^[a-z0-9.-]+$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}

/** Only exact Blackboard redirect origins already observed by Fetch can be requested. */
export async function missingRecordedPermissionPatterns(): Promise<string[]> {
  const key = "syllab.permissionOrigins";
  const stored = await chrome.storage.local.get(key);
  const value: unknown = stored[key];
  if (!Array.isArray(value)) return [];
  const patterns = new Set<string>();
  for (const entry of value as unknown[]) {
    if (typeof entry !== "string" || !isAllowedOptionalOrigin(entry)) continue;
    const pattern = `${entry}/*`;
    if (!(await chrome.permissions.contains({ origins: [pattern] }))) patterns.add(pattern);
  }
  return [...patterns];
}
