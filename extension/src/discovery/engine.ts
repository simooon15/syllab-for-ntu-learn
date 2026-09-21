import {
  isRecord,
  type DiscoveredSource,
  type DiscoveryIssue,
  type SourceKind
} from "@syllab/contracts";

import {
  DiscoveryApiError,
  type DiscoveryCheckpoint,
  type DiscoveryOptions,
  type DiscoveryResult
} from "./domain";

const collectionKeys = ["results", "items", "children", "contents", "announcements"] as const;

function cloneCheckpoint(checkpoint: DiscoveryCheckpoint): DiscoveryCheckpoint {
  return structuredClone(checkpoint);
}

function createCheckpoint(options: DiscoveryOptions): DiscoveryCheckpoint {
  return {
    scanId: options.scanId,
    courseId: options.courseId,
    queue: [{ nativeItemId: "ROOT", depth: 0, discoveryPath: ["content-root"] }],
    visitedContainerIds: [],
    visitedItemIds: [],
    visitedPageUrls: [],
    detailQueue: [],
    visitedDetailItemIds: [],
    sources: [],
    issues: [],
    pagesProcessed: 0,
    announcementsComplete: false,
    complete: false
  };
}

function readCollection(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return Array.from(payload) as unknown[];
  if (!isRecord(payload)) return null;
  for (const key of collectionKeys) {
    const collection: unknown = payload[key];
    if (Array.isArray(collection)) return Array.from(collection) as unknown[];
  }
  return null;
}

function readNextPage(payload: unknown, baseEndpoint: string): string | null {
  if (!isRecord(payload)) return null;
  const paging = isRecord(payload.paging)
    ? payload.paging
    : isRecord(payload.pagination)
      ? payload.pagination
      : null;
  const links = isRecord(payload.links) ? payload.links : null;
  const raw = paging?.nextPage ?? paging?.next ?? links?.next ?? payload.next;
  const href =
    typeof raw === "string" ? raw : isRecord(raw) && typeof raw.href === "string" ? raw.href : null;
  return href ? new URL(href, baseEndpoint).href : null;
}

