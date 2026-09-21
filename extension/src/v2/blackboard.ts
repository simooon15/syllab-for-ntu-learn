import { CONTRACT_VERSION, isRecord, type DiscoveredSource } from "@syllab/contracts";

import { DiscoveryApiError, type DiscoveryApiPort } from "../discovery/domain";
import { runDiscovery } from "../discovery/engine";
import type { EnrollmentApiPort } from "./enrollment";
import type { FetchedSource, MachinePort } from "./workflow";
import type { CourseRecord, SourceRecord } from "./domain";

export interface MachinePortDependencies {
  api(courseId: string, tabId: number | undefined): DiscoveryApiPort;
  /** Fetches one attachment's bytes and returns its parsed text, or a failure code. */
  parseAttachment(source: DiscoveredSource): Promise<{
    status: "ok" | "failed" | "unsupported" | "permission-denied";
    text: string;
    structure: string[];
    errorCode?: string;
  }>;
  /** The Origins a read has redirected to that the extension is not allowed to read yet. */
  missingPermissionOrigins(): Promise<string[]>;
  /**
   * The Origin a download redirects to, when it is one the extension may not read.
   *
   * A redirect is invisible to the fetch that triggered it — a refused cross-origin response is
   * opaque, `Location` and all — so the destination can only be learned by watching the browser's
   * own redirect events. Without it the product would know a file is unreadable and never know
   * what to ask for. Which Origins count as approved is a fact about the extension's permissions,
   * so the caller that owns them answers that, not this one. (Gate 3 finding F28.)
   */
  observeRedirect(requestUrl: string): Promise<string | null>;
  /** Remembers that Origin, so the run can park and the user can be asked for it. */
  recordPermissionOrigin(origin: string): Promise<void>;
}

/** In-memory discovery index; rebuilt from storage when the worker has been evicted. */
const discoveryCache = new Map<string, DiscoveredSource[]>();

export function cacheDiscoveredSources(courseId: string, sources: DiscoveredSource[]): void {
  discoveryCache.set(courseId, sources);
}

export function cachedSources(courseId: string): DiscoveredSource[] {
  return discoveryCache.get(courseId) ?? [];
}

/**
 * Turns Blackboard's HTML-ish payloads into plain text plus a locator structure. Headings and
 * list/table boundaries become structure entries so Task A can be chunked on native boundaries
 * instead of arbitrary character offsets.
 */
export function structureFromHtml(raw: string): { text: string; structure: string[] } {
  const withoutScripts = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const blocks = withoutScripts
    .split(/<\/(p|div|li|tr|h[1-6]|section|article|table|ul|ol)>/gi)
    .map((block) => block.replace(/<[^>]+>/g, " "));
  const structure: string[] = [];
  const lines: string[] = [];
  let index = 0;
  for (const block of blocks) {
    const text = decodeEntities(block).replace(/\s+/g, " ").trim();
    if (text.length === 0) continue;
    index += 1;
    structure.push(`${String(index)}. ${text.slice(0, 40)}`);
    lines.push(text);
  }
  return { text: lines.join("\n"), structure };
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " "
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (!entity.startsWith("#")) return named[entity.toLowerCase()] ?? match;
    const code =
      entity.startsWith("#x") || entity.startsWith("#X")
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : match;
  });
}

function sourceText(source: DiscoveredSource): { text: string; structure: string[] } {
  if (!source.rawText) return { text: "", structure: [] };
  return structureFromHtml(source.rawText);
}

export class BlackboardMachinePort implements MachinePort {
  constructor(private readonly dependencies: MachinePortDependencies) {}

  // The shape is the port's, not a second copy of it: a duplicated annotation is a second place
  // for the two to disagree, and the class already has to satisfy the interface.
  async discover(course: CourseRecord, tabId: number | undefined) {
    const result = await runDiscovery({
      scanId: `v2-${course.courseId}`,
      courseId: course.courseId,
      origin: "https://ntulearn.ntu.edu.sg",
      api: this.dependencies.api(course.courseId, tabId)
    });
    cacheDiscoveredSources(course.courseId, result.checkpoint.sources);
    return {
      sources: result.checkpoint.sources.map((source) => ({
        sourceId: source.sourceId,
        // Carried through rather than left behind: it is the item's own identifier, and a caller
        // that only has the Source id cannot address the item it came from. (Gate 3 finding F30.)
        nativeItemId: source.nativeItemId,
        title: source.title,
        kind: source.kind,
        ...(source.parentSourceId ? { parentSourceId: source.parentSourceId } : {})
      }))
    };
  }

