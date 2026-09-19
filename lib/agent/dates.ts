/**
 * Deterministic date parsing — Phase 3's whole point is that none of
 * this depends on an LLM. Supports the patterns the Phase 3 spec lists:
 * today/tomorrow/yesterday, a handful of common Hindi/Hinglish
 * equivalents, weekday names, "next week", and "15 September" /
 * "September 15" style dates (English month names, optional year).
 *
 * Deliberately does NOT try to be a full natural-language date parser —
 * anything it can't confidently resolve returns null so the caller can
 * give an honest "couldn't understand" response instead of guessing.
 */

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface ParsedDate {
  /** YYYY-MM-DD */
  date: string;
  /** Human-readable label for messages, e.g. "15 September 2026" */
  label: string;
}

/**
 * India (IST, UTC+5:30, no DST) is this app's calendar timezone — see
 * lib/connectors/google/calendar.ts, which uses the same offset for
 * event creation and day boundaries. Every "today"/"tomorrow"/weekday
 * calculation below is done in IST explicitly, never via the server's
 * local Date methods (getFullYear/getMonth/getDate/getDay/setDate),
 * because those depend on whatever timezone the Node process happens
 * to be configured with (UTC on Vercel) — not the user's. All of the
 * arithmetic here instead goes through Date.UTC()/getUTC*(), which are
 * always timezone-independent, applied to a timestamp already shifted
 * by the IST offset. This works correctly no matter what timezone the
 * server process itself is running in.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

interface DateParts {
  year: number;
  /** 0-indexed, matches Date's convention. */
  month: number;
  day: number;
}

/** The current IST calendar date/weekday for a given instant. */
function istPartsNow(now: Date): DateParts & { weekday: number } {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

function addIstDays(parts: DateParts, days: number): DateParts {
  // Pure UTC arithmetic — Date.UTC/getUTC* never touch the server's
  // configured timezone, so this is safe regardless of where it runs.
  const ms = Date.UTC(parts.year, parts.month, parts.day) + days * 86_400_000;
  const shifted = new Date(ms);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

function toIso(parts: DateParts): string {
  return `${parts.year}-${String(parts.month + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function toLabel(parts: DateParts): string {
  return `${parts.day} ${MONTH_NAMES[parts.month]} ${parts.year}`;
}

function safeParseInt(value: string | undefined, fallback = 0): number {
  if (value === undefined) return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Finds the first recognizable date expression in free text and
 * resolves it against `now` (interpreted in IST — see istPartsNow).
 * Returns null if nothing matched.
 */
export function parseDateExpression(text: string, now: Date): ParsedDate | null {
  const lower = text.toLowerCase();
  const nowParts = istPartsNow(now);

  // Relative keywords — checked as whole words so "today" doesn't match
  // inside an unrelated word.
  if (/\b(today|aaj)\b/.test(lower)) {
    return { date: toIso(nowParts), label: toLabel(nowParts) };
  }
  if (/\b(tomorrow|kal)\b/.test(lower)) {
    const d = addIstDays(nowParts, 1);
    return { date: toIso(d), label: toLabel(d) };
  }
  if (/\byesterday\b/.test(lower)) {
    const d = addIstDays(nowParts, -1);
    return { date: toIso(d), label: toLabel(d) };
  }
  if (/\bparso\b/.test(lower)) {
    const d = addIstDays(nowParts, 2);
    return { date: toIso(d), label: toLabel(d) };
  }
  if (/\bnext week\b/.test(lower)) {
    const d = addIstDays(nowParts, 7);
    return { date: toIso(d), label: toLabel(d) };
  }

  // Weekday names ("monday", "next friday") — resolves to the next
  // upcoming occurrence of that weekday, today included only if the
  // text says "this".
  const weekdayMatch = lower.match(
    /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thurs|fri|sat)\b/
  );
  const weekdayName = weekdayMatch?.[2];
  if (weekdayMatch && weekdayName !== undefined) {
    const target = WEEKDAYS[weekdayName];
    if (target !== undefined) {
      const current = nowParts.weekday;
      let delta = (target - current + 7) % 7;
      if (delta === 0 || weekdayMatch[1]) delta = delta === 0 ? 7 : delta;
      const d = addIstDays(nowParts, delta);
      return { date: toIso(d), label: toLabel(d) };
    }
  }

  // "15 September" or "September 15", optional 4-digit year.
  const monthNames = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})\\b(?:\\s+(\\d{4}))?`, "i");
  const monthFirst = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`, "i");

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  const m1 = lower.match(dayFirst);
  if (m1) {
    const monthKey = m1[2];
    day = safeParseInt(m1[1], NaN);
    month = monthKey !== undefined ? MONTHS[monthKey] ?? null : null;
    year = m1[3] ? safeParseInt(m1[3]) : null;
  } else {
    const m2 = lower.match(monthFirst);
    if (m2) {
      const monthKey = m2[1];
      month = monthKey !== undefined ? MONTHS[monthKey] ?? null : null;
      day = safeParseInt(m2[2], NaN);
      year = m2[3] ? safeParseInt(m2[3]) : null;
    }
  }

  if (day !== null && !Number.isNaN(day) && month !== null && day >= 1 && day <= 31) {
    const resolvedYear = year ?? nowParts.year;
    let candidate: DateParts = { year: resolvedYear, month, day };
    // No year given and the date already passed this year (compared in
    // IST, using plain numeric comparison — no Date object involved) —
    // assume next year.
    if (!year) {
      const candidateMs = Date.UTC(candidate.year, candidate.month, candidate.day);
      const todayMs = Date.UTC(nowParts.year, nowParts.month, nowParts.day);
      if (candidateMs < todayMs) {
        candidate = { year: resolvedYear + 1, month, day };
      }
    }
    // Guard against invalid dates like 31 February silently rolling
    // over into March — Date.UTC() normalizes overflow, so re-check.
    const normalized = new Date(Date.UTC(candidate.year, candidate.month, candidate.day));
    if (normalized.getUTCMonth() === month) {
      return { date: toIso(candidate), label: toLabel(candidate) };
    }
  }

  return null;
}

/** Extracts a time like "5 baje", "5pm", "5:30 PM", "17:00" from text.
 *  Returns 24-hour hours/minutes, or null if nothing matched. */
export function parseTimeExpression(text: string): { hours: number; minutes: number; label: string } | null {
  const lower = text.toLowerCase();

  // "5:30 pm", "5 pm", "17:00"
  const withMeridiem = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (withMeridiem) {
    let h = safeParseInt(withMeridiem[1]);
    const min = safeParseInt(withMeridiem[2]);
    const meridiem = withMeridiem[3];
    if (h === 12) h = 0;
    if (meridiem === "pm") h += 12;
    return { hours: h, minutes: min, label: formatTime(h, min) };
  }

  // "5 baje" (Hindi "o'clock") — assumed PM for typical daytime scheduling
  // (5) unless the hour is already 13-23.
  const baje = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*baje\b/);
  if (baje) {
    let h = safeParseInt(baje[1]);
    const min = safeParseInt(baje[2]);
    if (h >= 1 && h <= 7) h += 12; // 1-7 "baje" defaults to afternoon/evening
    return { hours: h, minutes: min, label: formatTime(h, min) };
  }

  // Bare 24-hour "17:00"
  const bare24 = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (bare24) {
    const h = safeParseInt(bare24[1]);
    const min = safeParseInt(bare24[2]);
    return { hours: h, minutes: min, label: formatTime(h, min) };
  }

  return null;
}

function formatTime(hours: number, minutes: number): string {
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
      }
