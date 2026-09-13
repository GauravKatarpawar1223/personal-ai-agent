"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Toggle } from "@/components/ui/Toggle";
import { StatusChip } from "@/components/ui/StatusChip";
import { IconArrowRight } from "@/components/ui/Icons";
import { updateProfileAction } from "@/lib/actions/profile";
import { signOutAction } from "@/lib/actions/auth";
import type { ResponseStyle, User } from "@/lib/types";

const RESPONSE_STYLES: { value: ResponseStyle; label: string; description: string }[] = [
  { value: "concise", label: "Concise", description: "Short, to the point answers." },
  { value: "balanced", label: "Balanced", description: "A mix of brevity and detail." },
  { value: "detailed", label: "Detailed", description: "Thorough explanations by default." },
];

export function SettingsForm({ user, connectedCount }: { user: User; connectedCount: number }) {
  const [name, setName] = useState(user.name);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>("balanced");
  const [askEveryAction, setAskEveryAction] = useState(true);
  const [saveState, setSaveState] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSaveProfile() {
    startTransition(async () => {
      const result = await updateProfileAction(name);
      setSaveState(
        result.ok
          ? { tone: "ok", message: "Saved." }
          : { tone: "error", message: result.error ?? "Couldn't save your changes." }
      );
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-serif text-2xl text-ink">Settings</h1>
      <p className="mt-2 text-sm text-ink-soft max-w-lg">
        Your profile is real and saved to your account. Response style and voice
        preferences below apply to this session only for now.
      </p>

      <div className="mt-6">
        {/* Profile */}
        <SettingsSection title="Profile" description="How you appear across the workspace.">
          <div className="flex items-center gap-4 mb-5">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent font-serif text-xl"
              aria-hidden="true"
            >
              {name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div>
              <button type="button" disabled className="text-sm font-medium text-ink-faint cursor-not-allowed">
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
                value={user.email}
                disabled
                className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink-faint cursor-not-allowed min-h-[44px]"
              />
              <p className="mt-1 text-xs text-ink-faint">
                Managed by your sign-in method — not editable here.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isPending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[40px]"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
            {saveState && (
              <span className={`text-xs ${saveState.tone === "error" ? "text-danger" : "text-ink-faint"}`}>
                {saveState.message}
              </span>
            )}
          </div>
        </SettingsSection>

        {/* AI preferences */}
        <SettingsSection
          title="AI preferences"
          description="How the agent responds and when it checks in with you. Applies to this session only."
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
                    active ? "border-accent bg-accent-soft" : "border-line bg-panel hover:border-ink-faint"
                  }`}
                >
                  <span className={`block text-sm font-medium ${active ? "text-accent" : "text-ink"}`}>
                    {style.label}
                  </span>
                  <span className="block text-xs text-ink-faint mt-0.5">{style.description}</span>
                </button>
              );
            })}
          </div>

          <p className="text-sm font-medium text-ink mb-1">Confirmation preferences</p>
          <Toggle
            checked={askEveryAction}
            onChange={setAskEveryAction}
            label="Always ask before actions that send, buy, book, or delete"
            description="High-impact actions always require approval in Phase 2 — this can't be turned off yet."
            disabled
          />
        </SettingsSection>

        {/* Voice */}
        <SettingsSection title="Voice" description="Speak to the agent and hear responses back.">
          <Toggle
            checked
            onChange={() => {}}
            label="Voice input"
            description="Uses your browser's built-in speech recognition — available in the message box on the Agent page (Chrome and Edge)."
            disabled
          />
          <Toggle checked={false} onChange={() => {}} label="Voice responses" description="Coming soon" disabled />
        </SettingsSection>

        {/* Security */}
        <SettingsSection title="Security">
          <div className="divide-y divide-line">
            <Link href="/connections" className="flex items-center justify-between py-3 group">
              <div>
                <p className="text-sm text-ink">Connected accounts</p>
                <p className="text-xs text-ink-faint mt-0.5">
                  {connectedCount === 0
                    ? "No accounts connected"
                    : `${connectedCount} account${connectedCount === 1 ? "" : "s"} connected`}
                </p>
              </div>
              <IconArrowRight width={16} height={16} className="text-ink-faint group-hover:text-ink transition-colors" />
            </Link>

            <div className="py-3">
              <p className="text-sm text-ink">Permissions</p>
              <p className="text-xs text-ink-faint mt-0.5 max-w-sm">
                Every tool is labeled Read-only, Prepares a draft, or Requires your approval. Only
                the last one can act on your behalf, and only after you approve it each time.
              </p>
            </div>

            <Link href="/activity" className="flex items-center justify-between py-3 group">
              <div>
                <p className="text-sm text-ink">Activity history</p>
                <p className="text-xs text-ink-faint mt-0.5">Review everything the agent has done or attempted</p>
              </div>
              <IconArrowRight width={16} height={16} className="text-ink-faint group-hover:text-ink transition-colors" />
            </Link>

            <div className="flex items-center justify-between py-3">
              <p className="text-sm text-ink">Sign out</p>
              <form action={signOutAction}>
                <button type="submit" className="text-sm font-medium text-accent hover:opacity-80">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection title="Appearance">
          <ThemeToggle />
        </SettingsSection>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <StatusChip tone="ok" dot>
          Signed in
        </StatusChip>
        <p className="text-xs text-ink-faint">{user.email}</p>
      </div>
    </div>
  );
}
