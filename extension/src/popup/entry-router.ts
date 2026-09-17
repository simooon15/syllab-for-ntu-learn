import type { CourseContext, CourseSummary, MainSurface, ScanSummary } from "@syllab/contracts";

export type ScanRouteState = "ready" | "scanning" | "waiting-for-permission" | "interrupted";

export type EntryRoute =
  | { surface: "saved-courses" }
  | {
      surface: "scan";
      state: ScanRouteState;
      courseId: string;
      scanId?: string;
      phase?: ScanSummary["phase"];
    }
  | { surface: "review"; courseId: string; scanId: string }
  | { surface: "course-brief"; courseId: string };

export interface EntryRouteInput {
  context: CourseContext | null;
  course: CourseSummary | null;
  entryScan: ScanSummary | null;
}

export function routeToSurface(route: EntryRoute): MainSurface {
  return route.surface;
}

export function resolveEntryRoute(input: EntryRouteInput): EntryRoute {
  if (!input.context) return { surface: "saved-courses" };

  if (input.entryScan) {
    const state: ScanRouteState =
      input.entryScan.status === "Scanning"
        ? "scanning"
        : input.entryScan.status === "WaitingForPermission"
          ? "waiting-for-permission"
          : "interrupted";
    return {
      surface: "scan",
      state,
      courseId: input.context.courseId,
      scanId: input.entryScan.scanId,
      ...(input.entryScan.phase ? { phase: input.entryScan.phase } : {})
    };
  }

  if (!input.course?.hasEffectiveScan) {
    return { surface: "scan", state: "ready", courseId: input.context.courseId };
  }

  return { surface: "course-brief", courseId: input.context.courseId };
}
