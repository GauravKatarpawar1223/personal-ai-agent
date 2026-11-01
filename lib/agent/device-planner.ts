/**
 * Personal AI Agent — deterministic device planner.
 * Preserves Google Search and known app launching.
 * Adds dynamic installed-app lookup by visible app label.
 */

export type DeviceStepType =
  | "launch_app"
  | "launch_app_or_url"
  | "launch_app_by_label"
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
      {
        type: "launch_app",
        packageName: "com.android.chrome",
      },
      {
        type: "wait_for_search_input",
        timeoutMs: 6000,
      },
      {
        type: "focus_search_input",
      },
      {
        type: "type_text",
        text: query,
      },
      {
        type: "submit",
      },
      {
        type: "verify_contains",
        text: query,
        timeoutMs: 5000,
      },
    ],
    summary: `Search Google for "${query}" in Chrome`,
  };
}

export function parseDeviceCommand(
  text: string
): DevicePlan | null {
  const trimmed = text.trim();

  if (!trimmed) return null;

  // Keep the existing Google Search command working.
  const searchMatch = trimmed.match(GOOGLE_SEARCH_PATTERN);
  const query = searchMatch?.[1]?.trim();

  if (query) {
    return makeSearchPlan(query);
  }

  // Detect app-opening commands.
  const openMatch = trimmed.match(OPEN_COMMAND);

  const requested = (
    openMatch?.[1] ?? openMatch?.[2] ?? ""
  )
    .trim()
    .replace(/[.!?]+$/, "")
    .trim();

  if (!requested || requested.length > 80) {
    return null;
  }

  // Preserve the existing known-app behaviour.
  const alias = APP_ALIASES.find((app) =>
    app.pattern.test(requested)
  );

  if (alias) {
    return {
      intent: `device.open_app.${alias.appName
        .toLowerCase()
        .replace(/\s+/g, "_")}`,
      targetPackage: alias.packageName,
      steps: [
        {
          type: "launch_app_or_url",
          packageName: alias.packageName,
          text: alias.url,
        },
      ],
      summary:
        `Open ${alias.appName}; use browser fallback if unavailable`,
    };
  }

  // Unknown app names are searched among installed launcher apps
  // by Android, instead of guessing a package name.
  return {
    intent: "device.dynamic_app_lookup",
    targetPackage: "com.android.chrome",
    steps: [
      {
        type: "launch_app_by_label",
        text: requested,
      },
    ],
    summary: `Find and open installed app "${requested}"`,
  };
}
