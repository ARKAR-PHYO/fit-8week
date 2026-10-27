"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSyncState } from "@/lib/client/hooks";
import { dismissProblems, flush, startSync } from "@/lib/client/store";

export function SyncBadge() {
  const s = useSyncState();

  useEffect(() => {
    void startSync();
  }, []);

  let label = "Synced";
  let tone = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (s.needsLogin) {
    label = "Sign in to sync";
    tone = "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200";
  } else if (!s.online) {
    label = s.pending ? `Offline · ${s.pending} to sync` : "Offline";
    tone = "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200";
  } else if (s.syncing) {
    label = "Syncing…";
    tone = "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";
  } else if (s.pending) {
    label = `${s.pending} to sync`;
    tone = "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {s.needsLogin ? (
        <Link href="/login" className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
          {label}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => void flush()}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
          aria-live="polite"
        >
          {label}
        </button>
      )}
      {s.problems.length > 0 && (
        <div role="alert" className="max-w-64 rounded-lg bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
          <p className="font-medium">{s.problems.length} change(s) were rejected:</p>
          <p className="mt-1">{s.problems[s.problems.length - 1].message}</p>
          <button type="button" className="mt-1 underline" onClick={() => void dismissProblems()}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
