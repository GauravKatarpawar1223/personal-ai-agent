import { evaluateExpression } from "@/lib/agent/calculator";
import {
  searchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/connectors/google/calendar";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ExecutionResult {
  status: "completed" | "failed";
  message: string;
  toolName: string;
}

/**
 * calendar.search — READ, runs automatically. Delegates to the real
 * Google Calendar API (lib/connectors/google/calendar.ts) once the
 * user has connected it; that module itself returns the honest
 * "Google Calendar connection required" message when they haven't, so
 * this never fabricates events either way.
 */
export async function executeCalendarSearch(
  supabase: SupabaseServerClient,
  userId: string,
  dateIso: string,
  dateLabel: string
): Promise<ExecutionResult> {
  const result = await searchCalendarEvents(supabase, userId, dateIso, dateLabel);
  return { status: result.status, message: result.message, toolName: "Google Calendar" };
}

/** calendar.create / calendar.update / calendar.delete — EXECUTE, only
 *  called after the user approves via ConfirmationCard. Same honesty
 *  rule as calendar.search: delegates to the real API, never claims
 *  success unless Google Calendar actually reports it. */
export async function executeCalendarWrite(
  supabase: SupabaseServerClient,
  userId: string,
  action: "create" | "update" | "delete",
  params:
    | { action: "create"; dateIso: string; dateLabel: string; hours: number; minutes: number; title: string; timeLabel: string }
    | { action: "update" | "delete"; dateIso: string; dateLabel: string; raw: string }
): Promise<ExecutionResult> {
  if (params.action === "create") {
    const result = await createCalendarEvent(supabase, userId, {
      dateIso: params.dateIso,
      hours: params.hours,
      minutes: params.minutes,
      title: params.title,
      dateLabel: params.dateLabel,
      timeLabel: params.timeLabel,
    });
    return { status: result.status, message: result.message, toolName: "Google Calendar" };
  }

  const fn = action === "update" ? updateCalendarEvent : deleteCalendarEvent;
  const result = await fn(supabase, userId, { dateIso: params.dateIso, dateLabel: params.dateLabel, raw: params.raw });
  return { status: result.status, message: result.message, toolName: "Google Calendar" };
}

/** calculator — READ, runs automatically. Real arithmetic, no fake
 *  results — evaluateExpression() throws on anything it can't parse. */
export function executeCalculator(expression: string): ExecutionResult {
  try {
    const result = evaluateExpression(expression);
    return { status: "completed", message: `${expression.trim()} = ${result}`, toolName: "Calculator" };
  } catch (err) {
    return {
      status: "failed",
      message: err instanceof Error ? err.message : "I couldn't calculate that.",
      toolName: "Calculator",
    };
  }
}

/** date_time — READ, runs automatically. Server clock — there's no
 *  reliable way to know the user's local timezone from a request alone,
 *  so the reply says so rather than silently assuming one. */
export function executeDateTime(): ExecutionResult {
  const now = new Date();
  const formatted = now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return { status: "completed", message: `Server time is ${formatted}.`, toolName: "Date & Time" };
}

/** message.send — EXECUTE, only called after approval. No messaging
 *  connector (WhatsApp/Telegram) exists yet, so this always reports
 *  that honestly instead of claiming a message went out. */
export function executeMessageSend(recipient: string): ExecutionResult {
  return {
    status: "failed",
    message: `Messaging connection required — I can't actually send this to ${recipient} yet. Connect a messaging provider from the Connections page.`,
    toolName: "Messaging",
  };
}
