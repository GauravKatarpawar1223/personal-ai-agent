export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line py-7 first:pt-0 last:border-b-0">
      <h2 className="text-sm font-medium text-ink">{title}</h2>
      {description && <p className="mt-1 text-xs text-ink-faint max-w-md">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
