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

export interface ParsedDate {
  /** YYYY-MM-DD */
  date: string;
  /** Human-readable label for messages, e.g. "15 September 2026" */
  label: string;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function safeParseInt(value: string | undefined, fallback = 0): number {
  if (value === undefined) return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Finds the first recognizable date expression in free text and
 * resolves it against `now`. Returns null if nothing matched.
 */
export function parseDateExpression(text: string, now: Date): ParsedDate | null {
  const lower = text.toLowerCase();

  // Relative keywords — checked as whole words so "today" doesn't match
  // inside an unrelated word.
  if (/\b(today|aaj)\b/.test(lower)) {
    return { date: toIso(now), label: toLabel(now) };
  }
  if (/\b(tomorrow|kal)\b/.test(lower)) {
    const d = addDays(now, 1);
    return { date: toIso(d), label: toLabel(d) };
  }
  if (/\byesterday\b/.test(lower)) {
    const d = addDays(now, -1);
    return { date: toIso(d), label: toLabel(d) };
  }
  if (/\bparso\b/.test(lower)) {
    const d = addDays(now, 2);
    return { date: toIso(d), label: toLabel(d) };
  }
  if (/\bnext week\b/.test(lower)) {
    const d = addDays(now, 7);
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
      const current = now.getDay();
      let delta = (target - current + 7) % 7;
      if (delta === 0 || weekdayMatch[1]) delta = delta === 0 ? 7 : delta;
      const d = addDays(now, delta);
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
    const resolvedYear = year ?? now.getFullYear();
    let candidate = new Date(resolvedYear, month, day);
    // No year given and the date already passed this year — assume next year.
    if (!year) {
      const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (candidate < todayAtMidnight) {
        candidate = new Date(resolvedYear + 1, month, day);
      }
    }
    if (candidate.getMonth() === month) {
      // guards against invalid dates like 31 February silently rolling over
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
