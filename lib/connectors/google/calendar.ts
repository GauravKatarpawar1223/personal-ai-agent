import { google, calendar_v3 } from "googleapis";
import type { createClient } from "@/lib/supabase/server";
import { createGoogleOAuthClient } from "@/lib/connectors/google/oauth-client";
import { getGoogleCredentials, saveGoogleCredentials } from "@/lib/data/google-credentials";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface CalendarResult {
  /** False means "no Google Calendar connection" — always shown as the
   *  existing honest "connection required" message, never fabricated. */
  connected: boolean;
  status: "completed" | "failed";
  message: string;
}

/**
 * Builds an authorized Calendar client for this user, or null if they
 * haven't connected Google Calendar. Registers a listener so that if
 * googleapis silently refreshes the access token mid-request, the new
 * token is persisted immediately — otherwise the next request would
 * fail once the short-lived access token expires.
 */
async function getAuthorizedCalendarClient(
  supabase: SupabaseServerClient,
  userId: string
): Promise<calendar_v3.Calendar | null> {
  const stored = await getGoogleCredentials(supabase, userId);
  if (!stored) return null;

  let oauthClient;
  try {
    oauthClient = createGoogleOAuthClient();
  } catch {
    // GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI missing on the server even
    // though a connection row exists — treat as not connected.
    return null;
  }

  oauthClient.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    expiry_date: stored.expiresAt,
  });

  oauthClient.on("tokens", (tokens) => {
    if (!tokens.access_token) return;
    void saveGoogleCredentials(supabase, userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? stored.refreshToken,
      expiresAt: tokens.expiry_date ?? Date.now() + 3600_000,
      scopes: stored.scopes,
    }).catch((err) => console.error("Failed to persist refreshed Google token:", err.message));
  });

  return google.calendar({ version: "v3", auth: oauthClient });
}

export async function checkAvailability(
  supabase: SupabaseServerClient,
  userId: string,
  dateIso: string,
  hours: number,
  minutes: number,
  dateLabel: string
): Promise<{ connected: boolean; free: boolean | null; message?: string; conflictSummary?: string }> {
  const client = await getAuthorizedCalendarClient(supabase, userId);
  if (!client) return { connected: false, free: null };

  try {
    const { timeMin, timeMax } = dayBounds(dateIso);
    const { data } = await client.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });
    const target = istInstant(dateIso, hours, minutes);

    const conflict = (data.items ?? []).find((e) => {
      const startRaw = e.start?.dateTime ?? e.start?.date;
      const endRaw = e.end?.dateTime ?? e.end?.date;
      if (!startRaw || !endRaw) return false;
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      return target >= start && target < end;
    });

    if (conflict) {
      return { connected: true, free: false, conflictSummary: conflict.summary ?? "(untitled event)" };
    }
    return { connected: true, free: true };
  } catch (err) {
    return {
      connected: true,
      free: null,
      message: `Google Calendar returned an error while checking ${dateLabel}: ${errorMessage(err)}`,
    };
  }
}

/**
 * India (IST, UTC+5:30) is this app's calendar timezone — see
 * lib/agent/dates.ts for the matching rationale. Every function below
 * that builds a specific instant (day boundaries, event start/end)
 * does so via an explicit "+05:30" ISO offset, which the Date
 * constructor parses into the correct UTC instant regardless of what
 * timezone the server process itself is configured with. None of this
 * relies on new Date(...).setHours()/.getHours() or any other
 * server-local Date method — those would silently use whatever
 * timezone Node is running in (UTC on Vercel), not IST.
 */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function istInstant(dateIso: string, hours: number, minutes: number): Date {
  return new Date(`${dateIso}T${pad2(hours)}:${pad2(minutes)}:00+05:30`);
}

function dayBounds(dateIso: string): { timeMin: string; timeMax: string } {
  const start = istInstant(dateIso, 0, 0);
  const end = istInstant(dateIso, 23, 59);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

export async function searchCalendarEvents(
  supabase: SupabaseServerClient,
  userId: string,
  dateIso: string,
  dateLabel: string
): Promise<CalendarResult> {
  const client = await getAuthorizedCalendarClient(supabase, userId);
  if (!client) {
    return {
      connected: false,
      status: "failed",
      message: `Google Calendar connection required to check ${dateLabel}. Connect it from the Connections page.`,
    };
  }

  try {
    const { timeMin, timeMax } = dayBounds(dateIso);
    const { data } = await client.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });
    const events = data.items ?? [];
    if (events.length === 0) {
      return { connected: true, status: "completed", message: `${dateLabel}: nothing on your calendar.` };
    }
    const lines = events.map((e) => `• ${formatEventTime(e)} — ${e.summary ?? "(untitled)"}`);
    return { connected: true, status: "completed", message: `${dateLabel}:\n${lines.join("\n")}` };
  } catch (err) {
    return {
      connected: true,
      status: "failed",
      message: `Google Calendar returned an error while checking ${dateLabel}: ${errorMessage(err)}`,
    };
  }
}

