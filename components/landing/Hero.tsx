import Link from "next/link";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { IconArrowRight } from "@/components/ui/Icons";

export function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-5 pt-14 pb-16 sm:px-8 sm:pt-20 sm:pb-24">
      <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-medium text-accent mb-4">Personal AI Agent</p>
          <h1 className="font-serif text-4xl leading-[1.1] text-ink sm:text-5xl sm:leading-[1.08] max-w-xl">
            Your AI that gets things done.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            One place to research, organize, plan and eventually execute tasks
            across the tools you use.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/agent"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-ink hover:opacity-90 transition-opacity"
            >
              Start using AI
              <IconArrowRight width={16} height={16} />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-line px-5 text-sm font-medium text-ink hover:border-ink-faint transition-colors"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-6 text-sm text-ink-faint">
            Phase 2: real sign-in and a real AI agent with web search.
            Connectors are still being added one at a time — nothing is
            connected until you approve it.
          </p>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}
