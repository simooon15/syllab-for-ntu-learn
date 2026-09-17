import {
  CONTRACT_VERSION,
  MODEL_NAME,
  MODEL_PROVIDER,
  isRecord,
  type AiExtractRequest,
  type AiExtractResponse,
  type ExtractedCandidate
} from "@syllab/contracts";

import type { NormalizedBatch } from "../normalize/domain";
import type {
  AiBackendTransport,
  BatchExtractionFailure,
  CandidateRecord,
  InstallationCredentialRepository
} from "./domain";

function validatedRelationship(
  candidate: Record<string, unknown>,
  kind: ExtractedCandidate["kind"],
  reviewReason: string | undefined
): Pick<ExtractedCandidate, "scope" | "appliesToAssessmentKey"> {
  const scope = candidate.scope;
  const parentKey = candidate.appliesToAssessmentKey;
  if (kind === "assessment") {
    if (scope !== undefined || parentKey !== undefined) throw new Error("AI_RELATIONSHIP_INVALID");
    return {};
  }
  if (scope === "course" && parentKey === undefined) return { scope };
  if (
    scope === "assessment" &&
    typeof parentKey === "string" &&
    /^assessment:[a-z0-9][a-z0-9-]*$/.test(parentKey)
  ) {
    return { scope, appliesToAssessmentKey: parentKey };
  }
  if (scope === undefined && parentKey === undefined && reviewReason) return {};
  throw new Error("AI_RELATIONSHIP_INVALID");
}

function validatedResponse(value: unknown, request: AiExtractRequest): AiExtractResponse {
  if (
    !isRecord(value) ||
    value.contractVersion !== CONTRACT_VERSION ||
    value.requestId !== request.requestId ||
    value.provider !== MODEL_PROVIDER ||
    value.model !== MODEL_NAME ||
    !Array.isArray(value.candidates) ||
    !isRecord(value.usage) ||
    typeof value.usage.inputTokens !== "number" ||
    typeof value.usage.outputTokens !== "number"
  ) {
    throw new Error("AI_RESPONSE_INVALID");
  }
  const sourceIds = new Set(request.units.map((unit) => unit.sourceId));
  const candidates: ExtractedCandidate[] = value.candidates.map((candidate) => {
    if (
      !isRecord(candidate) ||
      (candidate.kind !== "assessment" &&
        candidate.kind !== "important_date" &&
        candidate.kind !== "important_rule") ||
      !isRecord(candidate.proposedValue) ||
      !Array.isArray(candidate.evidenceRefs) ||
      candidate.evidenceRefs.length === 0
    ) {
      throw new Error("AI_RESPONSE_INVALID");
    }
    const evidenceRefs = candidate.evidenceRefs.map((reference) => {
      if (
        !isRecord(reference) ||
        typeof reference.sourceId !== "string" ||
        typeof reference.locator !== "string" ||
        !sourceIds.has(reference.sourceId)
      ) {
        throw new Error("AI_EVIDENCE_INVALID");
      }
      return { sourceId: reference.sourceId, locator: reference.locator };
    });
    const kind = candidate.kind;
    const reviewReason =
      typeof candidate.reviewReason === "string" ? candidate.reviewReason : undefined;
    const relationship = validatedRelationship(candidate, kind, reviewReason);
    return {
      kind,
      ...relationship,
      proposedValue: candidate.proposedValue,
      evidenceRefs,
      ...(reviewReason ? { reviewReason } : {})
    };
  });
  return {
    contractVersion: CONTRACT_VERSION,
    requestId: request.requestId,
    provider: MODEL_PROVIDER,
    model: MODEL_NAME,
    candidates,
    usage: { inputTokens: value.usage.inputTokens, outputTokens: value.usage.outputTokens }
  };
}

