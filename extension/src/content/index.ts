import { CONTRACT_VERSION, isRecord, type CourseContext } from "@syllab/contracts";

export function detectCourseContext(url: URL): CourseContext | null {
  const match = url.pathname.match(/\/ultra\/courses\/([^/]+)\/outline(?:\/|$)/);
  const courseId = match?.[1];
  if (!courseId) return null;
  const courseName = readFirstVisibleText([
    '[data-testid="course-title"]',
    '[data-automation-id="course-title"]',
    "header h1",
    "main h1",
    "h1"
  ]);
  const courseCode =
    readFirstVisibleText(['[data-testid="course-code"]', '[data-automation-id="course-code"]']) ??
    extractDisplayCourseCode(courseName);
  return {
    courseId: decodeURIComponent(courseId),
    route: url.pathname,
    ...(courseCode ? { courseCode } : {}),
    ...(courseName ? { courseName } : {})
  };
}

export function extractDisplayCourseCode(courseName: string | undefined): string | undefined {
  return courseName?.match(/\b[A-Z]{2,4}\d{4}[A-Z]?\b/)?.[0];
}

function readFirstVisibleText(selectors: readonly string[]): string | undefined {
  if (typeof document === "undefined") return undefined;
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    const text = element?.innerText.trim();
    if (text) return text;
  }
  return undefined;
}

if (typeof chrome !== "undefined") {
  chrome.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse: (response: unknown) => void) => {
      if (!isRecord(message) || message.contractVersion !== CONTRACT_VERSION) {
        return false;
      }
      if (message.type === "GET_COURSE_CONTEXT") {
        sendResponse({
          contractVersion: CONTRACT_VERSION,
          context: detectCourseContext(new URL(location.href))
        });
        return false;
      }
      if (
        message.type === "DISCOVERY_API_GET" &&
        typeof message.courseId === "string" &&
        typeof message.endpoint === "string"
      ) {
        void readDiscoveryApi(message.courseId, message.endpoint).then(
          (payload) => sendResponse({ ok: true, payload }),
          (error: unknown) =>
            sendResponse({
              ok: false,
              status:
                isRecord(error) && typeof error.status === "number" ? error.status : undefined,
              message: error instanceof Error ? error.message : "Discovery request failed"
            })
        );
        return true;
      }
      return false;
    }
  );
}

export function validateDiscoveryEndpoint(
  courseId: string,
  endpoint: string,
  approvedOrigin = location.origin
): URL {
  const url = new URL(endpoint, approvedOrigin);
  const prefix = `/learn/api/v1/courses/${encodeURIComponent(courseId)}`;
  const contentPattern = new RegExp(
    `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/contents/[^/]+(?:/children)?$`
  );
  const isAnnouncement = url.pathname === `${prefix}/announcements`;
  if (url.origin !== approvedOrigin || (!contentPattern.test(url.pathname) && !isAnnouncement)) {
    throw new Error("Discovery endpoint is outside the approved read-only course API scope");
  }
  return url;
}

async function readDiscoveryApi(courseId: string, endpoint: string): Promise<unknown> {
  const url = validateDiscoveryEndpoint(courseId, endpoint);
  const response = await fetch(url, {
    credentials: "include",
    redirect: "error",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    throw Object.assign(new Error(`Course API returned HTTP ${String(response.status)}`), {
      status: response.status
    });
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Course API did not return JSON");
  }
  const text = await response.text();
  if (text.length > 5_000_000) throw new Error("Course API response exceeded the discovery limit");
  return JSON.parse(text) as unknown;
}
