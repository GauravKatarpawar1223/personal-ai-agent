import { IconSpark, IconMic, IconSend } from "@/components/ui/Icons";

/** Purely decorative, static illustration of the agent workspace — not an
 *  interactive component, and not wired to any real conversation state. */
export function ProductPreview() {
  return (
    <div
      className="rounded-2xl border border-line bg-panel p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:p-5"
      aria-hidden="true"
    >
      <div className="flex items-center gap-1.5 pb-3 border-b border-line">
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-2 text-xs text-ink-faint">Agent workspace</span>
      </div>

      <div className="pt-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconSpark width={13} height={13} />
          </span>
          <div className="rounded-xl rounded-tl-sm bg-paper px-3.5 py-2.5 text-sm text-ink-soft max-w-[85%]">
            Good morning. What would you like me to help you accomplish?
          </div>
        </div>

        <div className="flex justify-end">
          <div className="rounded-xl rounded-tr-sm bg-accent-soft px-3.5 py-2.5 text-sm text-ink max-w-[80%]">
            Find a free hour Thursday afternoon and draft an invite for the design review.
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconSpark width={13} height={13} />
          </span>
          <div className="rounded-xl rounded-tl-sm bg-paper px-3.5 py-2.5 text-sm max-w-[85%] space-y-1.5">
            <p className="flex items-center gap-1.5 text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-line" /> Checking Calendar — connect
              to enable
            </p>
            <p className="text-ink-soft">
              I don&apos;t have calendar access yet. Connect Google Calendar and I can find the
              time and draft the invite for your approval.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2.5">
        <span className="flex-1 text-sm text-ink-faint">Tell me what you need...</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint">
          <IconMic width={16} height={16} />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink">
          <IconSend width={14} height={14} />
        </span>
      </div>
    </div>
  );
}
