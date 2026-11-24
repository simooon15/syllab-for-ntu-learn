import {
  planRetrieval,
  expandRef,
  validatePlanner,
  type PlannerResult,
  type NativeExpansion
} from "./retrieval-planner";
import {
  coverageAuditInput,
  coverageAuditCall,
  validateCoverageAudit,
  auditProof,
  type CoverageAuditInput,
  type CoverageAuditResult,
  type CoverageAuditProof
} from "./coverage-audit";
import type { AiCall } from "./ai-pipeline";
export interface AuditRound {
  input: CoverageAuditInput;
  result: CoverageAuditResult;
  plannerResult: PlannerResult;
  newRefs: string[];
  newNativeCharacters: number;
  newNativeBytes: number;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}
/** Primary COMPLETE is a proposal until a fresh exhaustive AI audit accounts for unread scope. */
export async function planRetrievalWithAudit(
  input: Parameters<typeof planRetrieval>[0] & {
    initialProposal?: PlannerResult;
    executeAudit: (call: AiCall) => ReturnType<Parameters<typeof planRetrieval>[0]["execute"]>;
    onAudit?: (round: AuditRound, expanded: NativeExpansion[]) => Promise<void> | void;
  }
): Promise<{
  result: PlannerResult;
  expanded: NativeExpansion[];
  coverageAudit: CoverageAuditProof;
}> {
  let expanded = [...new Map((input.expanded ?? []).map((row) => [row.ref, row])).values()];
  let previousSelectedEvidenceRefs = input.previousSelectedEvidenceRefs ?? [];
  let proposal = input.initialProposal
    ? validatePlanner({ ...input.initialProposal, removedSelectedRefs: [] }, input.index, expanded)
    : undefined;
  for (;;) {
    if (!proposal) {
      const planned = await planRetrieval({
        ...input,
        expanded,
        previousSelectedEvidenceRefs,
        onRound: async (round, currentExpanded) => {
          await input.onRound?.(
            {
              ...round,
              runtimeState: round.runtimeState === "COMPLETE" ? "AUDIT_PENDING" : round.runtimeState
            },
            currentExpanded
          );
        }
      });
      proposal = planned.result;
      expanded = planned.expanded;
    }
    const context = coverageAuditInput(input.index, expanded, proposal),
      call = coverageAuditCall(context, input.key),
      started = performance.now();
    const outcome = await input.executeAudit(call);
    const result = validateCoverageAudit(outcome.value, context);
    const newlyRead = result.requestRefs.map((ref) => expandRef(input.index, input.inventory, ref));
    expanded.push(...newlyRead);
    await input.onAudit?.(
      {
        input: context,
        result,
        plannerResult: proposal,
        newRefs: result.requestRefs,
        newNativeCharacters: newlyRead.reduce((n, row) => n + row.text.length, 0),
        newNativeBytes: new TextEncoder().encode(JSON.stringify(newlyRead)).byteLength,
        durationMs: performance.now() - started,
        ...(outcome.inputTokens === undefined ? {} : { inputTokens: outcome.inputTokens }),
        ...(outcome.outputTokens === undefined ? {} : { outputTokens: outcome.outputTokens }),
        ...(outcome.reasoningTokens === undefined
          ? {}
          : { reasoningTokens: outcome.reasoningTokens })
      },
      expanded
    );
    if (result.status === "COVERAGE_COMPLETE")
      return { result: proposal, expanded, coverageAudit: auditProof(context, result) };
    // MORE_EVIDENCE validation guarantees new exact acquisitions, so no guessed round limit.
    previousSelectedEvidenceRefs = proposal.selectedEvidenceRefs;
    proposal = undefined;
  }
}
