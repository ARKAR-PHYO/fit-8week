"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/today", label: "Today", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { href: "/recipes", label: "Recipes", icon: "M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4V4zM8 8h8M8 12h8" },
  { href: "/workouts", label: "Workouts", icon: "M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" },
  { href: "/checkin", label: "Check-in", icon: "M4 6h16M4 12h10M4 18h7M17 16l2 2 4-4" },
  { href: "/progress", label: "Progress", icon: "M4 19V5M4 19h16M8 15l4-4 3 3 5-6" },
];

/**
 * Inside a tab Link: a thin animated bar along the top of the tapped tab while its page loads.
 * (Positioned on the tab, not the screen: the nav's backdrop blur makes it the containing block.)
 */
function PendingBar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-2 top-0 h-0.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950"
    >
      <span className="block h-full w-2/5 animate-[nav-progress_1s_ease-in-out_infinite] bg-emerald-600 motion-reduce:animate-none" />
    </span>
  );
}

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-neutral-950/95"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                  active ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={item.icon} />
                </svg>
                {item.label}
                <PendingBar />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
