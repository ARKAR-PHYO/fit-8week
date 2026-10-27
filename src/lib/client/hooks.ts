"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { DayData, ProgressData } from "@/lib/types";
import { MEALS } from "@/content/menu";
import { todayInPlanZone } from "@/lib/plan";
import {
  cachedDay,
  cachedProgress,
  fetchDay,
  fetchProgress,
  FetchError,
  getServerSyncState,
  getSyncState,
  onDataChanged,
  overlayDay,
  pendingOps,
  subscribe,
} from "./store";

export function useSyncState() {
  return useSyncExternalStore(subscribe, getSyncState, getServerSyncState);
}

const noopSubscribe = () => () => {};
/** Today's date in Yangon. Null during server render, so nothing date-specific is prerendered. */
export function useToday(): string | null {
  return useSyncExternalStore(noopSubscribe, () => todayInPlanZone(), () => null);
}

export type Load<T> = {
  data: T | null;
  /** "network" once fresh data arrived; "cache" while showing the last saved copy. */
  source: "none" | "cache" | "network";
  error: string | null;
};

function emptyDay(date: string): DayData {
  return {
    date,
    weightKg: null,
    note: "",
    meals: Object.fromEntries(MEALS.map((m) => [m, { done: false, topUp: false, updatedAt: null }])) as DayData["meals"],
    workout: null,
  };
}

function describe(err: unknown): string {
  if (err instanceof FetchError) {
    if (err.status === 401) return "Signed out. Sign in again to sync.";
    if (err.code === "sheet_structure") return `Sheet layout problem: ${err.message}`;
    return "Couldn't reach the Sheet. Showing saved data.";
  }
  return "Offline. Showing saved data.";
}

export function useDay(date: string | null): Load<DayData> {
  const [state, setState] = useState<Load<DayData> & { for: string | null }>({
    for: null,
    data: null,
    source: "none",
    error: null,
  });

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    let base: DayData | null = null;
    let lastSource: Load<DayData>["source"] = "none";
    let lastError: string | null = null;

    const applyLocal = async (source: Load<DayData>["source"], error: string | null) => {
      lastSource = source;
      lastError = error;
      const ops = await pendingOps();
      if (cancelled) return;
      setState({ for: date, data: overlayDay(base ?? emptyDay(date), ops), source, error });
    };

    const load = async () => {
      const cached = await cachedDay(date);
      if (cancelled) return;
      if (cached) {
        base = cached;
        await applyLocal("cache", null);
      }
      try {
        base = await fetchDay(date);
        await applyLocal("network", null);
      } catch (err) {
        await applyLocal(base ? "cache" : "none", describe(err));
      }
    };

    void load();
    const off = onDataChanged((kind) => {
      if (kind === "local") void applyLocal(lastSource, lastError);
      else void load();
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [date]);

  if (!date || state.for !== date) return { data: date ? emptyDay(date) : null, source: "none", error: null };
  return state;
}

export function useProgress(): Load<ProgressData> & { reload: () => void } {
  const [state, setState] = useState<Load<ProgressData>>({ data: null, source: "none", error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const cached = await cachedProgress();
      if (cancelled) return;
      if (cached) setState({ data: cached, source: "cache", error: null });
      try {
        const fresh = await fetchProgress();
        if (!cancelled) setState({ data: fresh, source: "network", error: null });
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, error: describe(err) }));
      }
    };
    void load();
    const off = onDataChanged((kind) => {
      if (kind === "synced") void load();
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
