/**
 * V0 device planner. Deliberately tiny and deliberately NOT a general
 * planner — this is the "smallest safe V0" the product spec asked for,
 * not a duplicate of the web app's agent brain. It recognizes exactly
 * one intent (open Chrome, search Google) and returns a fixed sequence
 * of generic device primitives for the Android AccessibilityService to
 * execute. Anything it doesn't recognize returns null — the Android app
 * must report that honestly, never guess a plan.
 */

export type DeviceStepType =
  | "launch_app"
  | "wait_for_element"
  | "tap_element"
  | "type_text"
  | "submit"
  | "verify_contains"
  | "press_back";

export interface DeviceStep {
  type: DeviceStepType;
  /** Text to search for (wait_for_element/tap_element/verify_contains)
   *  or to type (type_text). */
  text?: string;
  packageName?: string;
  timeoutMs?: number;
}

export interface DevicePlan {
  intent: string;
  targetPackage: string;
  steps: DeviceStep[];
  /** Human-readable summary, shown to the user before/while executing
   *  and used as the activity-log action text. */
  summary: string;
}

// Matches: "Chrome kholo aur Google par AI agent search karo",
// "Google pe AI agents ke baare mein search kar", etc. — "par"/"pe"/"per"
// are the Hinglish variants of "on", "ke baare mein" is optional ("about").
const GOOGLE_SEARCH_PATTERN =
  /google\s+(?:par|pe|per)\s+(.+?)(?:\s+ke\s+baare\s+mein)?\s+search\s+kar[oe]?\.?\s*$/i;

export function parseDeviceCommand(text: string): DevicePlan | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const match = trimmed.match(GOOGLE_SEARCH_PATTERN);
  const query = match?.[1]?.trim();
  if (!query) return null;

  return {
    intent: "device.chrome_google_search",
    targetPackage: "com.android.chrome",
    steps: [
      { type: "launch_app", packageName: "com.android.chrome" },
      { type: "wait_for_element", text: "Search", timeoutMs: 6000 },
      { type: "tap_element", text: "Search" },
      { type: "type_text", text: query },
      { type: "submit" },
      // Best-effort verification, not a guarantee: Google's results page
      // echoes the query back, so finding it on screen after submit is
      // reasonable (not perfect) evidence the search actually happened.
      { type: "verify_contains", text: query, timeoutMs: 5000 },
    ],
    summary: `Search Google for "${query}" in Chrome`,
  };
}
