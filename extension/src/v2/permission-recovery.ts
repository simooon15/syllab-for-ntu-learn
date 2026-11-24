/** Only exact Blackboard redirect origins already observed by Fetch can be requested. */
export async function missingRecordedPermissionPatterns(): Promise<string[]> {
  const key = "syllab.permissionOrigins";
  const stored = await chrome.storage.local.get(key);
  const value: unknown = stored[key];
  if (!Array.isArray(value)) return [];
  const patterns = new Set<string>();
  for (const entry of value as unknown[]) {
    if (typeof entry !== "string") continue;
    try {
      const url = new URL(entry);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.port ||
        url.origin !== entry ||
        !url.hostname.endsWith(".blackboard.com") ||
        !/^[a-z0-9.-]+$/.test(url.hostname)
      )
        continue;
      const pattern = `${url.origin}/*`;
      if (!(await chrome.permissions.contains({ origins: [pattern] }))) patterns.add(pattern);
    } catch {
      /* Malformed metadata cannot expand a permission request. */
    }
  }
  return [...patterns];
}
