import type {
  AiExtractRequest,
  AiExtractResponse,
  CandidateStatus,
  ExtractedCandidate
} from "@syllab/contracts";

export interface InstallationCredentials {
  installationId: string;
  installationToken?: string;
}

export interface InstallationCredentialRepository {
  get(): Promise<InstallationCredentials | null>;
  save(credentials: InstallationCredentials): Promise<void>;
}

export interface AiBackendTransport {
  register(installationId: string): Promise<string>;
  extract(token: string, request: AiExtractRequest): Promise<unknown>;
}

export interface CandidateRecord extends ExtractedCandidate {
  candidateId: string;
  courseId: string;
  scanId: string;
  status: CandidateStatus;
  semanticKey: string;
  conflictGroupId?: string;
  unresolvedFields?: Record<string, unknown[]>;
  createdAt: string;
  providerResponse: Pick<AiExtractResponse, "provider" | "model" | "requestId">;
}

export interface BatchExtractionFailure {
  batchId: string;
  code: string;
}
