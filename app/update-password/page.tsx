"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleUpdatePassword() {
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    setPending(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Password updated successfully. Redirecting...");

    setTimeout(() => {
      router.push("/agent");
      router.refresh();
    }, 1000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper text-ink px-5">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl mb-2">
          Set a new password
        </h1>

        <p className="text-sm text-ink-soft mb-7">
          Enter your new password below.
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-ink mb-1.5"
            >
              New password
            </label>

            <input
              id="password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-panel px-3.5 py-3 text-sm min-h-[48px]"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-ink mb-1.5"
            >
              Confirm password
            </label>

            <input
              id="confirmPassword"
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-panel px-3.5 py-3 text-sm min-h-[48px]"
            />
          </div>

          {error && (
            <p className="text-sm text-danger">
              {error}
            </p>
          )}

          {message && (
            <p className="text-sm text-ink-soft">
              {message}
            </p>
          )}

          <Button
            type="button"
            onClick={handleUpdatePassword}
            disabled={pending}
            className="w-full"
          >
            {pending ? "Updating..." : "Update password"}
          </Button>
        </div>
      </div>
    </main>
  );
}