  async fetchAndParse(
    source: SourceRecord,
    course: CourseRecord,
    _tabId: number | undefined
  ): Promise<FetchedSource> {
    const discovered = cachedSources(course.courseId).find(
      (item) => item.sourceId === source.sourceId
    );
    if (!discovered) {
      return {
        sourceId: source.sourceId,
        nativeItemId: source.nativeItemId,
        kind: source.kind,
        title: source.title,
        text: "",
        structure: [],
        fetchStatus: "failed",
        parseStatus: "not-attempted",
        errorCode: "SOURCE_NOT_DISCOVERED"
      };
    }

    if (discovered.kind !== "attachment") {
      const { text, structure } = sourceText(discovered);
      const successfullyRead = text.length > 0;
      return {
        sourceId: discovered.sourceId,
        nativeItemId: discovered.nativeItemId,
        ...(discovered.parentSourceId ? { parentSourceId: discovered.parentSourceId } : {}),
        kind: discovered.kind,
        title: discovered.title,
        text,
        structure,
        fetchStatus: successfullyRead ? "ok" : "failed",
        parseStatus: successfullyRead ? "ok" : "not-attempted",
        ...(!successfullyRead ? { errorCode: "NO_EXTRACTABLE_TEXT" } : {})
      };
    }

    // A download may leave the Course API for a host this extension is not allowed to read, and a
    // file it cannot read is a Course the model never sees. The Origin is learned from the
    // browser's own redirect events and recorded, and the read is reported as waiting on that
    // permission rather than as a failure — a permission the user can grant is not a Source that
    // has been tried and found wanting. (Gate 3 finding F28.)
    if (discovered.requestUrl) {
      const redirectOrigin = await this.dependencies.observeRedirect(discovered.requestUrl);
      if (redirectOrigin) {
        await this.dependencies.recordPermissionOrigin(redirectOrigin);
        return {
          sourceId: discovered.sourceId,
          nativeItemId: discovered.nativeItemId,
          ...(discovered.parentSourceId ? { parentSourceId: discovered.parentSourceId } : {}),
          kind: discovered.kind,
          title: discovered.title,
          text: "",
          structure: [],
          fetchStatus: "permission-denied",
          parseStatus: "not-attempted",
          errorCode: "HOST_PERMISSION_REQUIRED"
        };
      }
    }

    const parsed = await this.dependencies.parseAttachment(discovered);
    return {
      sourceId: discovered.sourceId,
      nativeItemId: discovered.nativeItemId,
      ...(discovered.parentSourceId ? { parentSourceId: discovered.parentSourceId } : {}),
      kind: discovered.kind,
      title: discovered.title,
      text: parsed.text,
      structure: parsed.structure,
      fetchStatus:
        parsed.status === "permission-denied"
          ? "permission-denied"
          : parsed.status === "ok"
            ? "ok"
            : "failed",
      parseStatus:
        parsed.status === "ok" ? "ok" : parsed.status === "unsupported" ? "unsupported" : "failed",
      ...(parsed.errorCode ? { errorCode: parsed.errorCode } : {})
    };
  }

  async missingPermissionOrigins(): Promise<string[]> {
    return this.dependencies.missingPermissionOrigins();
  }
}

export class ChromeTabDiscoveryApi implements DiscoveryApiPort {
  constructor(
    private readonly tabId: number,
    private readonly courseId: string
  ) {}

  async get(endpoint: string): Promise<unknown> {
    const response: unknown = await chrome.tabs.sendMessage(this.tabId, {
      contractVersion: CONTRACT_VERSION,
      type: "DISCOVERY_API_GET",
      courseId: this.courseId,
      endpoint
    });
    if (!isRecord(response) || response.ok !== true) {
      throw new DiscoveryApiError(
        isRecord(response) && typeof response.message === "string"
          ? response.message
          : "Course API bridge returned an invalid response",
        isRecord(response) && typeof response.status === "number" ? response.status : undefined
      );
    }
    return response.payload;
  }
}

/**
 * The enrollment read, through a live NTU Learn tab. It is a second scope rather than a second mode
 * of the one above, because discovery answers a different question — who is signed in and which
 * Courses they are enrolled in — and the Content Script validates it against its own allow-list.
 */
export class ChromeEnrollmentApi implements EnrollmentApiPort {
  constructor(private readonly tabId: number) {}

  async get(endpoint: string): Promise<unknown> {
    const response: unknown = await chrome.tabs.sendMessage(this.tabId, {
      contractVersion: CONTRACT_VERSION,
      type: "ENROLLMENT_API_GET",
      endpoint
    });
    if (!isRecord(response) || response.ok !== true) {
      throw new Error(
        isRecord(response) && typeof response.message === "string"
          ? response.message
          : "Enrollment API bridge returned an invalid response"
      );
    }
    return response.payload;
  }
}
