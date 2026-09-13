"use client";

import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { IconAlert, IconCheck } from "@/components/ui/Icons";
import type { PermissionRequestImpact } from "@/lib/types";

const IMPACT_LABEL: Record<PermissionRequestImpact, string> = {
  send_message: "Sends a message",
  purchase: "Makes a purchase",
  booking: "Makes a booking",
  delete_data: "Deletes data",
  account_change: "Changes account settings",
  other: "Takes an action",
};

interface ConfirmationCardProps {
  title?: string;
  description: string;
  impact: PermissionRequestImpact;
  details: Record<string, string>;
  resolved?: boolean;
  approved?: boolean;
  onApprove: () => void;
  onCancel: () => void;
}

/**
 * Any tool with permissionLevel "execute" routes through this component
 * before it can run — see requiresConfirmation() in
 * /lib/agent/permissions.ts. Phase 2 still never actually performs the
 * underlying action: Approve only records the decision locally.
 */
export function ConfirmationCard({
  title = "Action requires your approval",
  description,
  impact,
  details,
  resolved = false,
  approved,
  onApprove,
  onCancel,
}: ConfirmationCardProps) {
  return (
    <div className="rounded-xl border border-warn/30 bg-warn-soft/40 px-4 py-4 max-w-md">
      <div className="flex items-start gap-2.5 mb-3">
        <IconAlert width={17} height={17} className="mt-0.5 shrink-0 text-warn" />
        <div>
          <p className="text-sm font-medium text-ink">{title}</p>
          <StatusChip tone="warn">{IMPACT_LABEL[impact]}</StatusChip>
        </div>
      </div>

      <p className="text-sm text-ink mb-3">{description}</p>

      <dl className="space-y-1.5 rounded-lg bg-panel border border-line px-3 py-2.5 mb-4">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="flex gap-2 text-sm">
            <dt className="text-ink-faint shrink-0 w-20 capitalize">{key}</dt>
            <dd className="text-ink-soft break-words">{value}</dd>
          </div>
        ))}
      </dl>

      {!resolved ? (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onApprove}>
            Approve
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink-soft">
          {approved ? (
            <>
              <IconCheck width={14} height={14} className="text-accent" />
              Approved — demo only, nothing was actually sent.
            </>
          ) : (
            "Cancelled — no action was taken."
          )}
        </p>
      )}
    </div>
  );
}
