"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconSpark, IconGoogle, IconLock } from "@/components/ui/Icons";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

type Mode = "sign-in" | "sign-up";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/agent";
  const urlError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(urlError);
  const [noticeTone, setNoticeTone] = useState<"info" | "error">(urlError ? "error" : "info");

  function showNotice(message: string, tone: "info" | "error" = "info") {
    setNotice(message);
    setNoticeTone(tone);
  }

  async function handleGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) showNotice(error.message, "error");
    // On success the browser is redirected to Google — nothing else to do here.
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setNotice(null);
    const supabase = createClient();

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setPending(false);
      if (error) {
        showNotice(error.message, "error");
        return;
      }
      router.push(redirectTo);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setPending(false);
    if (error) {
      showNotice(error.message, "error");
      return;
    }
    showNotice("Check your email to confirm your account before signing in.");
  }

  async function handleForgotPassword() {
    if (!email) {
      showNotice("Enter your email above first, then click Forgot password.", "error");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) {
      showNotice(error.message, "error");
      return;
    }
    showNotice("Password reset email sent — check your inbox.");
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
          <h1 className="font-serif text-2xl text-ink mb-1.5">
            {mode === "sign-in" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-ink-soft mb-7">
            {mode === "sign-in" ? "Sign in to your workspace." : "Set a password to get started."}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
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

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-line bg-panel px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent min-h-[48px]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-ink">
                  Password
                </label>
                {mode === "sign-in" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-accent hover:opacity-80"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-line bg-panel px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent min-h-[48px]"
              />
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {notice && (
            <div
              role="status"
              className={`mt-5 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm ${
                noticeTone === "error"
                  ? "border-danger/30 bg-danger-soft text-danger"
                  : "border-line bg-panel text-ink-soft"
              }`}
            >
              <IconLock width={15} height={15} className="mt-0.5 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          <p className="mt-7 text-center text-sm text-ink-soft">
            {mode === "sign-in" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-up");
                    setNotice(null);
                  }}
                  className="font-medium text-accent hover:opacity-80"
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-in");
                    setNotice(null);
                  }}
                  className="font-medium text-accent hover:opacity-80"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