export async function createCalendarEvent(
  supabase: SupabaseServerClient,
  userId: string,
  params: { dateIso: string; hours: number; minutes: number; title: string; dateLabel: string; timeLabel: string }
): Promise<CalendarResult> {
  const client = await getAuthorizedCalendarClient(supabase, userId);
  if (!client) {
    return {
      connected: false,
      status: "failed",
      message: `Google Calendar connection required — I can't add "${params.title}" until it's connected.`,
    };
  }

  const start = istInstant(params.dateIso, params.hours, params.minutes);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1-hour default duration

  try {
    const { data } = await client.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: params.title,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });
    return {
      connected: true,
      status: "completed",
      message: `Created "${params.title}" on ${params.dateLabel} at ${params.timeLabel}.${data.htmlLink ? ` (${data.htmlLink})` : ""}`,
    };
  } catch (err) {
    return {
      connected: true,
      status: "failed",
      message: `Google Calendar couldn't create "${params.title}": ${errorMessage(err)}`,
    };
  }
}

/** Finds events on the given date matching (loosely) the free-text
 *  request, and deletes it only if exactly one match is found — never
 *  guesses between multiple candidates. */
export async function deleteCalendarEvent(
  supabase: SupabaseServerClient,
  userId: string,
  params: { dateIso: string; dateLabel: string; raw: string }
): Promise<CalendarResult> {
  const client = await getAuthorizedCalendarClient(supabase, userId);
  if (!client) {
    return {
      connected: false,
      status: "failed",
      message: `Google Calendar connection required — I can't delete anything on ${params.dateLabel} until it's connected.`,
    };
  }

  try {
    const { timeMin, timeMax } = dayBounds(params.dateIso);
    const { data } = await client.events.list({ calendarId: "primary", timeMin, timeMax, singleEvents: true });
    const events = data.items ?? [];
    if (events.length === 0) {
      return { connected: true, status: "failed", message: `No event found on ${params.dateLabel} to delete.` };
    }
    if (events.length > 1) {
      const names = events.map((e) => e.summary ?? "(untitled)").join(", ");
      return {
        connected: true,
        status: "failed",
        message: `Found ${events.length} events on ${params.dateLabel} (${names}) — tell me which one by name.`,
      };
    }
    const target = events[0];
    if (!target?.id) {
      return { connected: true, status: "failed", message: "Couldn't identify that event's ID." };
    }
    await client.events.delete({ calendarId: "primary", eventId: target.id });
    return { connected: true, status: "completed", message: `Deleted "${target.summary ?? "(untitled)"}" on ${params.dateLabel}.` };
  } catch (err) {
    return {
      connected: true,
      status: "failed",
      message: `Google Calendar couldn't delete that event: ${errorMessage(err)}`,
    };
  }
}

/** Phase 3's parser only extracts a raw request string for updates, not
 *  a specific new time/title — so this identifies the event honestly
 *  rather than guessing what to change it to. */
export async function updateCalendarEvent(
  supabase: SupabaseServerClient,
  userId: string,
  params: { dateIso: string; dateLabel: string; raw: string }
): Promise<CalendarResult> {
  const client = await getAuthorizedCalendarClient(supabase, userId);
  if (!client) {
    return {
      connected: false,
      status: "failed",
      message: `Google Calendar connection required — I can't update anything on ${params.dateLabel} until it's connected.`,
    };
  }

  try {
    const { timeMin, timeMax } = dayBounds(params.dateIso);
    const { data } = await client.events.list({ calendarId: "primary", timeMin, timeMax, singleEvents: true });
    const events = data.items ?? [];
    if (events.length === 0) {
      return { connected: true, status: "failed", message: `No event found on ${params.dateLabel} to update.` };
    }
    if (events.length > 1) {
      const names = events.map((e) => e.summary ?? "(untitled)").join(", ");
      return {
        connected: true,
        status: "failed",
        message: `Found ${events.length} events on ${params.dateLabel} (${names}) — tell me which one, and what to change.`,
      };
    }
    return {
      connected: true,
      status: "failed",
      message: `I found "${events[0]?.summary ?? "(untitled)"}" on ${params.dateLabel}, but I can't tell what to change it to yet — try something specific, e.g. "change the meeting on ${params.dateLabel} to 6pm".`,
    };
  } catch (err) {
    return {
      connected: true,
      status: "failed",
      message: `Google Calendar couldn't look up that event: ${errorMessage(err)}`,
    };
  }
}

function formatEventTime(event: calendar_v3.Schema$Event): string {
  const start = event.start?.dateTime ?? event.start?.date;
  if (!start) return "All day";
  if (event.start?.date && !event.start?.dateTime) return "All day";
  const d = new Date(start);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message ?? "unknown error");
  }
  return "unknown error";
}
