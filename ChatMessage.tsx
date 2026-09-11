import type { Message } from "@/lib/types";
import { IconSpark } from "@/components/ui/Icons";

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="rounded-2xl rounded-tr-sm bg-accent-soft px-4 py-2.5 text-sm text-ink max-w-[85%] sm:max-w-[70%] leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
        aria-hidden="true"
      >
        <IconSpark width={14} height={14} />
      </span>
      <div className="rounded-2xl rounded-tl-sm bg-panel border border-line px-4 py-2.5 text-sm text-ink max-w-[85%] sm:max-w-[70%] leading-relaxed">
        {message.content}
      </div>
    </div>
  );
}
