"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface UpdateProfileResult {
  ok: boolean;
  error?: string;
}

/** Updates the signed-in user's display name. RLS (see the migration's
 *  "profiles are editable by their owner" policy) means this can only
 *  ever affect the caller's own row. */
export async function updateProfileAction(name: string): Promise<UpdateProfileResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name can't be empty." };
  }

  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;

  if (authError || !userId) {
    return { ok: false, error: "You're signed out — refresh and sign in again." };
  }

  const { error } = await supabase.from("profiles").update({ name: trimmed }).eq("id", userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  return { ok: true };
}
