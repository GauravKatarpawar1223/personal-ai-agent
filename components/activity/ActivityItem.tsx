import type { ActivityLog } from "@/lib/types";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";

const STATUS_META: Record<ActivityLog["status"], { label: string; tone: ChipTone }> = {
  completed: { label: "Completed", tone: "ok" },
  waiting_for_approval: { label: "Waiting for approval", tone: "warn" },
  failed: { label: "Failed", tone: "danger" },
  in_progress: { label: "In progress", tone: "accent" },
};

export function ActivityItem({ entry }: { entry: ActivityLog }) {
  const meta = STATUS_META[entry.status];
  const date = new Date(entry.timestamp);

  return (
    <li className="flex items-start gap-4 border-b border-line py-4 last:border-b-0">
      <div className="w-16 shrink-0 pt-0.5 text-xs text-ink-faint">
        {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink">{entry.action}</p>
        <p className="mt-1 text-xs text-ink-faint">{entry.tool}</p>
      </div>
      <StatusChip tone={meta.tone}>{meta.label}</StatusChip>
    </li>
  );
}
