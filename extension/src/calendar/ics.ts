import type { CalendarEvent } from "./domain";

const utf8Encoder = new TextEncoder();

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function foldLine(line: string): string {
  const lines: string[] = [];
  let current = "";
  let bytes = 0;
  for (const character of line) {
    const size = utf8Encoder.encode(character).length;
    if (bytes + size > 75) {
      lines.push(current);
      current = ` ${character}`;
      bytes = 1 + size;
    } else {
      current += character;
      bytes += size;
    }
  }
  lines.push(current);
  return lines.join("\r\n");
}

function compactDate(date: string): string {
  return date.replaceAll("-", "");
}

function nextDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10).replaceAll("-", "");
}

function compactTime(time: string): string {
  const parts = time.split(":").map((part) => part.padStart(2, "0"));
  const hh = parts[0] ?? "00";
  const mm = parts[1] ?? "00";
  const ss = parts[2] ?? "00";
  return `${hh}${mm}${ss}`;
}

const SINGAPORE_VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Singapore",
  "BEGIN:STANDARD",
  "DTSTART:19820101T000000",
  "TZOFFSETFROM:+0800",
  "TZOFFSETTO:+0800",
  "TZNAME:SGT",
  "END:STANDARD",
  "END:VTIMEZONE"
];

export function serializeCalendar(
  courseId: string,
  events: readonly CalendarEvent[],
  generatedAt = new Date()
): string {
  const timestamp = generatedAt
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Syllab//NTU Learn//EN",
    "CALSCALE:GREGORIAN"
  ];
  if (events.some((event) => Boolean(event.time))) {
    lines.push(...SINGAPORE_VTIMEZONE);
  }
  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${stableHash(`${courseId}|${event.eventId}`)}@syllab.local`);
    lines.push(`DTSTAMP:${timestamp}`);
    if (event.time) {
      lines.push(
        `DTSTART;TZID=Asia/Singapore:${compactDate(event.date)}T${compactTime(event.time)}`
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`);
      lines.push(`DTEND;VALUE=DATE:${nextDate(event.date)}`);
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
