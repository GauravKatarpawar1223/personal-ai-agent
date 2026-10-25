/**
 * Personal AI Agent — deterministic device planner.
 * Preserve Google Search and support opening common Android apps.
 * Unsupported commands return null instead of guessing.
 */

export type DeviceStepType =
  | "launch_app"
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
  /google\s+(?:par|pe|per)\s+(.+?)(?:\s+ke\s+baare\s+mein)?\s+search\s+kar[oe]?\.?\s*$/i;

const APP_ALIASES: Array<{
  pattern: RegExp;
  appName: string;
  packageName: string;
}> = [
  {
    pattern: /youtube/i,
    appName: "YouTube",
    packageName: "com.google.android.youtube",
  },
  {
    pattern: /whatsapp|what'?s\s*app/i,
    appName: "WhatsApp",
    packageName: "com.whatsapp",
  },
  {
    pattern: /settings|setting|सेटिंग्स?/i,
    appName: "Settings",
    packageName: "com.android.settings",
  },
  {
    pattern: /calculator|कैलकुलेटर/i,
    appName: "Calculator",
    packageName: "com.google.android.calculator",
  },
  {
    pattern: /gmail|जीमेल/i,
    appName: "Gmail",
    packageName: "com.google.android.gm",
  },
  {
    pattern: /google\s+maps|maps|मैप्स/i,
    appName: "Google Maps",
    packageName: "com.google.android.apps.maps",
  },
  {
    pattern: /chrome|क्रोम/i,
    appName: "Chrome",
    packageName: "com.android.chrome",
  },
];

const OPEN_APP_COMMAND_PATTERN =
  /^(?:(?:please|bhai)\s+)?(?:(?:open|launch|start|khol|kholo|kholna|chalao|chalu\s+kar(?:o)?)\s+(.+?)|(.+?)\s+(?:open\s+kar(?:o)?|khol(?:o)?|chalao|start\s+kar(?:o)?))\s*[.!]?$/i;

export function parseDeviceCommand(text: string): DevicePlan | null {
  const trimmed = text.trim();

  if (!trimmed) return null;

  // 1. Keep the existing Google Search flow working.
  const searchMatch = trimmed.match(GOOGLE_SEARCH_PATTERN);
  const query = searchMatch?.[1]?.trim();

  if (query) {
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

  // 2. Open a supported Android app by voice command.
  const openMatch = trimmed.match(OPEN_APP_COMMAND_PATTERN);

  const requestedApp = (
    openMatch?.[1] ??
    openMatch?.[2] ??
    ""
  ).trim();

  if (requestedApp) {
    const alias = APP_ALIASES.find((candidate) =>
      candidate.pattern.test(requestedApp)
    );

    if (!alias) return null;

    return {
      intent: `device.open_app.${alias.appName
        .toLowerCase()
        .replace(/\s+/g, "_")}`,
      targetPackage: alias.packageName,
      steps: [
        {
          type: "launch_app",
          packageName: alias.packageName,
        },
      ],
      summary: `Open ${alias.appName}`,
    };
  }

  // 3. Never invent a plan for a command we don't understand.
  return null;
}
