import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { SyncBadge } from "@/components/SyncBadge";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-black/5 bg-neutral-50/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur dark:border-white/5 dark:bg-neutral-950/95">
        <Link href="/today" className="text-base font-semibold tracking-tight">
          8-Week Plan
        </Link>
        <SyncBadge />
      </header>
      <main className="px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-4">{children}</main>
      <AppNav />
    </div>
  );
}
