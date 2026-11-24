/** Historical derived coverage is reusable in production, never in QA clean acceptance. */
export function historicalCoverageReusable(
  qaSemanticClean: boolean | undefined,
  historicalHash: string | undefined,
  freshHash: string | undefined
): boolean {
  return !qaSemanticClean && !!freshHash && historicalHash === freshHash;
}