function readString(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function itemId(item: Record<string, unknown>): string | undefined {
  return readString(item, ["id", "contentId", "content_id"]);
}

function itemTitle(item: Record<string, unknown>, fallback: string): string {
  const direct = readString(item, ["title", "name", "displayName"]);
  if (direct) return direct;
  const content = isRecord(item.content) ? item.content : null;
  return (content ? readString(content, ["title", "name", "displayName"]) : undefined) ?? fallback;
}

function itemType(item: Record<string, unknown>): string {
  const handler = item.contentHandler;
  const content = isRecord(item.content) ? item.content : null;
  const detail = isRecord(item.contentDetail) ? item.contentDetail : null;
  return [
    typeof handler === "string" ? handler : undefined,
    readString(item, ["contentHandlerId", "contentType", "type"]),
    isRecord(handler) ? readString(handler, ["id", "name"]) : undefined,
    content ? readString(content, ["contentHandlerId", "contentType", "type"]) : undefined,
    detail ? readString(detail, ["contentHandlerId", "contentType", "type"]) : undefined
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .slice(0, 160);
}

function itemKind(item: Record<string, unknown>): SourceKind {
  const type = itemType(item);
  if (/assignment|asmt|test-link/i.test(type)) return "assignment";
  return "course-content-item";
}

function explicitlyHasChildren(item: Record<string, unknown>): boolean {
  if (item.hasChildren === true || item.isFolder === true || item.isLearningModule === true)
    return true;
  const childCount = item.childCount ?? item.childrenCount;
  if (typeof childCount === "number" && childCount > 0) return true;
  if (typeof childCount === "string" && Number(childCount) > 0) return true;
  return /folder|module|container|lesson/i.test(itemType(item));
}

function shouldProbeChildren(item: Record<string, unknown>): boolean {
  if (explicitlyHasChildren(item)) return true;
  if (item.hasChildren === false) return false;
  const type = itemType(item);
  if (/file|document|externallink|courselink|assignment|discussion|test/i.test(type)) return false;
  return true;
}

function canonicalAttachmentUrl(raw: string, origin: string): string | undefined {
  try {
    const url = new URL(raw, origin);
    url.hash = "";
    url.search = "";
    return url.href;
  } catch {
    return undefined;
  }
}

function resolveAttachmentUrl(raw: string, origin: string): string | undefined {
  try {
    return new URL(raw, origin).href;
  } catch {
    return undefined;
  }
}

function extensionHint(value: string | undefined): boolean {
  if (!value) return false;
  return /\.(?:pdf|pptx?|docx?)(?:$|[?#])/i.test(value) || /\/bbcswebdav\//i.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function flattenCapturedFields(
  value: unknown,
  path: string,
  output: Array<[string, string]>
): void {
  if (value === null) {
    output.push([path, "null"]);
    return;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    output.push([path, String(value)]);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) output.push([path, "[]"]);
    value.forEach((entry, index) =>
      flattenCapturedFields(entry, `${path}[${String(index)}]`, output)
    );
    return;
  }
  if (!isRecord(value)) return;
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) output.push([path, "{}"]);
  for (const [key, entry] of entries) {
    flattenCapturedFields(entry, path ? `${path}.${key}` : key, output);
  }
}

/**
 * Mechanical Source capture only. Local code deliberately does not decide which Blackboard fields
 * carry Assessment meaning: every scalar the read-only Course API returned is preserved for Task A
 * to interpret. Empty values are facts too; the only transformation is deterministic flattening.
 */
function capturedSourceEvidence(label: string, item: Record<string, unknown>): string {
  const fields: Array<[string, string]> = [];
  flattenCapturedFields(item, "", fields);
  return [
    `<p>${escapeHtml(label)}</p>`,
    ...fields.map(([path, value]) => `<p>${escapeHtml(path)}: ${escapeHtml(value)}</p>`)
  ].join("");
}

function appendCapturedEvidence(
  existing: string | undefined,
  label: string,
  item: Record<string, unknown>
): string {
  const captured = capturedSourceEvidence(label, item);
  return existing ? `${existing}${captured}` : captured;
}

function attachmentCandidates(item: Record<string, unknown>): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];
  const visited = new WeakSet<object>();
  const sensitiveKey = /token|cookie|auth|session|password|user|grade|submission|attempt/i;

  const walk = (value: unknown, depth: number, attachmentContext: boolean): void => {
    if (depth > 8 || value === null || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, depth + 1, attachmentContext);
      return;
    }
    const record = value as Record<string, unknown>;
    const rawUrl = readString(record, [
      "url",
      "downloadUrl",
      "download_url",
      "fileUrl",
      "href",
      "permanentUrl"
    ]);
    const fileName = readString(record, ["fileName", "filename", "name", "displayName"]);
    if (rawUrl && (attachmentContext || extensionHint(fileName) || extensionHint(rawUrl))) {
      candidates.push(record);
    }
    for (const [key, entry] of Object.entries(record)) {
      if (sensitiveKey.test(key)) continue;
      if (
        typeof entry === "string" &&
        /^(body|description|rawText|renderedText|formattedText|text|html)$/i.test(key)
      ) {
        for (const match of entry.matchAll(/(?:href|src|data)\s*=\s*["']([^"']+)["']/gi)) {
          const href = match[1]?.replaceAll("&amp;", "&");
          if (href && extensionHint(href)) candidates.push({ href });
        }
        continue;
      }
      walk(entry, depth + 1, attachmentContext || /attachments?|files?/i.test(key));
    }
  };
  walk(item, 0, false);
  return candidates;
}

