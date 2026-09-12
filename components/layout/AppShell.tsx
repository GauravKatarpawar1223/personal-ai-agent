import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex bg-paper text-ink">
      <Sidebar />
      <div className="flex-1 min-w-0 pb-16 md:pb-0">{children}</div>
      <MobileNav />
    </div>
  );
}
