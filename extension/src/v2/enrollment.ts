import { isRecord } from "@syllab/contracts";

import { semesterContext } from "./date-resolution";
import { qaTrace } from "./qa-telemetry";
import type { CourseRecord, SemesterRecord } from "./schema";

/**
 * Semester / Curriculum Course discovery.
 *
 * PRD §5.1.5 inherits Blackboard's Semester → Curriculum Course structure: curriculum Courses enter
 * the current Semester on their own, non-curriculum Courses are excluded, and discovery never starts
 * a Scan. This module is that inheritance — the read, the mapping onto `SemesterRecord` and
 * `CourseRecord`, and the merge that keeps everything the product already knows about a Course.
 *
 * Nothing here calls the model, and nothing here starts a Scan. A Course this module creates arrives
 * in the Not Established state, which is what the user sees on the Semester Dashboard.
 */

/**
 * The Blackboard Learn reads discovery performs. One list, so a wrong path is one edit.
 *
 * Both were chosen by asking a signed-in NTU Learn what it actually serves, which is the only way
 * to know: `/learn/api/public/v1/users/me` answers 200, but the memberships read on that same
 * `public/v1` surface answers 404 — the Ultra enrollment list lives under `/learn/api/v1/` instead.
 * Reading `expand=course` there returns each Course's term inline, so one request replaces the
 * three an invented shape needed.
 */
export const ENROLLMENT_PATHS = {
  me: "/learn/api/public/v1/users/me",
  memberships: "/learn/api/v1/users/me/memberships?expand=course&limit=200"
} as const;

export interface EnrollmentApiPort {
  get(path: string): Promise<unknown>;
}

export interface EnrollmentStorePort {
  readSemesters(): Promise<SemesterRecord[]>;
  readCourses(): Promise<CourseRecord[]>;
  saveSemester(semester: SemesterRecord): Promise<void>;
  upsertCourse(course: CourseRecord): Promise<void>;
}

/** What the native side reports, before anything local is taken into account. */
export interface DiscoveredCourse {
  nativeCourseId: string;
  courseCode: string;
  courseName: string;
  nativeTermId: string;
}

export interface DiscoveredTerm {
  nativeTermId: string;
  label: string;
}

export interface Discovery {
  terms: DiscoveredTerm[];
  courses: DiscoveredCourse[];
}

export interface AppliedDiscovery {
  semesters: number;
  courses: number;
  currentSemesterId: string | null;
}

export class EnrollmentUnavailable extends Error {}

const MAX_MEMBERSHIP_PAGES = 10;

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * One enrollment, as NTU Learn states it.
 *
 * The two ids are not the same id and only one of them is the Course's identity: the outer
 * `courseId` is the native one the Ultra routes use (`/ultra/courses/_2707107_1/outline`), while the
 * nested `course.courseId` repeats `displayId` — `26S1-MA6081-B`, a term-and-code label that changes
 * every semester. Discovery keys on the native id for that reason.
 */
function readCourse(value: unknown): DiscoveredCourse | null {
  if (!isRecord(value)) return null;
  const course = isRecord(value.course) ? value.course : null;
  const nativeCourseId = readString(value.courseId) ?? readString(course?.courseId);
  const nativeTermId = readString(course?.termId);
  if (!nativeCourseId || !nativeTermId) return null;
  const displayId = readString(course?.displayId);
  const name = readString(course?.name);
  // The card wants a course code, and NTU writes it inside a label like `26S1-MA6081-B`. The same
  // conservative shape the Content Script uses on a page heading reads it out; when there is none,
  // the label is shown as it stands rather than trimmed into something that is not a code.
  const code = (displayId ?? name ?? nativeCourseId).match(/\b[A-Z]{2,4}\d{4}[A-Z]?\b/)?.[0];
  const label = name ?? displayId ?? nativeCourseId;
  return {
    nativeCourseId,
    courseCode: code ?? displayId ?? nativeCourseId,
    courseName: code ? displayName(label, code) : label,
    nativeTermId
  };
}