function addAttachments(
  checkpoint: DiscoveryCheckpoint,
  item: Record<string, unknown>,
  parent: DiscoveredSource,
  origin: string
): void {
  for (const [index, attachment] of attachmentCandidates(item).entries()) {
    const rawUrl = readString(attachment, [
      "url",
      "downloadUrl",
      "download_url",
      "fileUrl",
      "href",
      "permanentUrl"
    ]);
    const requestUrl = rawUrl ? resolveAttachmentUrl(rawUrl, origin) : undefined;
    const canonicalUrl = rawUrl ? canonicalAttachmentUrl(rawUrl, origin) : undefined;
    const nativeId = readString(attachment, ["id", "fileId", "attachmentId"]);
    const stablePart = nativeId ?? canonicalUrl ?? `${parent.nativeItemId}:${String(index)}`;
    const sourceId = `attachment:${encodeURIComponent(parent.nativeItemId)}:${encodeURIComponent(stablePart)}`;
    if (checkpoint.sources.some((source) => source.sourceId === sourceId)) continue;
    checkpoint.sources.push({
      sourceId,
      courseId: checkpoint.courseId,
      scanId: checkpoint.scanId,
      nativeItemId: nativeId ?? stablePart,
      parentSourceId: parent.sourceId,
      kind: "attachment",
      title:
        readString(attachment, ["fileName", "filename", "name", "displayName"]) ??
        `Attachment ${String(index + 1)}`,
      ...(canonicalUrl ? { canonicalUrl } : {}),
      ...(requestUrl ? { requestUrl } : {}),
      discoveryPath: [...parent.discoveryPath, sourceId],
      depth: parent.depth + 1,
      status: "discovered"
    });
  }
}

function validateNextPage(next: string, firstEndpoint: string): DiscoveryIssue | null {
  const nextUrl = new URL(next);
  const firstUrl = new URL(firstEndpoint);
  if (nextUrl.origin !== firstUrl.origin || nextUrl.pathname !== firstUrl.pathname) {
    return {
      code: "OUT_OF_SCOPE_PAGINATION",
      retryable: false,
      detail: "Pagination left the allowed collection endpoint"
    };
  }
  return null;
}

function hasUnresolvedPagination(
  payload: unknown,
  accumulatedItemCount: number,
  nextPage: string | null
): boolean {
  if (nextPage || !isRecord(payload)) return false;
  const paging = isRecord(payload.paging)
    ? payload.paging
    : isRecord(payload.pagination)
      ? payload.pagination
      : null;
  const totalValue = paging?.total ?? payload.totalCount ?? payload.total;
  const total = typeof totalValue === "number" ? totalValue : Number(totalValue);
  return (
    paging?.hasMore === true ||
    payload.hasMore === true ||
    (Number.isFinite(total) && total > accumulatedItemCount)
  );
}

async function checkpoint(options: DiscoveryOptions, state: DiscoveryCheckpoint): Promise<void> {
  await options.onCheckpoint?.(cloneCheckpoint(state));
}

function contentEndpoint(origin: string, courseId: string, parentId: string): string {
  return `${origin}/learn/api/v1/courses/${encodeURIComponent(courseId)}/contents/${encodeURIComponent(parentId)}/children`;
}

function contentDetailEndpoint(origin: string, courseId: string, itemIdValue: string): string {
  return `${origin}/learn/api/v1/courses/${encodeURIComponent(courseId)}/contents/${encodeURIComponent(itemIdValue)}`;
}

