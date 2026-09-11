import { QuickActions } from "@/components/agent/QuickActions";

export function EmptyConversationState({
  onSelectQuickAction,
}: {
  onSelectQuickAction: (text: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="font-serif text-2xl sm:text-3xl text-ink max-w-md">
        Good morning. What would you like me to help you accomplish?
      </h1>
      <p className="mt-3 max-w-sm text-sm text-ink-soft">
        Start typing below, or try one of these.
      </p>
      <div className="mt-6 max-w-lg">
        <QuickActions onSelect={onSelectQuickAction} />
      </div>
    </div>
  );
}
