export type ChipTone = "neutral" | "accent" | "warn" | "danger" | "ok";

const toneClasses: Record<ChipTone, string> = {
  neutral: "bg-panel text-ink-soft border border-line",
  accent: "bg-accent-soft text-accent border border-accent/20",
  warn: "bg-warn-soft text-warn border border-warn/25",
  danger: "bg-danger-soft text-danger border border-danger/25",
  ok: "bg-ok-soft text-ok border border-ok/20",
};

export function StatusChip({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