async function discoverContent(
  options: DiscoveryOptions,
  state: DiscoveryCheckpoint
): Promise<void> {
  const visitedContainers = new Set(state.visitedContainerIds);
  const visitedItems = new Set(state.visitedItemIds);
  const maxDepth = options.maxDepth ?? 20;

  const finishParent = (nativeItemId: string): void => {
    state.queue.shift();
    visitedContainers.add(nativeItemId);
    state.visitedContainerIds = [...visitedContainers];
  };

  while (state.queue.length > 0 && state.pagesProcessed < (options.maxPages ?? 600)) {
    const parent = state.queue[0];
    if (!parent) break;
    if (visitedContainers.has(parent.nativeItemId)) {
      state.queue.shift();
      continue;
    }
    const firstEndpoint = contentEndpoint(options.origin, options.courseId, parent.nativeItemId);
    const endpoint = parent.nextPageUrl ?? firstEndpoint;
    if (state.visitedPageUrls.includes(endpoint)) {
      state.issues.push({ code: "PAGINATION_LOOP", retryable: false, detail: firstEndpoint });
      finishParent(parent.nativeItemId);
      await checkpoint(options, state);
      continue;
    }

    let payload: unknown;
    try {
      payload = await options.api.get(endpoint);
    } catch (error) {
      if (
        error instanceof DiscoveryApiError &&
        error.status === 400 &&
        parent.nativeItemId !== "ROOT"
      ) {
        finishParent(parent.nativeItemId);
      } else {
        state.issues.push({
          ...(parent.parentSourceId ? { sourceId: parent.parentSourceId } : {}),
          code: "API_REQUEST_FAILED",
          retryable: true,
          detail: error instanceof Error ? error.message : "Discovery request failed"
        });
        finishParent(parent.nativeItemId);
      }
      await checkpoint(options, state);
      continue;
    }

    state.pagesProcessed += 1;
    state.visitedPageUrls.push(endpoint);
    const rawItems = readCollection(payload);
    if (!rawItems) {
      state.issues.push({ code: "INVALID_COLLECTION", retryable: false, detail: firstEndpoint });
      finishParent(parent.nativeItemId);
      await checkpoint(options, state);
      continue;
    }

    for (const rawItem of rawItems) {
      if (!isRecord(rawItem)) continue;
      const nativeItemId = itemId(rawItem);
      if (!nativeItemId) {
        state.issues.push({
          ...(parent.parentSourceId ? { sourceId: parent.parentSourceId } : {}),
          code: "INVALID_ITEM_ID",
          retryable: false,
          detail: "A discovered content item had no native ID"
        });
        continue;
      }
      if (visitedItems.has(nativeItemId)) continue;
      visitedItems.add(nativeItemId);
      state.visitedItemIds = [...visitedItems];
      const sourceId = `content:${nativeItemId}`;
      const source: DiscoveredSource = {
        sourceId,
        courseId: options.courseId,
        scanId: options.scanId,
        nativeItemId,
        ...(parent.parentSourceId ? { parentSourceId: parent.parentSourceId } : {}),
        kind: itemKind(rawItem),
        ...(itemType(rawItem) ? { nativeTypeHint: itemType(rawItem) } : {}),
        title: itemTitle(rawItem, nativeItemId),
        discoveryPath: [...parent.discoveryPath, sourceId],
        depth: parent.depth,
        status: "discovered"
      };
      source.rawText = capturedSourceEvidence("Blackboard collection metadata", rawItem);
      state.sources.push(source);
      addAttachments(state, rawItem, source, options.origin);
      state.detailQueue.push({ nativeItemId, sourceId });

      if (shouldProbeChildren(rawItem) && parent.depth < maxDepth) {
        state.queue.push({
          nativeItemId,
          parentSourceId: sourceId,
          depth: parent.depth + 1,
          discoveryPath: source.discoveryPath
        });
      }
    }

    parent.itemsSeen = (parent.itemsSeen ?? 0) + rawItems.length;
    const candidate = readNextPage(payload, firstEndpoint);
    const paginationIssue = candidate ? validateNextPage(candidate, firstEndpoint) : null;
    if (paginationIssue) {
      state.issues.push(paginationIssue);
      finishParent(parent.nativeItemId);
    } else if (candidate) {
      parent.nextPageUrl = candidate;
    } else if (hasUnresolvedPagination(payload, parent.itemsSeen, candidate)) {
      state.issues.push({
        ...(parent.parentSourceId ? { sourceId: parent.parentSourceId } : {}),
        code: "UNRESOLVED_PAGINATION",
        retryable: false,
        detail: "Collection reports more items but provides no usable next-page cursor"
      });
      finishParent(parent.nativeItemId);
    } else {
      finishParent(parent.nativeItemId);
    }
    await checkpoint(options, state);
  }

  if (state.queue.length > 0) {
    state.issues.push({
      code: "PAGE_LIMIT_REACHED",
      retryable: false,
      detail: `Discovery stopped after ${String(options.maxPages ?? 600)} API responses`
    });
    state.queue = [];
    await checkpoint(options, state);
  }
}

