"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChat, IconPlug, IconActivity, IconSettings } from "@/components/ui/Icons";

const LINKS = [
  { href: "/agent", label: "Agent", icon: IconChat },
  { href: "/connections", label: "Connect", icon: IconPlug },
  { href: "/activity", label: "Activity", icon: IconActivity },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-panel/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-xs font-medium"
              >
                <Icon
                  width={20}
                  height={20}
                  className={active ? "text-accent" : "text-ink-faint"}
                />
                <span className={active ? "text-accent" : "text-ink-faint"}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
