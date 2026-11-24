import { isRecord } from "@syllab/contracts";
import type { SourceMachineRepresentation, MachineComparison } from "./schema";
import { compareMachineRepresentations } from "./fingerprint";
export interface NativeSignal {
  courseId: string;
  kind: string;
  nativeId: string;
  resourceIds: string[];
  modified?: string;
  version?: string;
  adapterVersion: string;
  reliableForContent: boolean;
  completeResourceInventory: boolean;
}
/** Reliability must be qualified by the adapter; mere native identity is not a change signal. */
export function compareNativeSignals(
  previous: NativeSignal | undefined,
  next: NativeSignal | undefined,
  oldMachine: SourceMachineRepresentation | undefined,
  newMachine: SourceMachineRepresentation | undefined,
  complete: boolean
): MachineComparison {
  const valid = (value: unknown): boolean =>
    !value ||
    (isRecord(value) &&
      typeof value.courseId === "string" &&
      typeof value.kind === "string" &&
      typeof value.nativeId === "string" &&
      Array.isArray(value.resourceIds) &&
      value.resourceIds.every((id) => typeof id === "string") &&
      typeof value.adapterVersion === "string" &&
      typeof value.reliableForContent === "boolean" &&
      typeof value.completeResourceInventory === "boolean" &&
      (value.modified === undefined || typeof value.modified === "string") &&
      (value.version === undefined || typeof value.version === "string"));
  if (!valid(previous) || !valid(next)) return "incomparable";
  if (
    !complete ||
    (previous && next && (previous.courseId !== next.courseId || previous.kind !== next.kind))
  )
    return "incomparable";
  if (
    previous &&
    next &&
    previous.courseId === next.courseId &&
    previous.kind === next.kind &&
    previous.nativeId !== next.nativeId
  )
    return "new-source";
  if (
    previous &&
    next &&
    previous.reliableForContent &&
    next.reliableForContent &&
    previous.adapterVersion === next.adapterVersion &&
    previous.courseId === next.courseId &&
    previous.nativeId === next.nativeId &&
    previous.kind === next.kind &&
    previous.completeResourceInventory &&
    next.completeResourceInventory &&
    (previous.modified !== undefined || previous.version !== undefined) &&
    (next.modified !== undefined || next.version !== undefined)
  ) {
    return previous.modified === next.modified &&
      previous.version === next.version &&
      JSON.stringify([...previous.resourceIds].sort()) ===
        JSON.stringify([...next.resourceIds].sort())
      ? "unchanged"
      : "machine-different";
  }
  if (
    oldMachine &&
    newMachine &&
    oldMachine.representationVersion !== newMachine.representationVersion
  )
    return "incomparable";
  return compareMachineRepresentations(oldMachine, newMachine, true);
}
