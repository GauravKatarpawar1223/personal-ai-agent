"use client";

import { useTheme } from "@/components/layout/ThemeProvider";
import { IconSun, IconMoon, IconLaptop } from "@/components/ui/Icons";
import type { ThemePreference } from "@/lib/types";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof IconSun }[] = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "system", label: "System", icon: IconLaptop },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="inline-flex items-center rounded-lg border border-line p-1 bg-panel"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors min-h-[36px] ${
              active ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            <Icon width={15} height={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
