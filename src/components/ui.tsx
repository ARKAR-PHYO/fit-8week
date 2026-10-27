import type { ReactNode } from "react";

export function Card({ title, aside, children }: { title?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      {(title || aside) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{sub}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-white/15 dark:bg-neutral-950";

export const buttonClass =
  "inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white active:bg-emerald-800 disabled:opacity-50";

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  const cls =
    tone === "warn"
      ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      : "bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-200";
  return <p className={`rounded-xl px-3 py-2 text-sm ${cls}`}>{children}</p>;
}
