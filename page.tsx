import { AppShell } from "@/components/layout/AppShell";
import { ActivityItem } from "@/components/activity/ActivityItem";
import { DEMO_ACTIVITY } from "@/lib/demo-data";
import { StatusChip } from "@/components/ui/StatusChip";

export default function ActivityPage() {
  const sorted = [...DEMO_ACTIVITY].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-2xl text-ink">Activity</h1>
          <StatusChip tone="neutral">Demo data</StatusChip>
        </div>
        <p className="mt-2 text-sm text-ink-soft max-w-lg">
          A record of what the agent has done or attempted. This is local demo data in
          Phase 1 — it will read from your account's history once Supabase is connected.
        </p>

        {sorted.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-line px-4 py-10 text-center">
            <p className="text-sm text-ink-soft">No activity yet.</p>
            <p className="mt-1 text-xs text-ink-faint">
              Actions the agent takes will show up here.
            </p>
          </div>
        ) : (
          <ul className="mt-6 rounded-xl border border-line bg-panel px-4">
            {sorted.map((entry) => (
              <ActivityItem key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
