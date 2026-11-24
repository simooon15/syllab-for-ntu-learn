/** Syntax-only recovery: preserve raw bytes; never edit a field or select among multiple answers. */
export type DirectFormatRecovery = "TRAILING_MARKDOWN_FENCE" | "EXCESS_CLOSING_BRACES";
export function decodeDirectCapture(raw: string): {
  value: unknown;
  formatRecovery?: DirectFormatRecovery;
} {
  try {
    return { value: JSON.parse(raw) as unknown };
  } catch {
    /* bounded delimiter recovery below */
  }
  const trimmed = raw.trimEnd();
  if (trimmed.endsWith("```"))
    return {
      value: JSON.parse(trimmed.slice(0, -3)) as unknown,
      formatRecovery: "TRAILING_MARKDOWN_FENCE"
    };
  for (let n = 1; n <= 3; n++) {
    if (trimmed.slice(-n) !== "}".repeat(n)) break;
    try {
      return {
        value: JSON.parse(trimmed.slice(0, -n)) as unknown,
        formatRecovery: "EXCESS_CLOSING_BRACES"
      };
    } catch {
      /* no complete JSON value yet */
    }
  }
  throw Error("JSON");
}
