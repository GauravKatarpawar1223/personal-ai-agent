import { parseDateExpression, parseTimeExpression } from "@/lib/agent/dates";

export type ParsedCommand =
  | { intent: "calendar.search"; date: string; dateLabel: string }
  | {
      intent: "calendar.create";
      date: string;
      dateLabel: string;
      time: string;
      title: string;
    }
  | { intent: "calendar.update" | "calendar.delete"; date: string; dateLabel: string; raw: string }
  | {
      intent: "calendar.conditional_create";
      date: string;
      dateLabel: string;
      time: string;
      title: string;
    }
  | { intent: "calculator"; expression: string }
  | { intent: "date_time" }
  | { intent: "message.prepare"; recipient: string; body: string };

const CALENDAR_WORDS = /\b(calendar|meeting|schedule)\b/i;
const CREATE_WORDS = /\b(add|create|banao|schedule|book)\b/i;
const DELETE_WORDS = /\b(delete|cancel|hatao|remove)\b/i;
const UPDATE_WORDS = /\b(update|change|reschedule|move)\b/i;
const CONDITIONAL_WORDS = /\bagar\b.*\bfree\b|\bif\b.*\bfree\b/i;

/**
 * Turns free text into a structured command using pattern matching only.
 * Returns null when nothing recognizable was found — callers must show
 * an honest "couldn't understand" message rather than guessing.
 */
export function parseCommand(text: string, now: Date = new Date()): ParsedCommand | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const calculatorMatch = trimmed.match(
    /^(?:calculator|calculate|calc)?\s*([\d\s()+\-*/.]+)\s*=?\s*$/i
  );
  const calculatorExpr = calculatorMatch?.[1];
  if (calculatorExpr && /\d/.test(calculatorExpr) && /[+\-*/]/.test(calculatorExpr)) {
    return { intent: "calculator", expression: calculatorExpr.trim() };
  }

  if (/\b(what('s| is) the time|current time|abhi kya time hai|time kya hai|what time is it)\b/i.test(trimmed)) {
    return { intent: "date_time" };
  }
  if (/\b(what('s| is) (today'?s?|the) date|aaj ki date|date kya hai)\b/i.test(trimmed)) {
    return { intent: "date_time" };
  }

  const messageMatch = trimmed.match(
    /^(.+?)\s+ko\s+message\s+(?:bhejna hai|bhejo|karo|send karo)\s*(?:ki)?\s*(.+)$/i
  );
  if (messageMatch && messageMatch[1] !== undefined && messageMatch[2] !== undefined) {
    return {
      intent: "message.prepare",
      recipient: messageMatch[1].trim(),
      body: messageMatch[2].trim(),
    };
  }
  const messageMatchEn = trimmed.match(/^(?:send|message)\s+(.+?)\s+(?:a message\s+)?(?:that|saying)\s+(.+)$/i);
  if (messageMatchEn && messageMatchEn[1] !== undefined && messageMatchEn[2] !== undefined) {
    return {
      intent: "message.prepare",
      recipient: messageMatchEn[1].trim(),
      body: messageMatchEn[2].trim(),
    };
  }

  if (CALENDAR_WORDS.test(trimmed) || parseDateExpression(trimmed, now)) {
    const parsedDate = parseDateExpression(trimmed, now);
    if (!parsedDate) return null;

    const isConditional = CONDITIONAL_WORDS.test(trimmed);
    const isCreate = CREATE_WORDS.test(trimmed);
    const isDelete = DELETE_WORDS.test(trimmed);
    const isUpdate = !isDelete && UPDATE_WORDS.test(trimmed);

    if (isConditional) {
      const time = parseTimeExpression(trimmed);
      if (!time) return null;
      return {
        intent: "calendar.conditional_create",
        date: parsedDate.date,
        dateLabel: parsedDate.label,
        time: time.label,
        title: extractTitle(trimmed) ?? "Meeting",
      };
    }

    if (isCreate) {
      const time = parseTimeExpression(trimmed);
      if (!time) return null; // can't prepare an event without a time
      return {
        intent: "calendar.create",
        date: parsedDate.date,
        dateLabel: parsedDate.label,
        time: time.label,
        title: extractTitle(trimmed) ?? "Meeting",
      };
    }

    if (isDelete) {
      return { intent: "calendar.delete", date: parsedDate.date, dateLabel: parsedDate.label, raw: trimmed };
    }
    if (isUpdate) {
      return { intent: "calendar.update", date: parsedDate.date, dateLabel: parsedDate.label, raw: trimmed };
    }

    // Default: any recognized date + calendar-ish phrasing is a search
    // ("15 September ko kya hai?", "tomorrow calendar check karo", ...).
    return { intent: "calendar.search", date: parsedDate.date, dateLabel: parsedDate.label };
  }

  return null;
}

/** Best-effort event title from a create/conditional-create command —
 *  looks for a quoted phrase first, else the word right before a time
 *  expression tends to be the event name in these command shapes. */
function extractTitle(text: string): string | null {
  const quoted = text.match(/"([^"]+)"|'([^']+)'/);
  const quotedValue = quoted?.[1] ?? quoted?.[2];
  if (quotedValue) return quotedValue.trim();

  const meetingWord = text.match(/\b(meeting|appointment|call|event)\b/i);
  const word = meetingWord?.[1];
  if (word) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return null;
}
