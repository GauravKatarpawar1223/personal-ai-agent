import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed",
  secondary:
    "bg-transparent border border-line text-ink hover:border-ink-faint disabled:opacity-40 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-ink-soft hover:text-ink hover:bg-panel disabled:opacity-40 disabled:cursor-not-allowed",
  danger:
    "bg-danger text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors min-h-[44px] sm:min-h-0 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