/**
 * A Course's name as a reader wants it: its code, then what the native name says about the Course.
 *
 * NTU Learn names a Course `26S1-MAE-MSc-MA6081-FUNDAMENTALS OF PROJECT MANAGEMENT - B` — the term,
 * the school, the code, then the name, all in capitals. The card carries the code in its own line,
 * and the term and the school tell the student nothing they are looking at the card for, so the name
 * keeps the code and what follows it, written the way English writes a title.
 *
 * The native name is trimmed and re-cased, never rewritten: a name that does not contain its own
 * code is still title-cased, because a wall of capitals is a property of how NTU Learn stores names
 * rather than something the name means. (Product Owner direction, DIRECTION_ADJUSTMENTS §2.26.)
 */
export function displayName(label: string, code: string): string {
  const at = label.indexOf(code);
  if (at < 0) return titleCase(label);
  const remainder = label
    .slice(at + code.length)
    .replace(/^[-–—\s]+/u, "")
    .trim();
  return remainder.length > 0 ? `${code} ${titleCase(remainder)}` : code;
}

/**
 * Articles, coordinating conjunctions and prepositions.
 *
 * These are the words a title leaves in lower case — `Fundamentals of Project Management` — unless
 * one of them leads or ends the title, where English capitalises it anyway.
 */
const MINOR_WORD = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "for",
  "nor",
  "so",
  "yet",
  "as",
  "at",
  "by",
  "if",
  "in",
  "of",
  "on",
  "per",
  "to",
  "up",
  "via",
  "vs"
]);

/** A word as a title sets it, honouring the hyphens inside it. */
function titleWord(word: string, isEdge: boolean): string {
  return word
    .split(/(?<=.)-(?=.)/u)
    .map((part) => titlePart(part, isEdge))
    .join("-");
}

/** Every letter a vowel needs; a word without one is not a word. */
const VOWEL = /[AEIOU]/u;

