"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconSpark,
  IconPlus,
  IconChat,
  IconActivity,
  IconPlug,
  IconSettings,
} from "@/components/ui/Icons";
import type { Conversation } from "@/lib/types";
import { signOutAction } from "@/lib/actions/auth";

const PRIMARY_LINKS = [
  { href: "/connections", label: "Connections", icon: IconPlug },
  { href: "/activity", label: "Activity", icon: IconActivity },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function Sidebar({
  conversations,
  userEmail,
}: {
  conversations: Conversation[];
  userEmail?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-72 md:flex-col md:border-r md:border-line md:bg-panel md:h-screen md:sticky md:top-0">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink">
          <IconSpark width={16} height={16} />
        </span>
        <Link href="/agent" className="font-serif text-lg tracking-tight text-ink">
          Personal AI
        </Link>
      </div>

      <div className="px-3">
        <Link
          href="/agent"
          className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-ink hover:border-ink-faint transition-colors"
        >
          <IconPlus width={16} height={16} />
          New conversation
        </Link>
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto px-3">
        <p className="px-2 text-xs font-medium uppercase tracking-wide text-ink-faint mb-2">
          Conversations
        </p>
        {conversations.length === 0 ? (
          <p className="px-2 text-sm text-ink-faint mb-6">No conversations yet.</p>
        ) : (
          <ul className="space-y-0.5 mb-6">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <Link
                  href={`/agent?c=${conv.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-soft hover:bg-paper hover:text-ink transition-colors"
                >
                  <IconChat width={15} height={15} className="shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <ul className="space-y-0.5 border-t border-line pt-3">
          {PRIMARY_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-ink-soft hover:bg-paper hover:text-ink"
                  }`}
                >
                  <Icon width={16} height={16} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-5 py-4 border-t border-line">
        {userEmail ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink-faint truncate">{userEmail}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-xs font-medium text-ink-soft hover:text-ink shrink-0"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <p className="text-xs text-ink-faint">Phase 2</p>
        )}
      </div>
    </aside>
  );
}
