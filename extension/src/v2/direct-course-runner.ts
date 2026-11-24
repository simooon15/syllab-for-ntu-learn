import { decodeDirectCapture, type DirectFormatRecovery } from "./direct-json";
/** Isolated candidate runtime. Ports own private persistence and explicit paid authorization. */
import { digest, ArchitectureError } from "./architecture-session";
import { prepareDirectCourse, validateDirectCourse, type DirectCourseInput } from "./direct-course";
import { serializeProviderRequest } from "./provider-request";
import type { AiCall } from "./ai-pipeline";
import type { AiUsage } from "./deepseek-complete";

export interface DirectCapture {
  raw: string;
  finishReason: string | null;
  streamDone: boolean;
  usage: AiUsage;
}
export interface DirectRun {
  id: string;
  inputSnapshot: string;
  requestFingerprint: string;
  requestBytes: number;
  state: "claimed" | "dispatched" | "captured" | "accepted" | "rejected" | "blocked" | "unverified";
  /** Raw output must remain in local private storage, including invalid/truncated output. */
  capture?: DirectCapture;
  formatRecovery?: DirectFormatRecovery;
  problem?: "AUTHORIZATION_REQUIRED" | "TRANSPORT_UNVERIFIED" | "INCOMPLETE" | "JSON" | "CONTRACT";
}
export interface DirectRunPort {
  load(id: string): Promise<DirectRun | undefined>;
  /** Atomic create-if-absent, durable before returning true. Required to prevent double dispatch. */
  claim(run: DirectRun): Promise<boolean>;
  save(run: DirectRun): Promise<void>;
  /** Durable global call/cost reservation. Must fail if either authorized hard limit is exceeded. */
  authorize(call: AiCall): Promise<void>;
  /** Exactly one physical request. No hidden repair, retry, continuation or fallback. */
  execute(call: AiCall): Promise<DirectCapture>;
}

/** Crash/connection ambiguity never triggers an automatic paid retry. Captured data is replayable. */
export async function runDirectCourse(input: DirectCourseInput, id: string, port: DirectRunPort) {
  const { snapshot, call } = prepareDirectCourse(input, id);
  const body = serializeProviderRequest(call);
  const fingerprint = digest(body);
  const existing = await port.load(id);
  if (existing) {
    if (existing.inputSnapshot !== snapshot || existing.requestFingerprint !== fingerprint)
      throw new ArchitectureError("DIRECT_COURSE:RESUME_MISMATCH");
    if (
      existing.state === "captured" ||
      existing.state === "accepted" ||
      existing.state === "rejected"
    )
      return admit(existing, input, port);
    return { run: existing };
  }
  const run: DirectRun = {
    id,
    inputSnapshot: snapshot,
    requestFingerprint: fingerprint,
    requestBytes: new TextEncoder().encode(body).byteLength,
    state: "claimed"
  };
  if (!(await port.claim(run))) {
    const winner = await port.load(id);
    if (!winner || winner.inputSnapshot !== snapshot || winner.requestFingerprint !== fingerprint)
      throw new ArchitectureError("DIRECT_COURSE:CLAIM_MISMATCH");
    return { run: winner };
  }
  try {
    await port.authorize(call);
  } catch {
    run.state = "blocked";
    run.problem = "AUTHORIZATION_REQUIRED";
    await port.save(run);
    return { run };
  }
  run.state = "dispatched";
  // A failure here leaves a conservative claimed record; do not dispatch without durable intent.
  await port.save(run);
  try {
    run.capture = await port.execute(call);
  } catch {
    run.state = "unverified";
    run.problem = "TRANSPORT_UNVERIFIED";
    await port.save(run);
    return { run };
  }
  run.state = "captured";
  // Capture is saved before validation so a crash never destroys original evidence or repeats calls.
  await port.save(run);
  return admit(run, input, port);
}

async function admit(run: DirectRun, input: DirectCourseInput, port: DirectRunPort) {
  if (!run.capture) throw new ArchitectureError("DIRECT_COURSE:CAPTURE_MISSING");
  let value: unknown;
  if (!run.capture.streamDone || run.capture.finishReason !== "stop") {
    run.state = "rejected";
    run.problem = "INCOMPLETE";
    await port.save(run);
    return { run };
  }
  try {
    const decoded = decodeDirectCapture(run.capture.raw);
    value = decoded.value;
    if (decoded.formatRecovery) run.formatRecovery = decoded.formatRecovery;
  } catch {
    run.state = "rejected";
    run.problem = "JSON";
    await port.save(run);
    return { run };
  }
  let result;
  try {
    result = validateDirectCourse(value, input);
  } catch {
    run.state = "rejected";
    run.problem = "CONTRACT";
    await port.save(run);
    return { run };
  }
  run.state = "accepted";
  delete run.problem;
  await port.save(run);
  return { run, result };
}
