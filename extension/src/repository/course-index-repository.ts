import type { CourseSummary, ScanSummary } from "@syllab/contracts";

import type { StorageArea } from "./schema-repository";

export const COURSE_INDEX_KEY = "syllab.courseIndex" as const;
export const SCAN_SUMMARIES_KEY = "syllab.scanSummaries" as const;

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
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
    const scans = readArray<ScanSummary>(result[SCAN_SUMMARIES_KEY]);
    return (
      scans.find(
        (scan) =>
          scan.courseId === courseId &&
          (scan.status === "Scanning" ||
            scan.status === "WaitingForPermission" ||
            (scan.status === "Interrupted" && scan.recoverable))
      ) ?? null
    );
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
    if (!target || target.status !== "Interrupted" || !target.recoverable) return null;
    const resumed: ScanSummary = { ...target, status: "Scanning", recoverable: true };
    await this.replaceScans(scans.map((scan) => (scan.scanId === scanId ? resumed : scan)));
    return resumed;
  }
}
