/** A failure the UI can render from a stable code, never from an internal message. */
export class CodedError extends Error {
  constructor(
    readonly code: string,
    message: string = code
  ) {
    super(message);
    this.name = "CodedError";
  }
}

/** Checked access after contract validation; fail rather than silently losing a required scope. */
export function requirePresent<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new CodedError("REQUIRED_VALUE_MISSING");
  return value;
}
