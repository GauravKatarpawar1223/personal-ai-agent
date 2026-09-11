import type { User } from "@/lib/types";

/**
 * Auth scaffold
 * -------------
 * Phase 1 has no real authentication provider connected. This module
 * exists so the rest of the app can import a stable `getCurrentUser()`
 * / `AuthState` contract, and swapping in Supabase Auth later only means
 * rewriting this file — no component using it should need to change.
 *
 * Intentionally NOT using localStorage or any client-side storage for
 * session data: once real auth exists, session state belongs in an
 * httpOnly cookie managed server-side by Supabase Auth, not in the
 * browser's JS-accessible storage.
 */
export type AuthStatus = "signed_out" | "signed_in";

export interface AuthState {
  status: AuthStatus;
  user: User | null;
}

export const SIGNED_OUT_STATE: AuthState = { status: "signed_out", user: null };

/** Demo user shown only inside the Phase 1 preview workspace, never
 *  presented as a real authenticated session. */
export const DEMO_USER: User = {
  id: "demo-user",
  name: "Demo Workspace",
  email: "demo@personal-ai-agent.app",
  createdAt: new Date().toISOString(),
};
