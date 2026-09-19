"use client";

import { useState } from "react";
import type { Connection } from "@/lib/types";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/Button";
import {
  IconGoogle,
  IconPlug,
  IconFolder,
  IconChat,
  IconLock,
} from "@/components/ui/Icons";

const ICONS: Record<string, typeof IconPlug> = {
  gmail: IconGoogle,
  google_calendar: IconGoogle,
  google_drive: IconFolder,
  google_tasks: IconGoogle,
  whatsapp: IconChat,
  telegram: IconChat,
  github: IconPlug,
  vercel: IconPlug,
  browser: IconPlug,
};

export function ConnectionCard({ connection }: { connection: Connection }) {
  const [notice, setNotice] = useState(false);
  const Icon = ICONS[connection.providerId] ?? IconPlug;

  return (
    <div className="rounded-xl border border-line bg-panel p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper border border-line text-ink-soft">
            <Icon width={17} height={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">{connection.name}</p>
            <p className="text-xs text-ink-faint truncate">{connection.category}</p>
          </div>
        </div>
        <ConnectionStatusChip status={connection.status} />
      </div>

      <p className="text-sm text-ink-soft leading-relaxed">{connection.description}</p>

      <div className="mt-1">
        {connection.status === "not_connected" && connection.providerId === "google_calendar" && (
          <a
            href="/api/connections/google/calendar/authorize"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium text-ink hover:border-ink-faint transition-colors"
          >
            <IconLock width={14} height={14} />
            Connect
          </a>
        )}
        {connection.status === "not_connected" && connection.providerId !== "google_calendar" && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNotice(true)}
              icon={<IconLock width={14} height={14} />}
            >
              Connect
            </Button>
            {notice && (
              <p className="mt-2 text-xs text-ink-faint leading-relaxed">
                {connectNotice(connection.providerId)}
              </p>
            )}
          </>
        )}
        {connection.status === "coming_soon" && (
          <Button variant="ghost" size="sm" disabled>
            Coming soon
          </Button>
        )}
      </div>
    </div>
  );
}

function connectNotice(providerId: string): string {
  if (providerId === "browser") {
    return "The server isn't configured with an AI provider key yet (GEMINI_API_KEY) — see the README. Nothing is connected yet.";
  }
  return "Needs its own OAuth app credentials for data access (separate from Google sign-in) — see the README's connector section. Nothing is connected yet.";
}

function ConnectionStatusChip({ status }: { status: Connection["status"] }) {
  if (status === "connected") return <StatusChip tone="ok" dot>Connected</StatusChip>;
  if (status === "coming_soon") return <StatusChip tone="neutral">Coming soon</StatusChip>;
  return <StatusChip tone="neutral">Not connected</StatusChip>;
}
