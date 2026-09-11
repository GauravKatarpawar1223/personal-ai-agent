"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { IconSpark, IconGoogle, IconLock } from "@/components/ui/Icons";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Phase 1 has no auth provider connected. We never pretend sign-in
    // succeeded — see /lib/auth/session.ts for the real contract this
    // will call once Supabase Auth is wired up.
    setNotice(
      "Sign-in isn't connected yet. This screen is the interface for it — Supabase Auth will power it in a later phase."
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-paper text-ink">
      <div className="px-5 py-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink">
            <IconSpark width={16} height={16} />
          </span>
          <span className="font-serif text-lg tracking-tight">Personal AI Agent</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-2xl text-ink mb-1.5">Welcome back</h1>
          <p className="text-sm text-ink-soft mb-7">Sign in to your workspace.</p>

          <button
            type="button"
            onClick={() =>
              setNotice(
                "Google sign-in isn't connected yet — this button is UI only until Supabase Auth is configured."
              )
            }
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink hover:border-ink-faint transition-colors min-h-[48px]"
          >
            <IconGoogle />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-faint">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-line bg-panel px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent min-h-[48px]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-ink">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setNotice("Password reset isn't connected yet.")}
                  className="text-xs font-medium text-accent hover:opacity-80"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-line bg-panel px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent min-h-[48px]"
              />
            </div>

            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          {notice && (
            <div
              role="status"
              className="mt-5 flex items-start gap-2 rounded-lg border border-line bg-panel px-3.5 py-3 text-sm text-ink-soft"
            >
              <IconLock width={15} height={15} className="mt-0.5 shrink-0 text-ink-faint" />
              <span>{notice}</span>
            </div>
          )}

          <p className="mt-7 text-center text-sm text-ink-soft">
            New here?{" "}
            <button
              type="button"
              onClick={() => setNotice("Account creation isn't connected yet.")}
              className="font-medium text-accent hover:opacity-80"
            >
              Create account
            </button>
          </p>

          <div className="mt-8 border-t border-line pt-6 text-center">
            <Link href="/agent" className="text-sm font-medium text-ink-soft hover:text-ink">
              Preview the agent workspace as a demo →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
