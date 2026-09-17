import { CONTRACT_VERSION, isRecord, type CourseContext } from "@syllab/contracts";

import { CourseIndexRepository } from "../repository/course-index-repository";
import { resolveEntryRoute, type EntryRoute } from "./entry-router";

async function readCurrentCourseContext(): Promise<CourseContext | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (activeTab?.id === undefined || !activeTab.url?.startsWith("https://ntulearn.ntu.edu.sg/")) {
    return null;
  }

  try {
    const response: unknown = await chrome.tabs.sendMessage(activeTab.id, {
      contractVersion: CONTRACT_VERSION,
      type: "GET_COURSE_CONTEXT"
    });
    if (!isRecord(response) || !isRecord(response.context)) return null;
    if (
      typeof response.context.courseId !== "string" ||
      typeof response.context.route !== "string"
    ) {
      return null;
    }
    return {
      courseId: response.context.courseId,
      route: response.context.route,
      ...(typeof response.context.courseCode === "string"
        ? { courseCode: response.context.courseCode }
        : {}),
      ...(typeof response.context.courseName === "string"
        ? { courseName: response.context.courseName }
        : {})
    };
  } catch {
    return null;
  }
}

export async function resolveCurrentEntry(): Promise<EntryRoute> {
  const context = await readCurrentCourseContext();
  if (!context) return { surface: "saved-courses" };

  const repository = new CourseIndexRepository(chrome.storage.local);
  const [course, entryScan] = await Promise.all([
    repository.findCourse(context.courseId),
    repository.findEntryScan(context.courseId)
  ]);
  return resolveEntryRoute({ context, course, entryScan });
}
