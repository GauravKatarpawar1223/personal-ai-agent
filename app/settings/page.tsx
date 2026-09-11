"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Toggle } from "@/components/ui/Toggle";
import { StatusChip } from "@/components/ui/StatusChip";
import { DEMO_USER } from "@/lib/auth/session";
import { DEMO_CONNECTIONS } from "@/lib/demo-data";
import type { ResponseStyle } from "@/lib/types";
import { IconArrowRight } from "@/components/ui/Icons";

const RESPONSE_STYLES: { value: ResponseStyle; label: string; description: string }[] = [
  { value: "concise", label: "Concise", description: "Short, to the point answers." },
  { value: "balanced", label: "Balanced", description: "A mix of brevity and detail." },
  { value: "detailed", label: "Detailed", description: "Thorough explanations by default." },
];

export default function SettingsPage() {
  const [name, setName] = useState(DEMO_USER.name);
  const [email, setEmail] = useState(DEMO_USER.email);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>("balanced");
  const [askEveryAction, setAskEveryAction] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const connectedCount = DEMO_CONNECTIONS.filter((c) => c.status === "connected").length;

  function handleSaveProfile() {
    // Phase 1 has no database connected — this only updates local state
    // for the current session and is never persisted.
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-serif text-2xl text-ink">Settings</h1>
        <p className="mt-2 text-sm text-ink-soft max-w-lg">
          Preferences here apply to this demo session only until an account is connected.
        </p>

        <div className="mt-6">
          {/* Profile */}
          <SettingsSection
            title="Profile"
            description="How you appear across the workspace."
          >
            <div className="flex items-center gap-4 mb-5">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent font-serif text-xl"
                aria-hidden="true"
              >
                {name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div>
                <button
                  type="button"
                  disabled
                  className="text-sm font-medium text-ink-faint cursor-not-allowed"
                >
                  Change avatar
                </button>
                <p className="text-xs text-ink-faint mt-0.5">Coming soon</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
                  Name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-ink focus:border-accent min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="settings-email" className="block text-sm font-medium text-ink mb-1.5">
                  Email
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-ink focus:border-accent min-h-[44px]"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveProfile}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90 transition-opacity min-h-[40px]"
              >
                Save changes
              </button>
              {savedNotice && (
                <span className="text-xs text-ink-faint">
                  Saved for this session — not yet persisted to an account.
                </span>
              )}
            </div>
          </SettingsSection>

          {/* AI preferences */}
          <SettingsSection
            title="AI preferences"
            description="How the agent responds and when it checks in with you."
          >
            <p className="text-sm font-medium text-ink mb-2">Response style</p>
            <div className="grid gap-2 sm:grid-cols-3 mb-6">
              {RESPONSE_STYLES.map((style) => {
                const active = responseStyle === style.value;
                return (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setResponseStyle(style.value)}
                    aria-pressed={active}
                    className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                      active
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-panel hover:border-ink-faint"
                    }`}
                  >
                    <span className={`block text-sm font-medium ${active ? "text-accent" : "text-ink"}`}>
                      {style.label}
                    </span>
                    <span className="block text-xs text-ink-faint mt-0.5">
                      {style.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-sm font-medium text-ink mb-1">Confirmation preferences</p>
            <Toggle
              checked={askEveryAction}
              onChange={setAskEveryAction}
              label="Always ask before actions that send, buy, book, or delete"
              description="High-impact actions always require approval in Phase 1 — this can't be turned off yet."
              disabled
            />
          </SettingsSection>

          {/* Voice */}
          <SettingsSection
            title="Voice"
            description="Speak to the agent and hear responses back."
          >
            <Toggle
              checked={false}
              onChange={() => {}}
              label="Voice input"
              description="Coming soon"
              disabled
            />
            <Toggle
              checked={false}
              onChange={() => {}}
              label="Voice responses"
              description="Coming soon"
              disabled
            />
          </SettingsSection>

          {/* Security */}
          <SettingsSection title="Security">
            <div className="divide-y divide-line">
              <Link
                href="/connections"
                className="flex items-center justify-between py-3 group"
              >
                <div>
                  <p className="text-sm text-ink">Connected accounts</p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {connectedCount === 0
                      ? "No accounts connected"
                      : `${connectedCount} account${connectedCount === 1 ? "" : "s"} connected`}
                  </p>
                </div>
                <IconArrowRight
                  width={16}
                  height={16}
                  className="text-ink-faint group-hover:text-ink transition-colors"
                />
              </Link>

              <div className="py-3">
                <p className="text-sm text-ink">Permissions</p>
                <p className="text-xs text-ink-faint mt-0.5 max-w-sm">
                  Every tool is labeled Read-only, Prepares a draft, or Requires your
                  approval. Only the last one can act on your behalf, and only after you
                  approve it each time.
                </p>
              </div>

              <Link href="/activity" className="flex items-center justify-between py-3 group">
                <div>
                  <p className="text-sm text-ink">Activity history</p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    Review everything the agent has done or attempted
                  </p>
                </div>
                <IconArrowRight
                  width={16}
                  height={16}
                  className="text-ink-faint group-hover:text-ink transition-colors"
                />
              </Link>
            </div>
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection title="Appearance">
            <ThemeToggle />
          </SettingsSection>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <StatusChip tone="neutral">Phase 1</StatusChip>
          <p className="text-xs text-ink-faint">
            Signed in as {DEMO_USER.email} (demo session)
          </p>
        </div>
      </div>
    </AppShell>
  );
}
