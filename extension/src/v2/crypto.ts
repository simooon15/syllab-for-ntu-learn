export function randomId(prefix: string): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const suffix = [...bytes].map((item) => item.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${suffix}`;
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  // TypeScript types JSON.stringify as always returning a string, but it yields undefined for
  // values with no JSON form, and a canonical string still needs bytes there. Widening through
  // `unknown` states that gap instead of pretending the declared type is the whole truth.
  const encoded: unknown = JSON.stringify(value);
  return typeof encoded === "string" ? encoded : "null";
}

/** Collapses every whitespace run, including newlines: layout noise must not change a hash. */
export function canonicalInlineText(value: string): string {
  return canonicalText(value).replace(/\s+/g, " ").trim();
}

export function canonicalText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00a0 ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
