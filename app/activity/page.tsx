import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ActivityItem } from "@/components/activity/ActivityItem";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listActivity } from "@/lib/data/activity";
import { StatusChip } from "@/components/ui/StatusChip";

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirectTo=/activity");
  }

  const entries = await listActivity(await createClient());

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-2xl text-ink">Activity</h1>
          <StatusChip tone="ok" dot>
            Live
          </StatusChip>
        </div>
        <p className="mt-2 text-sm text-ink-soft max-w-lg">
          A real record of what the agent has done — every message it answers and every
          web search it runs gets logged here.
        </p>

        {entries.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-line px-4 py-10 text-center">
            <p className="text-sm text-ink-soft">No activity yet.</p>
            <p className="mt-1 text-xs text-ink-faint">
              Send the agent a message and it&apos;ll show up here.
            </p>
          </div>
        ) : (
          <ul className="mt-6 rounded-xl border border-line bg-panel px-4">
            {entries.map((entry) => (
              <ActivityItem key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
