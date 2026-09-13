import type { AgentActionStep } from "@/lib/types";
import { IconCheck } from "@/components/ui/Icons";
import { StatusChip } from "@/components/ui/StatusChip";

/**
 * Shows the agent's step-by-step progress:
 *   Understanding request → Planning → Using tool → Completed
 *
 * Purely presentational — the steps and their statuses are owned by
 * whatever is driving the run (app/api/agent/chat/route.ts, surfaced
 * through components/agent/AgentWorkspace.tsx). Always render the
 * "Demo" chip when `isDemo` is true; Phase 2's real run passes
 * `isDemo={false}` since it reflects an actual request/response.
 */
export function AgentAction({
  steps,
  isDemo = true,
}: {
  steps: AgentActionStep[];
  isDemo?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel px-4 py-3.5 max-w-md">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          Agent activity
        </p>
        {isDemo && <StatusChip tone="neutral">Demo</StatusChip>}
      </div>
      <ol className="space-y-2.5">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-2.5">
            <StepMarker status={step.status} isLast={i === steps.length - 1} />
            <span
              className={`text-sm leading-5 pt-0.5 ${
                step.status === "pending" ? "text-ink-faint" : "text-ink-soft"
              } ${step.status === "active" ? "text-ink" : ""}`}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepMarker({
  status,
  isLast,
}: {
  status: AgentActionStep["status"];
  isLast: boolean;
}) {
  return (
    <span className="relative flex flex-col items-center">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          status === "done"
            ? "bg-accent border-accent text-accent-ink"
            : status === "failed"
            ? "bg-danger border-danger text-white"
            : status === "active"
            ? "border-accent text-accent"
            : "border-line text-ink-faint"
        }`}
        aria-hidden="true"
      >
        {status === "done" && <IconCheck width={11} height={11} />}
        {status === "active" && (
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
        )}
      </span>
      {!isLast && <span className="h-4 w-px bg-line mt-0.5" />}
    </span>
  );
}