async function discoverContentDetails(
  options: DiscoveryOptions,
  state: DiscoveryCheckpoint
): Promise<void> {
  const visitedDetails = new Set(state.visitedDetailItemIds);
  const visitedContainers = new Set(state.visitedContainerIds);
  const maxDepth = options.maxDepth ?? 20;

  while (state.detailQueue.length > 0 && state.pagesProcessed < (options.maxPages ?? 600)) {
    const work = state.detailQueue.shift();
    if (!work || visitedDetails.has(work.nativeItemId)) continue;
    const endpoint = contentDetailEndpoint(options.origin, options.courseId, work.nativeItemId);
    let payload: unknown;
    try {
      payload = await options.api.get(endpoint);
      state.pagesProcessed += 1;
      state.visitedPageUrls.push(endpoint);
    } catch (error) {
      state.issues.push({
        sourceId: work.sourceId,
        code: "DETAIL_REQUEST_FAILED",
        retryable:
          !(error instanceof DiscoveryApiError) ||
          error.status === undefined ||
          error.status >= 500,
        detail: error instanceof Error ? error.message : "Content detail request failed"
      });
      visitedDetails.add(work.nativeItemId);
      state.visitedDetailItemIds = [...visitedDetails];
      await checkpoint(options, state);
      continue;
    }

    const record = isRecord(payload) && isRecord(payload.content) ? payload.content : payload;
    if (!isRecord(record) || itemId(record) !== work.nativeItemId) {
      state.issues.push({
        sourceId: work.sourceId,
        code: "DETAIL_IDENTITY_MISMATCH",
        retryable: false,
        detail: "Content detail did not match the requested native item"
      });
    } else {
      const source = state.sources.find((candidate) => candidate.sourceId === work.sourceId);
      if (source) {
        if (itemKind(record) === "assignment") source.kind = "assignment";
        source.title = itemTitle(record, source.title);
        const nativeTypeHint = itemType(record);
        if (nativeTypeHint) source.nativeTypeHint = nativeTypeHint;
        source.rawText = appendCapturedEvidence(
          source.rawText,
          "Blackboard detail metadata",
          record
        );
        addAttachments(state, record, source, options.origin);
        if (
          explicitlyHasChildren(record) &&
          source.depth < maxDepth &&
          !visitedContainers.has(work.nativeItemId) &&
          !state.queue.some((item) => item.nativeItemId === work.nativeItemId)
        ) {
          state.queue.push({
            nativeItemId: work.nativeItemId,
            parentSourceId: source.sourceId,
            depth: source.depth + 1,
            discoveryPath: source.discoveryPath
          });
        }
      }
    }
    visitedDetails.add(work.nativeItemId);
    state.visitedDetailItemIds = [...visitedDetails];
    await checkpoint(options, state);
  }

  if (state.detailQueue.length > 0) {
    state.issues.push({
      code: "PAGE_LIMIT_REACHED",
      retryable: false,
      detail: `Discovery stopped after ${String(options.maxPages ?? 600)} API responses`
    });
    state.detailQueue = [];
    await checkpoint(options, state);
  }
}

