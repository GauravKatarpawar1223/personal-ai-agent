const QUICK_ACTIONS = [
  "today calendar check karo",
  "calculator 25 * 4",
  "what time is it",
  "15 September ko 5 baje meeting add karo",
];

export function QuickActions({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => onSelect(action)}
          className="rounded-full border border-line bg-panel px-3.5 py-2 text-sm font-medium text-ink-soft hover:text-ink hover:border-ink-faint transition-colors min-h-[40px]"
        >
          {action}
        </button>
      ))}
    </div>
  );
}
