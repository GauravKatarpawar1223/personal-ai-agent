/**
 * Personal AI Agent — deterministic device planner.
 * Keeps Google Search working and supports direct-app launch with
 * a Chrome fallback for missing apps and unlisted app/service names.
 */

export type DeviceStepType =
  | "launch_app"
  | "launch_app_or_url"
  | "wait_for_element"
  | "tap_element"
  | "wait_for_search_input"
  | "focus_search_input"
  | "type_text"
  | "submit"
  | "verify_contains"
  | "press_back";

export interface DeviceStep {
  type: DeviceStepType;
  text?: string;
  packageName?: string;
  timeoutMs?: number;
}

export interface DevicePlan {
  intent: string;
  targetPackage: string;
  steps: DeviceStep[];
  summary: string;
}

const GOOGLE_SEARCH_PATTERN =
  /google\s+(?:par|pe|per)\s+(.+?)(?:\s+ke\s+baare\s+mein)?\s+search\s+kar(?:o|na|en)?\.?\s*$/i;

const APP_ALIASES: Array<{
  pattern: RegExp;
  appName: string;
  packageName: string;
  url: string;
}> = [
  {
    pattern: /^(youtube|you tube)$/i,
    appName: "YouTube",
    packageName: "com.google.android.youtube",
    url: "https://m.youtube.com/",
  },
  {
    pattern: /^(whatsapp|what'?s\s*app)$/i,
    appName: "WhatsApp",
    packageName: "com.whatsapp",
    url: "https://web.whatsapp.com/",
  },
  {
    pattern: /^(instagram|insta)$/i,
    appName: "Instagram",
    packageName: "com.instagram.android",
    url: "https://www.instagram.com/",
  },
  {
    pattern: /^(settings|setting)$/i,
    appName: "Settings",
    packageName: "com.android.settings",
    url: "https://www.google.com/search?q=Android+Settings",
  },
  {
    pattern: /^(calculator|calc)$/i,
    appName: "Calculator",
    packageName: "com.google.android.calculator",
    url: "https://www.google.com/search?q=online+calculator",
  },
  {
    pattern: /^(gmail|google mail)$/i,
    appName: "Gmail",
    packageName: "com.google.android.gm",
    url: "https://mail.google.com/",
  },
  {
    pattern: /^(google\s+maps|maps)$/i,
    appName: "Google Maps",
    packageName: "com.google.android.apps.maps",
    url: "https://maps.google.com/",
  },
  {
    pattern: /^(chrome|google chrome)$/i,
    appName: "Chrome",
    packageName: "com.android.chrome",
    url: "https://www.google.com/",
  },
];

const OPEN_COMMAND =
  /^(?:(?:please|bhai)\s+)?(?:(?:open|launch|start|khol|kholo|kholna|chalao)\s+(.+?)|(.+?)\s+(?:open\s+kar(?:o)?|khol(?:o|na)?|chalao|start\s+kar(?:o)?))\s*[.!]?$/i;

function makeSearchPlan(query: string): DevicePlan {
  return {
    intent: "device.chrome_google_search",
    targetPackage: "com.android.chrome",
    steps: [
      { type: "launch_app", packageName: "com.android.chrome" },
      { type: "wait_for_search_input", timeoutMs: 6000 },
      { type: "focus_search_input" },
      { type: "type_text", text: query },
      { type: "submit" },
      { type: "verify_contains", text: query, timeoutMs: 5000 },
    ],
    summary: `Search Google for "${query}" in Chrome`,
  };
}

export function parseDeviceCommand(text: string): DevicePlan | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const searchMatch = trimmed.match(GOOGLE_SEARCH_PATTERN);
  const query = searchMatch?.[1]?.trim();
  if (query) return makeSearchPlan(query);

  const openMatch = trimmed.match(OPEN_COMMAND);
  const requested = (openMatch?.[1] ?? openMatch?.[2] ?? "")
    .trim()
    .replace(/[.!?]+$/, "")
    .trim();

  if (!requested || requested.length > 80) return null;

  const alias = APP_ALIASES.find((app) => app.pattern.test(requested));
  const appName = alias?.appName ?? requested;

  // Known apps launch directly when installed. If not installed,
  // Android opens the fallback URL in Chrome.
  // Unknown names go to a Google search in Chrome instead of guessing
  // a package name or claiming that an app was opened.
  const fallbackUrl = alias?.url ??
    `https://www.google.com/search?q=${encodeURIComponent(appName)}`;

  return {
    intent: alias
      ? `device.open_app.${appName.toLowerCase().replace(/\s+/g, "_")}`
      : "device.search_for_app_or_service",
    targetPackage: alias?.packageName ?? "com.android.chrome",
    steps: [
      {
        type: "launch_app_or_url",
        packageName: alias?.packageName,
        text: fallbackUrl,
      },
    ],
    summary: alias
      ? `Open ${appName}; use Chrome if it isn't installed`
      : `Search Chrome for "${appName}"`,
  };
}
