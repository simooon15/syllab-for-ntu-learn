import { ArchitectureError, type Session, type PhysicalRequest } from "./architecture-session";

/** Explicit, one-shot recovery preserves the ambiguous attempt and the exact frozen delivery. */
export function authorizeB2Compensation(session: Session, authorization: string): PhysicalRequest {
  const existing = session.requests.find((r) => r.compensation?.authorization === authorization);
  if (existing) return existing;
  const previous = session.requests.at(-1);
  if (
    session.stage !== "B2" ||
    !previous ||
    !["dispatched", "paid-unverified"].includes(previous.state) ||
    previous.response !== undefined ||
    session.state === "final" ||
    session.requests.some((r) => r.compensation)
  )
    throw new ArchitectureError("COMPENSATION_NOT_ELIGIBLE");
  const request: PhysicalRequest = {
    id: `${previous.id}:compensation:${authorization}`,
    roundId: previous.roundId,
    segmentId: previous.segmentId,
    request: previous.request,
    state: "prepared",
    compensation: { authorization, replacesRequestId: previous.id }
  };
  session.requests.push(request);
  session.state = "active";
  return request;
}
