import type { CourseSummary, ScanSummary } from "@syllab/contracts";

import type { StorageArea } from "./schema-repository";

export const COURSE_INDEX_KEY = "syllab.courseIndex" as const;
export const SCAN_SUMMARIES_KEY = "syllab.scanSummaries" as const;

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// A failed stage keeps its completed checkpoint on disk, so it is resumed the same way an
// interrupted scan is. A failure that cannot be resumed (for example a discovery failure that
// never produced a usable checkpoint) carries `recoverable: false` and stays unreachable here.
function isResumableStatus(status: ScanSummary["status"]): boolean {
  return status === "Interrupted" || status === "Failed";
}

export class CourseIndexRepository {
  constructor(private readonly storage: StorageArea) {}

  async listCourses(): Promise<CourseSummary[]> {
    const result = await this.storage.get(COURSE_INDEX_KEY);
    return readArray<CourseSummary>(result[COURSE_INDEX_KEY]);
  }

  async findCourse(courseId: string): Promise<CourseSummary | null> {
    const courses = await this.listCourses();
    return courses.find((course) => course.courseId === courseId) ?? null;
  }

  async findCourseByScanFallback(scanId: string): Promise<CourseSummary | null> {
    const scans = await this.listScans();
    const scan = scans.find((item) => item.scanId === scanId);
    return scan ? this.findCourse(scan.courseId) : null;
  }

  async upsertCourse(course: CourseSummary): Promise<void> {
    const courses = await this.listCourses();
    await this.storage.set({
      [COURSE_INDEX_KEY]: [course, ...courses.filter((item) => item.courseId !== course.courseId)]
    });
  }

  async findEntryScan(courseId: string): Promise<ScanSummary | null> {
    const result = await this.storage.get(SCAN_SUMMARIES_KEY);
    const scans = readArray<ScanSummary>(result[SCAN_SUMMARIES_KEY]).filter(
      (scan) => scan.courseId === courseId
    );
    const isRunning = (scan: ScanSummary): boolean =>
      scan.status === "Scanning" || scan.status === "WaitingForPermission";
    const isResumable = (scan: ScanSummary): boolean =>
      isResumableStatus(scan.status) && scan.recoverable;

    // Summaries are stored newest first, so the newest entry is where the course actually stands:
    // a live scan, or a scan whose checkpoint is still the course's current one. A merely resumable
    // scan is therefore only offered while it is still that newest entry. Once a newer scan exists,
    // an old interrupted checkpoint must not shadow the course's real state or its finished Brief.
    const newest = scans[0];
    if (newest && (isRunning(newest) || isResumable(newest))) return newest;

    // A scan that never stopped is still running, whatever else was written after it.
    return scans.find(isRunning) ?? null;
  }

  async listScans(): Promise<ScanSummary[]> {
    const result = await this.storage.get(SCAN_SUMMARIES_KEY);
    return readArray<ScanSummary>(result[SCAN_SUMMARIES_KEY]);
  }

  async replaceScans(scans: readonly ScanSummary[]): Promise<void> {
    await this.storage.set({ [SCAN_SUMMARIES_KEY]: structuredClone(scans) });
  }

  async resumeScan(scanId: string): Promise<ScanSummary | null> {
    const scans = await this.listScans();
    const target = scans.find((scan) => scan.scanId === scanId);
    if (!target || !isResumableStatus(target.status) || !target.recoverable) return null;
    const resumed: ScanSummary = { ...target, status: "Scanning", recoverable: true };
    await this.replaceScans(scans.map((scan) => (scan.scanId === scanId ? resumed : scan)));
    return resumed;
  }
}