function normalizedLabel(candidate: ExtractedCandidate): string {
  const label = ["title", "name", "label", "event", "description", "rule"]
    .map((key) => candidate.proposedValue[key])
    .find((value): value is string => typeof value === "string");
  return (label ?? JSON.stringify(candidate.proposedValue))
    .toLowerCase()
    .replace(/\bexamination\b/g, "exam")
    .replace(/\bwritten\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedCalendarDate(value: string): string | null {
  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const dayMonthYear = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = Number(dayMonthYear[2]);
    const year = Number(dayMonthYear[3]);
    const calendarDate = new Date(year, month - 1, day);
    if (
      calendarDate.getFullYear() === year &&
      calendarDate.getMonth() === month - 1 &&
      calendarDate.getDate() === day
    ) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return null;
  }
  const naturalDate = value.match(
    /\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}\b/i
  )?.[0];
  const parsed = Date.parse(naturalDate ?? value);
  if (Number.isNaN(parsed)) return null;
  const calendarDate = new Date(parsed);
  return [calendarDate.getFullYear(), calendarDate.getMonth() + 1, calendarDate.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}

function assessmentEntityKey(text: string): string | null {
  const ca = text.match(/\b(?:ca\s*|continuous assessment\s*)(\d+)\b/i);
  if (ca?.[1]) return `ca${ca[1]}`;
  if (/\bfinal\s+(?:written\s+)?exam(?:ination)?\b/i.test(text)) return "final-exam";
  return null;
}

function dateEventKey(text: string, fallback: string): string {
  if (/\bfinal\s+(?:written\s+)?exam(?:ination)?\b/i.test(text)) return "final-exam";
  if (/\bca\s*1\b|\bcontinuous assessment\s*1\b/i.test(text)) {
    if (/peer evaluation/i.test(text)) return "ca1-peer-evaluation";
    if (/batch\s*1/i.test(text)) return "ca1-presentation-batch1";
    if (/batch\s*2/i.test(text)) return "ca1-presentation-batch2";
    if (/role\s*play\s+script/i.test(text)) return "ca1-role-play-script";
    if (/power\s*point|slides?/i.test(text)) return "ca1-presentation-slides";
    return "ca1-submission";
  }
  if (/\bca\s*2\b|\bcontinuous assessment\s*2\b|\bmcq\b/i.test(text)) return "ca2-test";
  if (/\bca\s*3\b|\bcontinuous assessment\s*3\b|case study/i.test(text)) {
    return "ca3-case-study";
  }
  if (/project background|procurement scenario|scenario.*form/i.test(text)) return "scenario-form";
  return fallback;
}

function semanticKey(candidate: ExtractedCandidate): string {
  const label = normalizedLabel(candidate);
  const proposedText = JSON.stringify(candidate.proposedValue);
  if (candidate.kind === "assessment") {
    return `assessment:${assessmentEntityKey(proposedText) ?? label}`;
  }
  const relationshipKey =
    candidate.scope === "assessment"
      ? candidate.appliesToAssessmentKey
      : candidate.scope === "course"
        ? "course"
        : (candidate.appliesToAssessmentKey ?? "unresolved");
  if (candidate.kind !== "important_date") {
    return `${candidate.kind}:${label}:${relationshipKey ?? "unresolved"}`;
  }
  const dateValue = Object.entries(candidate.proposedValue).find(
    ([key, value]) => /date|when/i.test(key) && typeof value === "string"
  )?.[1];
  const normalizedDate =
    typeof dateValue === "string" ? (normalizedCalendarDate(dateValue) ?? dateValue) : "";
  return `${candidate.kind}:${dateEventKey(proposedText, label)}:${normalizedDate}:${relationshipKey ?? "unresolved"}`;
}

function candidateEvidenceText(candidate: ExtractedCandidate, request: AiExtractRequest): string {
  const referencedSources = new Set(candidate.evidenceRefs.map((reference) => reference.sourceId));
  return request.units
    .filter((unit) => referencedSources.has(unit.sourceId))
    .map((unit) => `${unit.title}\n${unit.text}`)
    .join("\n");
}

const D015_GRADE_TERMS = /\b(?:marks?|grades?|grading|scores?|points?|percentage points?)\b/i;

const D015_GRADE_CONSEQUENCE =
  /\b(?:affect|impact|influence|contribut(?:e|es|ing)|count(?:s|ed|ing)?|result(?:s|ed|ing)?|lead(?:s|ing)?|cause[sd]?|loss|lose|deduct(?:ed|ion)?|penalt(?:y|ies)|zero|receives?|received|given|get|must pass|pass(?:ing)?)\b/i;

function hasD015SourceSupportedGradeImpact(text: string): boolean {
  if (
    /\b(?:assessment (?:validity|eligibility)|eligib(?:le|ility)|ineligible|not (?:be )?graded|not accepted|invalid submission|cannot sit|not permitted to (?:sit|take)|must pass|pass(?:ing) grade)\b/i.test(
      text
    )
  ) {
    return true;
  }
  if (
    /\b(?:late|submission)\b[\s\S]{0,40}\bpenalt(?:y|ies)\b|\bpenalt(?:y|ies)\b[\s\S]{0,40}\blate\b/i.test(
      text
    )
  ) {
    return true;
  }
  if (
    /\b(?:turnitin|ntu\s*learn)\b[\s\S]{0,100}\b(?:submit|submission|assignment|written work|must|required|invalid|not accepted)\b/i.test(
      text
    )
  ) {
    return true;
  }
  if (!D015_GRADE_TERMS.test(text) || !D015_GRADE_CONSEQUENCE.test(text)) return false;
  return (
    /\b(?:marks?|grades?|grading|scores?|points?|percentage points?)\b[\s\S]{0,100}\b(?:affect|impact|influence|contribut(?:e|es|ing)|count(?:s|ed|ing)?|result(?:s|ed|ing)?|lead(?:s|ing)?|cause[sd]?|loss|lose|deduct(?:ed|ion)?|penalt(?:y|ies)|zero|receives?|received|given|get|must pass|pass(?:ing)?)\b/i.test(
      text
    ) ||
    /\b(?:affect|impact|influence|contribut(?:e|es|ing)|count(?:s|ed|ing)?|result(?:s|ed|ing)?|lead(?:s|ing)?|cause[sd]?|loss|lose|deduct(?:ed|ion)?|penalt(?:y|ies)|zero|receives?|received|given|get|must pass|pass(?:ing)?)\b[\s\S]{0,100}\b(?:marks?|grades?|grading|scores?|points?|percentage points?)\b/i.test(
      text
    )
  );
}

function isD015PolicyBoilerplate(text: string): boolean {
  const materialsPolicy =
    /\b(?:course materials?|copyright|intellectual property)\b[\s\S]{0,160}\b(?:upload|reproduc|redistribut|republish|transmit|photograph|film|audio|recording|permission|approval|not permitted|prohibited)\b/i.test(
      text
    );
  const recordingPolicy =
    /\b(?:photograph|film|audio record|recording)\b[\s\S]{0,80}\b(?:not permitted|prohibited|not allowed|may not|must not|without (?:permission|approval))\b/i.test(
      text
    );
  const conductPolicy =
    /\b(?:privacy|acceptable[- ]use|campus conduct|conduct policy|disciplin(?:ary|e))\b[\s\S]{0,100}\b(?:policy|policies|rules?|guidelines?|comply|follow|required|prohibited)\b/i.test(
      text
    );
  const integrityPolicy =
    /\b(?:academic integrity|academic honesty|plagiarism|misconduct)\b[\s\S]{0,100}\b(?:policy|policies|guidelines?|link|see|refer)\b/i.test(
      text
    );
  return materialsPolicy || recordingPolicy || conductPolicy || integrityPolicy;
}

export function passesD015ImportantRuleBoundary(
  candidate: ExtractedCandidate,
  request: AiExtractRequest
): boolean {
  if (candidate.kind !== "important_rule") return true;

  // D-014-owned rules remain eligible for their Assessment; this backstop only
  // filters candidates that would otherwise become independent course rules.
  if (candidate.scope === "assessment") return true;

  const proposedText = JSON.stringify(candidate.proposedValue);
  const evidenceText = candidateEvidenceText(candidate, request);
  const combinedText = `${proposedText}\n${evidenceText}`;
  if (hasD015SourceSupportedGradeImpact(evidenceText)) return true;

  // These are the narrow, high-confidence false-positive families called out
  // by D-015. Other rules are left to the prompt and Review rather than being
  // rejected by an aggressive keyword filter.
  if (/\battendance|attend(?:ance|ing)?\b/i.test(combinedText)) return false;
  if (isD015PolicyBoilerplate(combinedText)) return false;
  return true;
}

function isMvpRelevantCandidate(candidate: ExtractedCandidate, request: AiExtractRequest): boolean {
  if (!passesD015ImportantRuleBoundary(candidate, request)) return false;
  if (candidate.kind === "assessment") return true;
  const proposedText = JSON.stringify(candidate.proposedValue);
  if (candidate.kind === "important_date") {
    return /\b(?:ca\s*\d+|assessment|assignment|exam(?:ination)?|quiz|mcq|test|case study|presentation|role play|peer evaluation|submit|submission|deadline|due)\b/i.test(
      proposedText
    );
  }
  const evidenceText = `${proposedText}\n${candidateEvidenceText(candidate, request)}`;
  return /\b(?:student|assignment|assessment|ca\s*\d+|exam|quiz|presentation|submit|submission|turnitin|ntu\s*learn|deadline|late penalty|attendance|attend|group members?|group size|word limit|citation|misconduct|generative ai|gai|course materials?|lecture recordings?|photograph|film|audio record|documentary evidence|representative per group)\b/i.test(
    evidenceText
  );
}

function routeCandidateRisk(
  candidate: ExtractedCandidate,
  request: AiExtractRequest
): ExtractedCandidate {
  const referencedEvidence = new Set(
    candidate.evidenceRefs.map((reference) => `${reference.sourceId}\u0000${reference.locator}`)
  );
  const evidenceText = request.units
    .filter((unit) => referencedEvidence.has(`${unit.sourceId}\u0000${unit.locator}`))
    .map((unit) => unit.text)
    .join("\n");
  const weekOnly =
    /\bweek\s+\d+\b/i.test(evidenceText) &&
    !/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b/i.test(
      evidenceText
    );
  const uncertainAssessment =
    candidate.kind === "assessment" &&
    /\b(?:ungraded|not graded|optional|practice)\b/i.test(evidenceText);
  if (!weekOnly && !uncertainAssessment) return candidate;
  const proposedValue = weekOnly
    ? Object.fromEntries(
        Object.entries(candidate.proposedValue).filter(
          ([key]) => !/(?:date|due|deadline|start|end)/i.test(key)
        )
      )
    : candidate.proposedValue;
  return {
    ...candidate,
    proposedValue,
    reviewReason:
      candidate.reviewReason ??
      (weekOnly
        ? "A week reference has no reliable calendar-date mapping."
        : "The source does not clearly establish that this item is graded.")
  };
}

const identityFields = new Set(["title", "name", "label", "event", "what", "description"]);

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeProposedValues(
  preferred: Record<string, unknown>,
  additional: Record<string, unknown>
): { value: Record<string, unknown>; conflicts: Record<string, unknown[]> } {
  const value = structuredClone(preferred);
  const conflicts: Record<string, unknown[]> = {};
  for (const [key, incoming] of Object.entries(additional)) {
    if (!(key in value)) {
      value[key] = structuredClone(incoming);
      continue;
    }
    const current = value[key];
    if (valuesEqual(current, incoming)) continue;
    if (identityFields.has(key)) continue;
    if (/date|when/i.test(key) && typeof current === "string" && typeof incoming === "string") {
      if (normalizedCalendarDate(current) === normalizedCalendarDate(incoming)) continue;
    }
    conflicts[key] = [structuredClone(current), structuredClone(incoming)];
  }
  return { value, conflicts };
}

interface AssessmentIdentity {
  key: string;
  aliases: string[];
}

function normalizedRelationshipText(value: string): string {
  return value
    .toLowerCase()
    .replace(/peer assessment/g, "peer evaluation")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringsFromValue(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => stringsFromValue(item));
  if (!isRecord(value)) return [];
  return Object.values(value).flatMap((item) => stringsFromValue(item));
}

function assessmentIdentities(candidates: readonly CandidateRecord[]): AssessmentIdentity[] {
  return candidates
    .filter((candidate) => candidate.kind === "assessment")
    .map((candidate) => {
      const key = semanticKey(candidate);
      const aliases = stringsFromValue(candidate.proposedValue)
        .map(normalizedRelationshipText)
        .filter((value) => value.length >= 4 && !/^\d+(?:\s*(?:marks?|%))?$/.test(value));
      return { key, aliases: [...new Set(aliases)] };
    });
}

function explicitParentKey(text: string): string | null {
  const entity = assessmentEntityKey(text);
  return entity ? `assessment:${entity}` : null;
}

function aliasParentKey(text: string, identities: readonly AssessmentIdentity[]): string | null {
  const normalized = normalizedRelationshipText(text);
  const tokens = new Set(normalized.split(" ").filter((token) => token.length > 1));
  const matches = new Set<string>();
  for (const identity of identities) {
    if (
      identity.aliases.some((alias) => {
        if (normalized.includes(alias) || alias.includes(normalized)) return true;
        const aliasTokens = new Set(alias.split(" ").filter((token) => token.length > 1));
        return tokens.size >= 3 && [...tokens].every((token) => aliasTokens.has(token));
      })
    ) {
      matches.add(identity.key);
    }
  }
  return matches.size === 1 ? ([...matches][0] ?? null) : null;
}

function isExplicitCourseRule(text: string): boolean {
  return /\b(?:all course materials|all written assignments|students are expected|deadline extensions?|absence from class|attendance is mandatory|academic integrity|course-wide|all assignments)\b/i.test(
    text
  );
}

function migrateCandidateRelationship(
  candidate: CandidateRecord,
  identities: readonly AssessmentIdentity[]
): CandidateRecord {
  const next = structuredClone(candidate);
  if (next.kind === "assessment" || (next.scope === "course" && !next.appliesToAssessmentKey)) {
    return next;
  }
  if (next.scope === "assessment" && next.appliesToAssessmentKey) {
    if (identities.some((identity) => identity.key === next.appliesToAssessmentKey)) return next;
    if (identities.length === 0) return next;
    const remappedParent = aliasParentKey(
      next.appliesToAssessmentKey.replace(/^assessment:/, "").replace(/-/g, " "),
      identities
    );
    if (remappedParent) {
      next.appliesToAssessmentKey = remappedParent;
      return next;
    }
    delete next.scope;
    next.status = "NeedsReview";
    next.reviewReason ??=
      "The referenced parent Assessment was not found. Choose the correct Assessment before confirming.";
    return next;
  }

  const text = JSON.stringify(next.proposedValue);
  const parentKey = explicitParentKey(text) ?? aliasParentKey(text, identities);
  if (parentKey) {
    next.scope = "assessment";
    next.appliesToAssessmentKey = parentKey;
    return next;
  }
  if (next.kind === "important_date" || isExplicitCourseRule(text)) {
    next.scope = "course";
    delete next.appliesToAssessmentKey;
    return next;
  }
  delete next.scope;
  delete next.appliesToAssessmentKey;
  next.status = "NeedsReview";
  next.reviewReason ??=
    "It is unclear whether this requirement is course-wide or belongs to an Assessment.";
  return next;
}

function removeFalseUngradedRisk(candidate: CandidateRecord): CandidateRecord {
  const next = structuredClone(candidate);
  if (
    next.kind === "assessment" &&
    next.status === "NeedsReview" &&
    next.reviewReason === "The source does not clearly establish that this item is graded." &&
    Object.entries(next.proposedValue).some(
      ([key, value]) =>
        /^(?:weight|marks?|score|grade)$/i.test(key) &&
        ((typeof value === "number" && Number.isFinite(value)) ||
          (typeof value === "string" && /\d/.test(value)))
    )
  ) {
    next.status = "Detected";
    delete next.reviewReason;
  }
  return next;
}

export function mergeCandidateRecords(candidates: readonly CandidateRecord[]): CandidateRecord[] {
  const identities = assessmentIdentities(candidates);
  const merged = new Map<string, CandidateRecord>();
  for (const candidate of candidates) {
    const isUnreviewed = candidate.status === "Detected" || candidate.status === "NeedsReview";
    const next = isUnreviewed
      ? removeFalseUngradedRisk(migrateCandidateRelationship(candidate, identities))
      : structuredClone(candidate);
    if (isUnreviewed) next.semanticKey = semanticKey(next);
    const mapKey = isUnreviewed ? next.semanticKey : `${next.semanticKey}:${next.candidateId}`;
    const existing = merged.get(mapKey);
    if (!existing) {
      merged.set(mapKey, next);
      continue;
    }
    const existingSize = JSON.stringify(existing.proposedValue).length;
    const nextSize = JSON.stringify(next.proposedValue).length;
    const preferred = nextSize > existingSize ? next : existing;
    const additional = preferred === existing ? next : existing;
    const combined = mergeProposedValues(preferred.proposedValue, additional.proposedValue);
    const evidenceRefs = [...existing.evidenceRefs];
    for (const reference of next.evidenceRefs) {
      if (
        !evidenceRefs.some(
          (current) =>
            current.sourceId === reference.sourceId && current.locator === reference.locator
        )
      ) {
        evidenceRefs.push(reference);
      }
    }
    const result = structuredClone(preferred);
    result.semanticKey = next.semanticKey;
    result.proposedValue = combined.value;
    const unresolvedFields = {
      ...structuredClone(existing.unresolvedFields ?? {}),
      ...structuredClone(next.unresolvedFields ?? {}),
      ...combined.conflicts
    };
    if (Object.keys(unresolvedFields).length > 0) result.unresolvedFields = unresolvedFields;
    result.evidenceRefs = evidenceRefs;
    const reviewReason = existing.reviewReason ?? next.reviewReason;
    if (reviewReason) result.reviewReason = reviewReason;
    if (Object.keys(combined.conflicts).length > 0) {
      result.status = "NeedsReview";
      result.reviewReason ??= "Conflicting values were found for the same course fact.";
    } else if (existing.status === "NeedsReview" || next.status === "NeedsReview") {
      result.status = "NeedsReview";
    }
    merged.set(mapKey, result);
  }
  return [...merged.values()];
}

async function installationCredentials(
  repository: InstallationCredentialRepository,
  transport: AiBackendTransport
): Promise<{ installationId: string; token: string }> {
  const current = await repository.get();
  const installationId = current?.installationId ?? crypto.randomUUID();
  if (current?.installationToken) return { installationId, token: current.installationToken };
  const token = await transport.register(installationId);
  await repository.save({ installationId, installationToken: token });
  return { installationId, token };
}

export async function extractCandidateBatches(options: {
  courseId: string;
  scanId: string;
  batches: readonly NormalizedBatch[];
  credentials: InstallationCredentialRepository;
  transport: AiBackendTransport;
  now?: () => Date;
}): Promise<{ candidates: CandidateRecord[]; failures: BatchExtractionFailure[] }> {
  if (options.batches.length === 0) return { candidates: [], failures: [] };
  const installation = await installationCredentials(options.credentials, options.transport);
  let token = installation.token;
  let tokenRefreshAttempted = false;
  const now = options.now ?? (() => new Date());
  const candidates: CandidateRecord[] = [];
  const failures: BatchExtractionFailure[] = [];
  for (const batch of options.batches) {
    const request: AiExtractRequest = {
      contractVersion: CONTRACT_VERSION,
      requestId: crypto.randomUUID(),
      courseId: options.courseId,
      units: batch.units.map((unit) => ({
        sourceId: unit.sourceId,
        sourceType: unit.sourceType,
        title: unit.title,
        locator: unit.locator,
        text: unit.text,
        contentHash: unit.contentHash
      }))
    };
    try {
      let payload: unknown;
      try {
        payload = await options.transport.extract(token, request);
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED" && !tokenRefreshAttempted) {
          tokenRefreshAttempted = true;
          token = await options.transport.register(installation.installationId);
          await options.credentials.save({
            installationId: installation.installationId,
            installationToken: token
          });
          payload = await options.transport.extract(token, request);
        } else {
          throw error;
        }
      }
      const response = validatedResponse(payload, request);
      for (const extracted of response.candidates) {
        const candidate = routeCandidateRisk(extracted, request);
        if (!isMvpRelevantCandidate(candidate, request)) continue;
        candidates.push({
          ...candidate,
          candidateId: crypto.randomUUID(),
          courseId: options.courseId,
          scanId: options.scanId,
          status: candidate.reviewReason ? "NeedsReview" : "Detected",
          semanticKey: semanticKey(candidate),
          createdAt: now().toISOString(),
          providerResponse: {
            provider: response.provider,
            model: response.model,
            requestId: response.requestId
          }
        });
      }
    } catch (error) {
      failures.push({
        batchId: batch.batchId,
        code: error instanceof Error ? error.message : "AI_BATCH_FAILED"
      });
    }
  }

  const mergedCandidates = mergeCandidateRecords(candidates);
  const byKey = new Map<string, CandidateRecord[]>();
  for (const candidate of mergedCandidates) {
    const group = byKey.get(candidate.semanticKey) ?? [];
    group.push(candidate);
    byKey.set(candidate.semanticKey, group);
  }
  for (const group of byKey.values()) {
    const values = new Set(group.map((candidate) => JSON.stringify(candidate.proposedValue)));
    if (values.size <= 1) continue;
    const conflictGroupId = crypto.randomUUID();
    for (const candidate of group) {
      candidate.status = "NeedsReview";
      candidate.conflictGroupId = conflictGroupId;
      candidate.reviewReason ??= "Conflicting values were found for the same course fact.";
    }
  }
  return { candidates: mergedCandidates, failures };
}
