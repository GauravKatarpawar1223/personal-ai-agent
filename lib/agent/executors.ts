import { evaluateExpression } from "@/lib/agent/calculator";
import { googleConnector } from "@/lib/connectors/google";

export interface ExecutionResult {
  status: "completed" | "failed";
  message: string;
  toolName: string;
}

/**
 * calendar.search — READ, runs automatically. Google Calendar has no
 * real OAuth/API wiring yet (see lib/connectors/google — implemented:
 * false), so this honestly reports that instead of fabricating events.
 * If/when that connector is finished, this is the one place that needs
 * to change: branch on googleConnector.implemented and call the real
 * API instead of returning the "connection required" message.
 */
export function executeCalendarSearch(dateLabel: string): ExecutionResult {
  if (!googleConnector.implemented) {
    return {
      status: "failed",
      message: `Google Calendar connection required to check ${dateLabel}. Connect it from the Connections page.`,
      toolName: "Google Calendar",
    };
  }
  // Unreachable until the connector above is actually implemented.
  return { status: "failed", message: "Google Calendar isn't returning data right now.", toolName: "Google Calendar" };
}

/** calendar.create / calendar.update / calendar.delete — EXECUTE, only
 *  called after the user approves via ConfirmationCard. Same honesty
 *  rule: never claims to have created/changed/deleted a real event
 *  while no calendar connector exists. */
export function executeCalendarWrite(
  action: "create" | "update" | "delete",
  summary: string
): ExecutionResult {
  if (!googleConnector.implemented) {
    return {
      status: "failed",
      message: `Google Calendar connection required — I can't ${action} "${summary}" until it's connected.`,
      toolName: "Google Calendar",
    };
  }
  return { status: "failed", message: "Google Calendar isn't available right now.", toolName: "Google Calendar" };
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
