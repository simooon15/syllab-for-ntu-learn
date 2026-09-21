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
      if (message.type === "ENROLLMENT_API_GET" && typeof message.endpoint === "string") {
        void readEnrollmentApi(message.endpoint).then(
          (payload) => sendResponse({ ok: true, payload }),
          (error: unknown) =>
            sendResponse({
              ok: false,
              status:
                isRecord(error) && typeof error.status === "number" ? error.status : undefined,
              message: error instanceof Error ? error.message : "Enrollment request failed"
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

/**
 * The read-only scope Semester / Curriculum Course discovery is allowed. It is deliberately its own
 * scope rather than a widening of the course one: a discovery request names the signed-in user, the
 * user's memberships, or one term — never a Course's contents — and a reply body cannot extend it,
 * because the next request is validated the same way this one was.
 */
const ENROLLMENT_SCOPES = [
  /^\/learn\/api\/public\/v1\/users\/me$/,
  // The Ultra enrollment list, which is where NTU Learn actually serves memberships. Read from a
  // signed-in instance: `public/v1/users/me` answers 200 and `public/v1/users/me/memberships`
  // answers 404, so the two halves of this read live on different surfaces of the same API.
  /^\/learn\/api\/v1\/users\/me\/memberships$/
];

/**
 * The origin every read is measured against.
 *
 * The manifest injects this script on `https://ntulearn.ntu.edu.sg/*` and nowhere else, so the
 * approved origin is that and not whatever `location` happens to say. Reading it from `location`
 * made the check depend on the surroundings of the call rather than on the scope it is enforcing,
 * which is the wrong thing for a scope check to depend on.
 */
const APPROVED_ORIGIN = "https://ntulearn.ntu.edu.sg";

export function validateEnrollmentEndpoint(
  endpoint: string,
  approvedOrigin = APPROVED_ORIGIN
): URL {
  const url = new URL(endpoint, approvedOrigin);
  if (
    url.origin !== approvedOrigin ||
    !ENROLLMENT_SCOPES.some((scope) => scope.test(url.pathname))
  ) {
    // The path leads, because a run that is refused needs to say which read was refused and the
    // reader may only see the first line of it.
    throw new Error(
      `Enrollment read refused: ${url.pathname} (origin ${url.origin}, approved ${approvedOrigin}, scope ${ENROLLMENT_SCOPES.map((scope) => scope.source).join(" ")})`
    );
  }
  return url;
}

async function readEnrollmentApi(endpoint: string): Promise<unknown> {
  return readJson(validateEnrollmentEndpoint(endpoint));
}

async function readDiscoveryApi(courseId: string, endpoint: string): Promise<unknown> {
  return readJson(validateDiscoveryEndpoint(courseId, endpoint));
}

async function readJson(url: URL): Promise<unknown> {
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
