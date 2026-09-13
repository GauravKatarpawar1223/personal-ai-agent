import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ConnectionCard } from "@/components/connections/ConnectionCard";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getConnectionsForUser } from "@/lib/data/connections";
import type { Connection } from "@/lib/types";

const CATEGORY_ORDER: Connection["category"][] = [
  "Google Workspace",
  "Communication",
  "Work",
  "Browser",
];

export default async function ConnectionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirectTo=/connections");
  }

  const allConnections = await getConnectionsForUser(await createClient());
  const connected = allConnections.filter((c) => c.status === "connected");

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-serif text-2xl text-ink">Connections</h1>
        <p className="mt-2 text-sm text-ink-soft max-w-lg">
          Nothing is connected until you approve it. Web search is available automatically —
          everything else needs its own connection.
        </p>

        <section className="mt-8">
          <h2 className="text-sm font-medium text-ink mb-3">Connected</h2>
          {connected.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
              <p className="text-sm text-ink-soft">No connections yet.</p>
              <p className="mt-1 text-xs text-ink-faint">
                Connect an app below to give the agent something real to work with.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {connected.map((c) => (
                <ConnectionCard key={c.id} connection={c} />
              ))}
            </div>
          )}
        </section>

        {CATEGORY_ORDER.map((category) => {
          const items = allConnections.filter(
            (c) => c.category === category && c.status !== "connected"
          );
          if (items.length === 0) return null;
          return (
            <section key={category} className="mt-8">
              <h2 className="text-sm font-medium text-ink mb-3">{category}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((c) => (
                  <ConnectionCard key={c.id} connection={c} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