async function discoverAnnouncements(
  options: DiscoveryOptions,
  state: DiscoveryCheckpoint
): Promise<void> {
  if (state.announcementsComplete) return;
  const firstEndpoint = `${options.origin}/learn/api/v1/courses/${encodeURIComponent(options.courseId)}/announcements`;

  while (!state.announcementsComplete && state.pagesProcessed < (options.maxPages ?? 600)) {
    const endpoint = state.announcementsNextPageUrl ?? firstEndpoint;
    if (state.visitedPageUrls.includes(endpoint)) {
      state.issues.push({ code: "PAGINATION_LOOP", retryable: false, detail: firstEndpoint });
      state.announcementsComplete = true;
      break;
    }

    let payload: unknown;
    try {
      payload = await options.api.get(endpoint);
    } catch (error) {
      state.issues.push({
        code: "API_REQUEST_FAILED",
        retryable: true,
        detail: error instanceof Error ? error.message : "Announcement discovery failed"
      });
      state.announcementsComplete = true;
      break;
    }

    state.pagesProcessed += 1;
    state.visitedPageUrls.push(endpoint);
    const announcements = readCollection(payload);
    if (!announcements) {
      state.issues.push({ code: "INVALID_COLLECTION", retryable: false, detail: firstEndpoint });
      state.announcementsComplete = true;
      break;
    }

    for (const raw of announcements) {
      if (!isRecord(raw)) continue;
      const nativeItemId = itemId(raw);
      if (!nativeItemId) continue;
      const sourceId = `announcement:${nativeItemId}`;
      if (state.sources.some((source) => source.sourceId === sourceId)) continue;
      const source: DiscoveredSource = {
        sourceId,
        courseId: options.courseId,
        scanId: options.scanId,
        nativeItemId,
        kind: "announcement",
        title: itemTitle(raw, nativeItemId),
        discoveryPath: ["announcements", sourceId],
        depth: 0,
        status: "discovered"
      };
      source.rawText = capturedSourceEvidence("Blackboard announcement metadata", raw);
      state.sources.push(source);
      addAttachments(state, raw, source, options.origin);
    }

    const candidate = readNextPage(payload, firstEndpoint);
    const paginationIssue = candidate ? validateNextPage(candidate, firstEndpoint) : null;
    if (paginationIssue) {
      state.issues.push(paginationIssue);
      state.announcementsComplete = true;
    } else if (candidate) {
      state.announcementsNextPageUrl = candidate;
    } else {
      state.announcementsComplete = true;
      delete state.announcementsNextPageUrl;
    }
    await checkpoint(options, state);
  }

  if (!state.announcementsComplete) {
    state.issues.push({
      code: "PAGE_LIMIT_REACHED",
      retryable: false,
      detail: `Discovery stopped after ${String(options.maxPages ?? 600)} API responses`
    });
    state.announcementsComplete = true;
  }
  await checkpoint(options, state);
}

export async function runDiscovery(options: DiscoveryOptions): Promise<DiscoveryResult> {
  const state = options.checkpoint
    ? cloneCheckpoint(options.checkpoint)
    : createCheckpoint(options);
  const persistedShape = state as unknown as Record<string, unknown>;
  if (!Array.isArray(persistedShape.detailQueue)) state.detailQueue = [];
  if (!Array.isArray(persistedShape.visitedDetailItemIds)) state.visitedDetailItemIds = [];
  if (typeof persistedShape.announcementsComplete !== "boolean") {
    state.announcementsComplete = false;
  }
  while (state.queue.length > 0 || state.detailQueue.length > 0) {
    await discoverContent(options, state);
    await discoverContentDetails(options, state);
  }
  await discoverAnnouncements(options, state);
  state.complete = true;
  await checkpoint(options, state);
  const status =
    state.sources.length === 0 && state.issues.length > 0
      ? "Failed"
      : state.issues.length > 0
        ? "Partial"
        : "Complete";
  return { checkpoint: state, status };
}
