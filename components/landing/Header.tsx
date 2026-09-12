import Link from "next/link";
import { IconSpark } from "@/components/ui/Icons";

export function Header() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink">
            <IconSpark width={16} height={16} />
          </span>
          <span className="font-serif text-lg tracking-tight text-ink">Personal AI Agent</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="#how-it-works"
            className="hidden sm:inline-block text-sm font-medium text-ink-soft hover:text-ink px-2 py-2"
          >
            How it works
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-ink-soft hover:text-ink px-3 py-2"
          >
            Log in
          </Link>
          <Link
            href="/agent"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90 transition-opacity"
          >
            Start using AI
          </Link>
        </nav>
      </div>
    </header>
  );
}