function titlePart(part: string, isEdge: boolean): string {
  // A code is not a word: `MA6081` and `26S1` keep their shape whatever case they arrive in.
  if (/\d/u.test(part)) return part;

  // A lone letter is a designator, not an article. Course names end in `… - A and F`, where the `A`
  // names a section; lower-casing it the way a title lower-cases the article "a" would be reading
  // the name as prose it is not.
  if (part.length === 1) return part.toUpperCase();

  const lower = part.toLowerCase();
  const minor = MINOR_WORD.has(lower);
  // A title leaves a minor word down, but never when it leads or ends one.
  if (minor) return isEdge ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}` : lower;

  // An acronym is already spelled the way it should be, and lower-casing it into `Ai` would be a
  // correction that makes the name wrong. Length and vowels are what tell one from a word that
  // merely arrived in capitals: `AI`, `PDF`, `NTU`, `HTML` are acronyms, and `COST`, `DATA`, `EXAM`
  // are words — four letters and a vowel between them. A four-letter acronym that does have a vowel
  // will read as a word, which is the rarer mistake of the two.
  if (/^[A-Z]+$/u.test(part) && (part.length <= 3 || !VOWEL.test(part))) return part;

  return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
}

function titleCase(value: string): string {
  const words = value.split(/\s+/u).filter((word) => word.length > 0);
  return words
    .map((word, index) => titleWord(word, index === 0 || index === words.length - 1))
    .join(" ");
}

/**
 * A term NTU Learn names as non-curriculum.
 *
 * The real enrollment list contains a term literally called `Non-curriculum`, holding Courses like
 * `26S1_YLGC01` — short courses and continuing education, which a student is enrolled in but which
 * are not part of the academic semester. PRD §5.1.5 inherits the Curriculum Course structure and
 * says non-curriculum is excluded by default, and the term's own name is the only signal the API
 * offers for it. (Gate 3 finding F9.)
 */
const NON_CURRICULUM_TERM = /non[-\s]?curriculum/i;

/** The term a membership carries inline, when `expand=course` supplied one. */
function readTerm(value: unknown): DiscoveredTerm | null {
  if (!isRecord(value)) return null;
  const course = isRecord(value.course) ? value.course : null;
  const term = isRecord(course?.term) ? course.term : null;
  const nativeTermId = readString(course?.termId) ?? readString(term?.id);
  if (!nativeTermId) return null;
  const name = readString(term?.name) ?? nativeTermId;
  if (NON_CURRICULUM_TERM.test(name)) return null;
  return { nativeTermId, label: semesterLabel(name) };
}

/**
 * A Course is curriculum when it belongs to a term. Organizations, sandboxes and other
 * non-curriculum containers carry no term, which is exactly the distinction PRD §5.1.5 draws.
 */
/** One page of enrollments, sorted into Courses and the terms they carry. */
function collectMemberships(
  payload: unknown,
  courses: Map<string, DiscoveredCourse>,
  terms: Map<string, DiscoveredTerm>
): void {
  const results = isRecord(payload) && Array.isArray(payload.results) ? payload.results : [];
  for (const entry of results) {
    // The term is read first: it is what decides whether this enrollment is a Curriculum Course at
    // all, so a Course without one — and a Course under a non-curriculum term, which reads as no
    // term — never reaches the store.
    const term = readTerm(entry);
    if (!term) continue;
    const course = readCourse(entry);
    if (!course) continue;
    courses.set(course.nativeCourseId, course);
    terms.set(term.nativeTermId, term);
  }
}

function nextPage(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const paging = isRecord(payload.paging) ? payload.paging : null;
  const href = readString(paging?.nextPage) ?? readString(payload.next);
  if (!href) return null;
  // The API hands back an absolute URL; only the path is read, because the content script serves
  // one approved origin and must not be pointed anywhere else by a response body.
  try {
    return new URL(href).pathname + new URL(href).search;
  } catch {
    return href.startsWith("/") ? href : null;
  }
}

const TERM_MONTH = 8;
/** `26S1` — the shape NTU Learn names its terms with. */
const NTU_TERM = /^\s*(\d{2})\s*S\s*([12])\b/;

/**
 * The product's Semester label for a term, and the academic year and term it stands for.
 *
 * The label form is the one the Product Owner fixed in DIRECTION_ADJUSTMENTS §2.17 — `AY2026/27 ·
 * Semester 1` — and it is also what the date resolver reads, so a label the resolver cannot parse
 * would silently cost every Course in that Semester the year-less dates in its Sources.
 *
 * NTU Learn names its terms `26S1`, `19S1`, `26S2`: the year the academic year begins and the term
 * within it, which is exactly the two facts the label needs. A term named that way is translated; a
 * name that already carries both facts is kept; anything else is left alone rather than guessed at,
 * because an unreadable label leaves dates unresolved, which is the honest answer, where an
 * invented year is not.
 */
export function semesterName(name: string): { startYear: number; term: 1 | 2 } | null {
  const native = NTU_TERM.exec(name);
  if (native?.[1] && native[2]) {
    return { startYear: 2000 + Number(native[1]), term: native[2] === "1" ? 1 : 2 };
  }
  const context = semesterContext({ label: name });
  return context ? { startYear: context.startYear, term: context.term } : null;
}

export function semesterLabel(name: string): string {
  const named = semesterName(name);
  if (!named) return name;
  const next = String((named.startYear + 1) % 100).padStart(2, "0");
  return `AY${String(named.startYear)}/${next} · Semester ${String(named.term)}`;
}

/** The academic year and term `now` falls in, using the month windows §2.17 states. */
export function academicTermNow(now: Date): { startYear: number; term: 1 | 2 } {
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  if (month >= TERM_MONTH) return { startYear: year, term: 1 };
  // January to May is the second term of the academic year that began last August. June and July
  // fall between the two windows and belong to the year that is ending, which is the second term.
  return { startYear: month <= 5 ? year - 1 : year - 1, term: 2 };
}

async function readMemberships(
  api: EnrollmentApiPort,
  courses: Map<string, DiscoveredCourse>,
  terms: Map<string, DiscoveredTerm>
): Promise<void> {
  let path: string | null = ENROLLMENT_PATHS.memberships;
  for (let page = 0; path && page < MAX_MEMBERSHIP_PAGES; page += 1) {
    const payload = await api.get(path);
    collectMemberships(payload, courses, terms);
    path = nextPage(payload);
  }
}

export async function readDiscovery(api: EnrollmentApiPort): Promise<Discovery> {
  const me = await api.get(ENROLLMENT_PATHS.me);
  const userId = isRecord(me) ? readString(me.id) : null;
  if (!userId) throw new EnrollmentUnavailable("The signed-in Blackboard user could not be read.");

  const courses = new Map<string, DiscoveredCourse>();
  const terms = new Map<string, DiscoveredTerm>();
  await readMemberships(api, courses, terms);
  return { terms: [...terms.values()], courses: [...courses.values()] };
}

/**
 * Which term is Current: the one `now` falls in, by the same month windows the date resolver uses.
 *
 * NTU Learn's term records carry no usable dates — the enrollment list returns them with
 * `durationType: CONTINUOUS` and null start and end — so "current" is derived from the calendar the
 * product already committed to rather than from the term's own fields. A Semester that does not
 * match still becomes Current when it is the only one there is, so a student enrolled in a single
 * past term sees that term rather than an empty dashboard.
 */
export function currentTermId(terms: readonly DiscoveredTerm[], now: Date): string | null {
  const wanted = academicTermNow(now);
  const match = terms.find((term) => {
    const named = semesterName(term.label);
    return named?.startYear === wanted.startYear && named.term === wanted.term;
  });
  return match?.nativeTermId ?? terms[0]?.nativeTermId ?? null;
}

/**
 * Writes a discovery into the store.
 *
 * A Course the native side no longer lists is marked rather than removed: dropping a Course on an
 * Add/Drop would take its Brief, its Review decisions and its Calendar with it, and the PRD treats
 * that data as the user's. Everything the product learned about a Course that is still listed is
 * preserved for the same reason — discovery owns identity and semester membership, never state.
 */
export async function applyDiscovery(
  store: EnrollmentStorePort,
  discovery: Discovery,
  now: Date
): Promise<AppliedDiscovery> {
  const stamp = now.toISOString();
  const current = currentTermId(discovery.terms, now);
  const knownSemesters = new Map(
    (await store.readSemesters()).map((semester) => [semester.nativeSemesterId, semester])
  );

  for (const term of discovery.terms) {
    const existing = knownSemesters.get(term.nativeTermId);
    const status = term.nativeTermId === current ? "Current" : "Historical";
    await store.saveSemester({
      semesterId: existing?.semesterId ?? term.nativeTermId,
      nativeSemesterId: term.nativeTermId,
      label: term.label,
      status,
      discoveredAt: existing?.discoveredAt ?? stamp,
      updatedAt: stamp
    });
    qaTrace("qa.semester-detected", {
      label: term.label,
      status,
      firstSeen: existing === undefined
    });
  }

  const termIds = new Set(discovery.terms.map((term) => term.nativeTermId));
  const semesterIdOf = new Map(
    discovery.terms.map((term) => [
      term.nativeTermId,
      knownSemesters.get(term.nativeTermId)?.semesterId ?? term.nativeTermId
    ])
  );
  const knownCourses = new Map(
    (await store.readCourses()).map((course) => [course.courseId, course])
  );
  const listed = new Set<string>();

  for (const discovered of discovery.courses) {
    if (!termIds.has(discovered.nativeTermId)) continue;
    listed.add(discovered.nativeCourseId);
    const existing = knownCourses.get(discovered.nativeCourseId);
    await store.upsertCourse({
      ...(existing ?? {
        established: false,
        currentRevision: 0,
        consecutiveCheckFailures: 0
      }),
      courseId: discovered.nativeCourseId,
      semesterId: semesterIdOf.get(discovered.nativeTermId) ?? discovered.nativeTermId,
      courseCode: discovered.courseCode,
      courseName: discovered.courseName,
      curriculum: true,
      // Add/Drop protection in reverse: a Course that comes back is no longer missing.
      ...(existing?.missingFromNative === true ? { missingFromNative: false } : {}),
      updatedAt: stamp
    });
    qaTrace("qa.course-detected", {
      courseCode: discovered.courseCode,
      semester: semesterIdOf.get(discovered.nativeTermId) ?? discovered.nativeTermId,
      firstSeen: existing === undefined,
      established: existing?.established ?? false
    });
  }

  for (const course of knownCourses.values()) {
    if (listed.has(course.courseId) || course.missingFromNative === true) continue;
    await store.upsertCourse({ ...course, missingFromNative: true, updatedAt: stamp });
  }

  return {
    semesters: discovery.terms.length,
    courses: listed.size,
    currentSemesterId: current
  };
}
