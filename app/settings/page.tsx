import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getConnectionsForUser } from "@/lib/data/connections";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirectTo=/settings");
  }

  const connections = await getConnectionsForUser(await createClient());
  const connectedCount = connections.filter((c) => c.status === "connected").length;

  return (
    <AppShell>
      <SettingsForm user={user} connectedCount={connectedCount} />
    </AppShell>
  );
}
