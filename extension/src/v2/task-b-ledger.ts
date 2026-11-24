import { canonicalEnvelope, type CompatibilityRepair } from "./contract-registry";
import type { StagedCourseState } from "./staging";
import type { MaterializedCanonical } from "./materialize";
import { isRecord } from "@syllab/contracts";
import { stableDigest } from "./chunking";
import { stableStringify } from "./crypto";
import { checkpointTaskB, emptyB, GROUNDED_B_SCHEMA, type BCheckpoint } from "./task-b-grounding";
import type { AiEvidence } from "./ai-contracts";

export interface BPhysicalRecord {
  id: string;
  request: string;
  state:
    | "prepared"
    | "dispatched"
    | "completed"
    | "applied"
    | "pre-generation-rejected"
    | "paid-unverified"
    | "failed";
  owner: string;
  session: string;
  at: string;
  response?: unknown;
  error?: string;
  consumesApi?: boolean;
  paidDisposition?: "known-response" | "refused" | "ambiguous";
}
export interface BLogicalLedger {
  compatibilityRepairs?: CompatibilityRepair[];
  attemptId: string;
  requiredRefs: string[];
  sourceRefs: string[];
  processedRefs: string[];
  pendingRefs: string[];
  unresolved: Array<{ ref: string; reason: string }>;
  parts: Array<{ id: string; text: string; delivered: boolean; kind?: "input" | "reconciliation" }>;
  reconciliationPartitioned?: boolean;
  candidates: unknown[];
  provisionalChecks?: BCheckpoint;
  materialized?: MaterializedCanonical;
  taskABaseline?: Pick<
    StagedCourseState,
    "assessments" | "constraints" | "facts" | "evidence" | "reviewItems" | "changes"
  >;
  errorIdentity?: string;
  retiredItems: Array<{ itemId: string; reason: string }>;
  unresolvedCandidateIds: string[];
  dispositionErrors: Array<{ ref: string; error: string; errorIdentity: string; at: string }>;
  final: BCheckpoint;
  suppliedEvidence: AiEvidence[];
  requestedEvidenceRefs: unknown[];
  physical: BPhysicalRecord[];
  status: "active" | "complete" | "partial";
  cursor: string;
  at: string;
  stopReason?: string;
}
export function newBLedger(
  attemptId: string,
  refs: string[],
  text: string,
  evidence: AiEvidence[],
  at: string
): BLogicalLedger {
  const requiredRefs = [...new Set(refs)].sort();
  return {
    attemptId,
    requiredRefs,
    sourceRefs: [],
    processedRefs: [],
    pendingRefs: [...requiredRefs],
    unresolved: [],
    parts: [{ id: stableDigest(text), text, delivered: false }],
    candidates: [],
    retiredItems: [],
    unresolvedCandidateIds: [],
    dispositionErrors: [],
    final: {
      schema: GROUNDED_B_SCHEMA,
      registryHash: "",
      items: [],
      status: "partial",
      result: emptyB(),
      recordedAt: at,
      pendingEvidenceRequests: 0
    },
    suppliedEvidence: [...evidence],
    requestedEvidenceRefs: [],
    physical: [],
    status: "active",
    cursor: "initial",
    at
  };
}
/** Only the open physical part is split, after a proven pre-generation refusal. No semantic grouping. */
export function splitBPart(ledger: BLogicalLedger): BLogicalLedger {
  const index = ledger.parts.findIndex((p) => !p.delivered);
  if (index < 0) {
    const text = ledger.physical.at(-1)?.request;
    if (!text) throw new Error("B_BOUNDARY_NO_INPUT_PART_PENDING");
    if (ledger.parts.some((p) => p.id.startsWith(`reconcile:${stableDigest(text)}`)))
      throw new Error("B_RECONCILIATION_REPEATED_REJECTED_SHAPE_NO_PROGRESS");
    return splitBPart({
      ...ledger,
      reconciliationPartitioned: true,
      parts: [
        ...ledger.parts,
        { id: `reconcile:${stableDigest(text)}`, text, delivered: false, kind: "reconciliation" }
      ]
    });
  }
  const part = ledger.parts[index];
  if (!part) throw new Error("B_PART_ABSENT");
  const points = Array.from(part.text);
  if (points.length < 2) throw new Error("B_UNSPLITTABLE_REQUEST_SHAPE");
  const middle = Math.floor(points.length / 2);
  const pieces = [points.slice(0, middle).join(""), points.slice(middle).join("")];
  return {
    ...ledger,
    parts: [
      ...ledger.parts.slice(0, index),
      ...pieces.map((text, i) => ({
        id: `${part.id}/${String(i)}`,
        text,
        delivered: false,
        ...(part.kind ? { kind: part.kind } : {})
      })),
      ...ledger.parts.slice(index + 1)
    ]
  };
}
/** Parse only complete JSON values in the top-level items array. Never close or repair an item. */
export function completePrefixItems(
  raw: string,
  expectedSchema: string = GROUNDED_B_SCHEMA
): unknown[] {
  let schemaVerified = false;
  let depth = 0,
    quoted = false,
    escaped = false,
    tokenStart = -1,
    arrayStart = -1;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i] ?? "";
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') {
        quoted = false;
        if (depth === 1 && tokenStart >= 0 && raw.slice(tokenStart, i + 1) === '"schema"') {
          const value = raw.slice(i + 1).match(/^\s*:\s*("(?:\\.|[^"\\])*")/);
          if (value) {
            const parsedSchema: unknown = JSON.parse(value[1] ?? '""');
            const header = canonicalEnvelope({ schema: parsedSchema }, expectedSchema).value;
            schemaVerified = isRecord(header) && header.schema === expectedSchema;
          }
        }
        if (depth === 1 && tokenStart >= 0 && raw.slice(tokenStart, i + 1) === '"items"') {
          const rest = raw.slice(i + 1).match(/^\s*:\s*\[/);
          if (rest) {
            arrayStart = i + 1 + rest[0].length;
            break;
          }
        }
        tokenStart = -1;
      }
    } else if (c === '"') {
      quoted = true;
      tokenStart = i;
    } else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") depth--;
  }
  if (arrayStart < 0 || !schemaVerified) return [];
  const result: unknown[] = [];
  let start = arrayStart;
  while (start < raw.length) {
    while (/\s/.test(raw[start] ?? "") && start < raw.length) start++;
    if (raw[start] !== "{") break;
    let nesting = 0;
    quoted = false;
    escaped = false;
    let end = -1;
    for (let i = start; i < raw.length; i++) {
      const c = raw[i] ?? "";
      if (quoted) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === "{" || c === "[") nesting++;
      else if (c === "}" || c === "]") {
        nesting--;
        if (nesting === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end < 0) break;
    try {
      result.push(JSON.parse(raw.slice(start, end)));
    } catch {
      break;
    }
    start = end;
    while (start < raw.length && /\s/.test(raw[start] ?? "")) start++;
    if (raw[start] !== ",") break;
    start++;
  }
  return result;
}
function itemId(item: unknown): string | undefined {
  return isRecord(item) && typeof item.itemId === "string" ? item.itemId : undefined;
}
export function captureBResponseCandidates(
  ledger: BLogicalLedger,
  response: unknown,
  knownSources: ReadonlySet<string>,
  at: string
): BLogicalLedger {
  if (
    !isRecord(response) ||
    response.schema !== GROUNDED_B_SCHEMA ||
    !Array.isArray(response.items)
  )
    throw new Error("B_LEDGER_RESPONSE_SHAPE");
  const closedIds = new Set(
    ledger.final.items.filter((i) => i.status === "verified").map((i) => i.itemId)
  );
  const candidates = [...ledger.candidates];
  for (const item of response.items) {
    const id = itemId(item);
    if (!id) {
      candidates.push(item);
      continue;
    }
    const previous = candidates.findIndex((i) => itemId(i) === id);
    if (closedIds.has(id)) {
      if (previous < 0 || stableStringify(candidates[previous]) !== stableStringify(item))
        throw new Error("B_CLOSED_ITEM_REGENERATION");
      continue;
    }
    if (previous < 0) candidates.push(item);
    else candidates[previous] = item; // Model replacement of provisional work only; never Local repair.
  }
  return {
    ...ledger,
    candidates,
    provisionalChecks: checkpointTaskB(
      { schema: GROUNDED_B_SCHEMA, items: candidates },
      ledger.suppliedEvidence,
      knownSources,
      new Set(ledger.requiredRefs),
      at
    )
  };
}
/** No final identity may originate in a partition until a full-registry model closure is validated. */
export function applyBResponse(
  ledger: BLogicalLedger,
  response: unknown,
  knownSources: ReadonlySet<string>,
  at: string
): BLogicalLedger {
  if (
    !isRecord(response) ||
    response.schema !== GROUNDED_B_SCHEMA ||
    !Array.isArray(response.items)
  )
    throw new Error("B_LEDGER_RESPONSE_SHAPE");
  const oldCursor = ledger.cursor === "initial" ? progressIdentity(ledger) : ledger.cursor;
  ledger = captureBResponseCandidates(ledger, response, knownSources, at);
  const candidates = ledger.candidates;
  const parts = ledger.parts.map((p) => ({ ...p }));
  const nextPart = parts.find((p) => !p.delivered);
  if (nextPart) nextPart.delivered = true;
  const allDelivered = parts.every((p) => p.delivered);
  const requests = Array.isArray(response.requestedEvidenceRefs)
    ? response.requestedEvidenceRefs
    : [];
  let next = { ...ledger, parts, candidates, requestedEvidenceRefs: requests, at };
  const closure = response.closure;
  if (allDelivered && response.physicalLength !== true && isRecord(closure)) {
    if (!Array.isArray(closure.scopeRefs) || !Array.isArray(closure.dispositions))
      throw new Error("B_CLOSURE_SHAPE");
    const scope = closure.scopeRefs;
    if (
      scope.length !== ledger.requiredRefs.length ||
      new Set(scope).size !== scope.length ||
      scope.some((r) => typeof r !== "string" || !ledger.requiredRefs.includes(r))
    )
      throw new Error("B_CLOSURE_SCOPE_INCOMPLETE");
    const checked = checkpointTaskB(
      { schema: GROUNDED_B_SCHEMA, items: candidates },
      ledger.suppliedEvidence,
      knownSources,
      new Set(ledger.requiredRefs),
      at
    );
    const byId = new Map(checked.items.map((i) => [i.itemId, i]));
    const resolved = new Set(ledger.processedRefs);
    const unresolved = new Map(ledger.unresolved.map((d) => [d.ref, d.reason]));
    const dispositionSeen = new Set<string>();
    const noOutputRefs = new Set<string>();
    const dispositionErrors = [...ledger.dispositionErrors];
    const selectedIds = new Set(
      ledger.final.items.filter((i) => i.status === "verified").map((i) => i.itemId)
    );
    for (const row of closure.dispositions) {
      try {
        if (
          !isRecord(row) ||
          typeof row.ref !== "string" ||
          !ledger.requiredRefs.includes(row.ref) ||
          dispositionSeen.has(row.ref) ||
          typeof row.reason !== "string" ||
          !row.reason
        )
          throw new Error("B_DISPOSITION_SHAPE");
        dispositionSeen.add(row.ref);
        if (!ledger.pendingRefs.includes(row.ref)) throw new Error("B_CLOSED_REF_REGENERATED");
        if (row.status === "unresolved") {
          unresolved.set(row.ref, row.reason);
          continue;
        }
        if (
          row.status === "resolved" &&
          row.noOutputNeeded === true &&
          ledger.sourceRefs.includes(row.ref) &&
          Array.isArray(row.itemIds) &&
          !row.itemIds.length
        ) {
          resolved.add(row.ref);
          noOutputRefs.add(row.ref);
          continue;
        }
        if (row.status !== "resolved" || !Array.isArray(row.itemIds) || !row.itemIds.length)
          throw new Error("B_DISPOSITION_UNSUPPORTED_RESOLVED");
        // A model-selected independent sibling may support this ref even when another
        // selected candidate fails. Never infer an unselected item or erase the failure.
        const supported = row.itemIds.filter(
          (id) =>
            typeof id === "string" &&
            byId.get(id)?.status === "verified" &&
            byId.get(id)?.inputRefs.includes(String(row.ref))
        );
        if (!supported.length) throw new Error("B_DISPOSITION_UNSUPPORTED_RESOLVED");
        if (supported.length !== row.itemIds.length) {
          const error = "B_DISPOSITION_PARTIAL_ITEM_SUPPORT";
          dispositionErrors.push({ ref: row.ref, error, errorIdentity: stableDigest(error), at });
        }
        for (const id of supported) selectedIds.add(String(id));
        resolved.add(row.ref);
      } catch (error) {
        const errorText = error instanceof Error ? error.message : "B_DISPOSITION_INVALID";
        dispositionErrors.push({
          ref: isRecord(row) && typeof row.ref === "string" ? row.ref : "unknown",
          error: errorText,
          errorIdentity: stableDigest(errorText),
          at
        });
        if (isRecord(row) && typeof row.ref === "string" && ledger.pendingRefs.includes(row.ref)) {
          resolved.delete(row.ref);
          unresolved.set(row.ref, error instanceof Error ? error.message : "B_DISPOSITION_INVALID");
        }
      }
    }
    const accounted = new Set([...resolved, ...unresolved.keys()]);
    let pendingRefs = ledger.requiredRefs.filter((r) => !accounted.has(r));
    // Final items require every referenced input and dependency closure to be explicitly resolved.
    // Only model-selected closure items may become final; superseded provisional candidates remain diagnostic.
    let addDependency = true;
    while (addDependency) {
      addDependency = false;
      for (const id of [...selectedIds])
        for (const dep of byId.get(id)?.dependencies ?? [])
          if (!selectedIds.has(dep)) {
            selectedIds.add(dep);
            addDependency = true;
          }
    }
    const finalIds = new Set(
      checked.items
        .filter(
          (i) =>
            selectedIds.has(i.itemId) &&
            i.status === "verified" &&
            i.inputRefs.every((r) => resolved.has(r))
        )
        .map((i) => i.itemId)
    );
    let changed = true;
    while (changed) {
      changed = false;
      for (const i of checked.items)
        if (finalIds.has(i.itemId) && i.dependencies.some((id) => !finalIds.has(id))) {
          finalIds.delete(i.itemId);
          changed = true;
        }
    }
    for (const ref of [...resolved]) {
      if (
        !ledger.processedRefs.includes(ref) &&
        !noOutputRefs.has(ref) &&
        !checked.items.some((i) => finalIds.has(i.itemId) && i.inputRefs.includes(ref))
      ) {
        resolved.delete(ref);
        unresolved.set(ref, "B_RESOLVED_REF_WITHOUT_FINAL_DEPENDENCY_CLOSURE");
      }
    }
    pendingRefs = ledger.requiredRefs.filter((r) => !resolved.has(r) && !unresolved.has(r));
    const retiredItems = [...ledger.retiredItems];
    for (const raw of Array.isArray(closure.discardedCandidates)
      ? closure.discardedCandidates
      : []) {
      if (
        !isRecord(raw) ||
        typeof raw.itemId !== "string" ||
        typeof raw.reason !== "string" ||
        !raw.reason ||
        !candidates.some((c) => itemId(c) === raw.itemId) ||
        finalIds.has(raw.itemId)
      )
        throw new Error("B_RETIRED_CANDIDATE_INVALID");
      if (!retiredItems.some((c) => c.itemId === raw.itemId))
        retiredItems.push({ itemId: raw.itemId, reason: raw.reason });
    }
    const unresolvedCandidateIds = candidates
      .map((c) => itemId(c) ?? `invalid:${stableDigest(stableStringify(c))}`)
      .filter((id) => !finalIds.has(id) && !retiredItems.some((c) => c.itemId === id));
    const finalRaw = candidates.filter((i) => {
      const id = itemId(i);
      return id !== undefined && finalIds.has(id);
    });
    const final = checkpointTaskB(
      { schema: GROUNDED_B_SCHEMA, items: finalRaw },
      ledger.suppliedEvidence,
      knownSources,
      new Set(ledger.requiredRefs),
      at
    );
    // Keep failed items diagnostically visible; only final verified items enter the result projection.
    final.items.push(...checked.items.filter((i) => i.status === "unresolved"));
    final.status =
      pendingRefs.length ||
      unresolved.size ||
      checked.items.some((i) => i.status === "unresolved") ||
      requests.length ||
      dispositionErrors.length ||
      unresolvedCandidateIds.length
        ? "partial"
        : "verified";
    next = {
      ...next,
      processedRefs: [...resolved],
      pendingRefs,
      unresolved: [...unresolved].map(([ref, reason]) => ({ ref, reason })),
      final,
      retiredItems,
      unresolvedCandidateIds,
      dispositionErrors,
      status:
        !pendingRefs.length && !requests.length
          ? unresolved.size || final.status === "partial"
            ? "partial"
            : "complete"
          : "active"
    };
  }
  if (
    next.status === "active" &&
    allDelivered &&
    response.physicalLength !== true &&
    candidates.length &&
    !requests.length &&
    !next.provisionalChecks?.items.some(
      (i) => i.status === "verified" || i.error === "B_DEPENDENCY_UNRESOLVED"
    )
  )
    return stopBLedger(next, "B_NO_CONTRACT_VALID_PHYSICAL_ITEMS", at);
  const cursor = progressIdentity(next);
  if (next.status === "active" && cursor === oldCursor && !requests.length)
    return stopBLedger(next, "B_CONTINUATION_NO_PROGRESS", at);
  return { ...next, cursor };
}
export function progressIdentity(ledger: BLogicalLedger): string {
  return stableDigest(
    stableStringify({
      delivered: ledger.parts.filter((p) => p.delivered).map((p) => p.id),
      candidates: (ledger.provisionalChecks?.items ?? [])
        .filter((i) => i.status === "verified" || i.error === "B_DEPENDENCY_UNRESOLVED")
        .map((i) => i.itemId)
        .sort(),
      processed: [...ledger.processedRefs].sort(),
      unresolved: ledger.unresolved,
      final: ledger.final.items
        .filter((i) => i.status === "verified")
        .map((i) => i.itemId)
        .sort(),
      evidence: ledger.suppliedEvidence.map((e) => e.evidenceId).sort()
    })
  );
}
export function stopBLedger(ledger: BLogicalLedger, reason: string, at: string): BLogicalLedger {
  return {
    ...ledger,
    status: "partial",
    stopReason: reason,
    errorIdentity: stableDigest(reason),
    at,
    pendingRefs: [],
    unresolved: [...ledger.unresolved, ...ledger.pendingRefs.map((ref) => ({ ref, reason }))],
    unresolvedCandidateIds: ledger.candidates
      .map((c) => itemId(c) ?? `invalid:${stableDigest(stableStringify(c))}`)
      .filter(
        (id) =>
          !ledger.final.items.some((i) => i.itemId === id && i.status === "verified") &&
          !ledger.retiredItems.some((i) => i.itemId === id)
      ),
    final: { ...ledger.final, status: "partial" }
  };
}
export function assertBLedgerAccounting(ledger: BLogicalLedger): void {
  const refs = [
    ...ledger.processedRefs,
    ...ledger.unresolved.map((d) => d.ref),
    ...ledger.pendingRefs
  ];
  if (
    refs.length !== ledger.requiredRefs.length ||
    new Set(refs).size !== refs.length ||
    refs.some((r) => !ledger.requiredRefs.includes(r))
  )
    throw new Error("B_LEDGER_ACCOUNTING_LOSS");
  if (ledger.status !== "active" && ledger.pendingRefs.length)
    throw new Error("B_LEDGER_COMPLETION_WITH_PENDING");
}

/** Staging/UI carry an inexpensive view; full raw physical requests and prefixes live in native IDB. */
export function bLedgerProjection(ledger: BLogicalLedger): BLogicalLedger {
  const { materialized: _materialized, taskABaseline: _taskABaseline, ...projection } = ledger;
  return {
    ...projection,
    parts: ledger.parts.map((p) => ({ ...p, text: "" })),
    candidates: [],
    ...(ledger.provisionalChecks
      ? { provisionalChecks: { ...ledger.provisionalChecks, items: [], result: emptyB() } }
      : {}),
    suppliedEvidence: [],
    physical: ledger.physical.map(({ response: _response, ...p }) => ({ ...p, request: "" }))
  };
}
