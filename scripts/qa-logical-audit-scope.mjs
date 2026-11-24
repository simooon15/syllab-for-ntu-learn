import { createHash } from "node:crypto";

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const nativeIdentity = (e) => [e.sourceId, e.locator, digest(e.excerpt)];

/** Safety identity excludes prompt, effort, metadata and task IDs; it does not judge meaning. */
export function logicalAuditScope(scope) {
  if (
    scope.contractCompletion?.operation === "missing-independent-review/1" &&
    typeof scope.taskRef === "string"
  )
    return "contract-completion:" + scope.taskRef;
  if (typeof scope.taskRef === "string") {
    if (
      typeof scope.entity?.ownerRef === "string" &&
      Array.isArray(scope.propositions) &&
      Array.isArray(scope.nativeContext)
    )
      return (
        (scope.compositionScope?.operation === "owner-cross-group-composition/1"
          ? "audit-owner-composition:"
          : "audit-owner:") +
        digest({
          owner: scope.entity.ownerRef,
          propositions: scope.propositions.map((p) => p.propositionRef).sort(),
          native: scope.nativeContext
            .map(nativeIdentity)
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
        })
      );
    if (Array.isArray(scope.evidence))
      return (
        "audit-source:" +
        digest(
          scope.evidence
            .map((e) => [...nativeIdentity(e), e.start, e.end])
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
        )
      );
    return "audit:" + scope.taskRef;
  }
  if (scope.scope && Array.isArray(scope.scope.propositionRefs))
    return "repair:" + digest(scope.scope);
  throw Error("UNKNOWN_AUDIT_SCOPE_UNREADABLE");
}

/** Existing frozen task-ID journals remain effective after introducing stable scope identities. */
export function legacyAuditScope(scope) {
  return typeof scope.taskRef === "string" && !scope.contractCompletion
    ? "audit:" + scope.taskRef
    : undefined;
}
