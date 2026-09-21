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
