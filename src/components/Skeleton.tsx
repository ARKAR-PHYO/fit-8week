import type { ReactNode } from "react";

/** A grey placeholder block that gently pulses. Decorative only. */
export function Skeleton({ className = "" }: { className?: string }) {
  // Default rounding only when the caller doesn't set one, so two rounded-* classes never conflict.
  const rounding = /\brounded(-|\b)/.test(className) ? "" : "rounded-lg";
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse bg-neutral-200 motion-reduce:animate-none dark:bg-neutral-800 ${rounding} ${className}`}
    />
  );
}

function SkeletonCardShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">{children}</div>
  );
}

/** Card-shaped placeholder with a title bar and `lines` text lines. */
export function SkeletonCard({ lines = 3, media = false }: { lines?: number; media?: boolean }) {
  return (
    <SkeletonCardShell>
      <Skeleton className="mb-4 h-3 w-24" />
      {media && <Skeleton className="mb-4 aspect-[4/3] w-full rounded-xl" />}
      <div className="space-y-2.5">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </SkeletonCardShell>
  );
}

/** Rows with a thumbnail, like the meal list and recipe list. */
export function SkeletonRows({ rows = 4, check = false }: { rows?: number; check?: boolean }) {
  return (
    <SkeletonCardShell>
      <Skeleton className="mb-3 h-3 w-20" />
      <ul className="divide-y divide-black/5 dark:divide-white/10">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            {check && <Skeleton className="h-7 w-7 shrink-0 rounded-full" />}
            <Skeleton className="h-12 w-16 shrink-0" />
            <span className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-4/5" />
            </span>
          </li>
        ))}
      </ul>
    </SkeletonCardShell>
  );
}

/** A 2-column grid of stat tiles. */
export function SkeletonStats({ tiles = 4 }: { tiles?: number }) {
  return (
    <SkeletonCardShell>
      <Skeleton className="mb-3 h-3 w-24" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: tiles }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
        ))}
      </div>
    </SkeletonCardShell>
  );
}

export function SkeletonTitle() {
  return (
    <div className="mb-4 space-y-2">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-56" />
    </div>
  );
}

/** Screen reader text for every loading state. */
export function LoadingLabel({ children }: { children: string }) {
  return (
    <p className="sr-only" role="status">
      {children}
    </p>
  );
}

// ---------- Page skeletons, shared by loading.tsx files and Suspense fallbacks ----------

export function TodaySkeleton() {
  return (
    <div className="space-y-4">
      <LoadingLabel>Loading today</LoadingLabel>
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-full" />
        <span className="flex flex-col items-center gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-36" />
        </span>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <SkeletonCard lines={2} />
      <SkeletonRows rows={4} check />
      <SkeletonCard lines={4} />
    </div>
  );
}

export function ListPageSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-4">
      <LoadingLabel>{label}</LoadingLabel>
      <SkeletonTitle />
      <SkeletonRows rows={4} />
      <SkeletonRows rows={5} />
    </div>
  );
}

export function DetailSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-4">
      <LoadingLabel>{label}</LoadingLabel>
      <Skeleton className="h-4 w-24" />
      <SkeletonTitle />
      <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      <SkeletonCard lines={5} />
    </div>
  );
}

export function WeekSkeleton() {
  return (
    <div className="space-y-4">
      <LoadingLabel>Loading this week</LoadingLabel>
      <SkeletonTitle />
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-14 shrink-0 rounded-full" />
        ))}
      </div>
      <SkeletonStats tiles={5} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={3} />
    </div>
  );
}

export function FormSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-4">
      <LoadingLabel>{label}</LoadingLabel>
      <SkeletonTitle />
      <Skeleton className="h-11 w-full rounded-xl" />
      <SkeletonStats tiles={10} />
    </div>
  );
}

export function ProgressSkeleton() {
  return (
    <div className="space-y-4">
      <LoadingLabel>Loading progress</LoadingLabel>
      <SkeletonTitle />
      <SkeletonStats tiles={6} />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <SkeletonStats tiles={4} />
    </div>
  );
}
