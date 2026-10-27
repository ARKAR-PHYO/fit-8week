"use client";

/**
 * Device-side data layer.
 *  - Every change goes into an outbox in IndexedDB first, so nothing is lost when offline
 *    or if the app is closed mid-save. The outbox is flushed to /api/sync.
 *  - Last-loaded data is cached per day so screens still show something offline.
 *  - Pending changes are overlaid on loaded data so the UI reflects them immediately.
 */
import { createStore, del, get, set, clear } from "idb-keyval";
import { MAX_OPS_PER_SYNC, type Op, type OpResult } from "@/lib/ops";
import type { DayData, ProgressData } from "@/lib/types";

const db = typeof indexedDB === "undefined" ? undefined : createStore("fit-8week", "kv");

const OUTBOX = "outbox";
const PROBLEMS = "problems";

export type SyncState = {
  pending: number;
  syncing: boolean;
  online: boolean;
  needsLogin: boolean;
  /** Changes the server rejected; shown to the user so nothing disappears silently. */
  problems: { id: string; message: string }[];
  lastSyncedAt: string | null;
};

let state: SyncState = {
  pending: 0,
  syncing: false,
  online: true,
  needsLogin: false,
  problems: [],
  lastSyncedAt: null,
};
const listeners = new Set<() => void>();

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const getSyncState = () => state;
const SERVER_STATE: SyncState = { ...state };
export const getServerSyncState = () => SERVER_STATE;

/**
 * Notifies screens that data changed: "local" after a queued edit (re-apply the overlay,
 * no network), "synced" after a sync round-trip (refetch from the Sheet).
 */
export type DataChange = "local" | "synced";
const dataListeners = new Set<(kind: DataChange) => void>();
export function onDataChanged(listener: (kind: DataChange) => void) {
  dataListeners.add(listener);
  return () => dataListeners.delete(listener);
}

async function readOutbox(): Promise<Op[]> {
  if (!db) return [];
  return (await get<Op[]>(OUTBOX, db)) ?? [];
}

async function writeOutbox(ops: Op[]) {
  if (!db) return;
  await set(OUTBOX, ops, db);
  setState({ pending: ops.length });
}

/** Two ops target the same Sheet cells: the newer one replaces the older one in the queue. */
function sameTarget(a: Op, b: Op): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "weight":
      return b.type === "weight" && a.date === b.date;
    case "meal":
      return b.type === "meal" && a.date === b.date && a.meal === b.meal;
    case "workout":
      return b.type === "workout" && a.date === b.date && a.session === b.session;
    case "checkin":
      return false; // partial updates; keep each one
  }
}

let opsChain: Promise<unknown> = Promise.resolve();
/** Serializes outbox read-modify-write so rapid taps can't lose each other. */
function withOutbox<T>(fn: (ops: Op[]) => Promise<T>): Promise<T> {
  const next = opsChain.then(async () => fn(await readOutbox()));
  opsChain = next.catch(() => undefined);
  return next;
}

export type NewOp = Op extends infer T ? (T extends Op ? Omit<T, "id" | "at"> : never) : never;

export async function enqueue(change: NewOp): Promise<void> {
  const op = { ...change, id: crypto.randomUUID(), at: new Date().toISOString() } as Op;
  await withOutbox(async (ops) => {
    const kept = ops.filter((o) => !sameTarget(o, op));
    await writeOutbox([...kept, op]);
  });
  dataListeners.forEach((l) => l("local"));
  scheduleFlush();
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
/** Waits briefly so several quick taps go to the server in one request. */
function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 800);
}

export async function pendingOps(): Promise<Op[]> {
  return readOutbox();
}

let flushing: Promise<void> | null = null;

export function flush(): Promise<void> {
  if (flushing) return flushing;
  flushing = doFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function doFlush(): Promise<void> {
  let batch = (await readOutbox()).slice(0, MAX_OPS_PER_SYNC);
  while (batch.length > 0) {
    setState({ syncing: true });
    let results: OpResult[];
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops: batch }),
        credentials: "same-origin",
      });
      if (res.status === 401) {
        setState({ syncing: false, needsLogin: true });
        return;
      }
      if (!res.ok) throw new Error(`sync ${res.status}`);
      results = ((await res.json()) as { results: OpResult[] }).results;
      setState({ online: true, needsLogin: false });
    } catch {
      // Network down or server error: keep everything and retry later.
      setState({ syncing: false, online: typeof navigator === "undefined" ? false : navigator.onLine });
      return;
    }

    const done = new Set(results.filter((r) => r.status !== "error").map((r) => r.id));
    const problems = results
      .filter((r) => r.status === "invalid")
      .map((r) => ({ id: r.id, message: r.message ?? "Rejected by the server" }));
    if (problems.length && db) {
      const all = [...state.problems, ...problems].slice(-20);
      await set(PROBLEMS, all, db);
      setState({ problems: all });
    }

    await withOutbox(async (ops) => writeOutbox(ops.filter((o) => !done.has(o.id))));
    setState({ lastSyncedAt: new Date().toISOString() });
    dataListeners.forEach((l) => l("synced"));

    // Stop if the server kept failing some ops; they'll retry on the next trigger.
    if (results.some((r) => r.status === "error")) break;
    batch = (await readOutbox()).slice(0, MAX_OPS_PER_SYNC);
  }
  setState({ syncing: false });
}

export async function dismissProblems() {
  if (db) await del(PROBLEMS, db);
  setState({ problems: [] });
}

let started = false;
/** Call once on app start: restores state and sets up automatic retries. */
export async function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  setState({
    online: navigator.onLine,
    pending: (await readOutbox()).length,
    problems: (db && (await get<SyncState["problems"]>(PROBLEMS, db))) || [],
  });
  window.addEventListener("online", () => {
    setState({ online: true });
    void flush();
  });
  window.addEventListener("offline", () => setState({ online: false }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flush();
  });
  setInterval(() => void flush(), 60_000);
  void flush();
}

// ---------- Cached reads ----------

export class FetchError extends Error {
  constructor(public status: number, public code?: string, message?: string) {
    super(message ?? code ?? `HTTP ${status}`);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (res.status === 401) setState({ needsLogin: true });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new FetchError(res.status, body.error, body.message);
  }
  return (await res.json()) as T;
}

export async function cachedDay(date: string): Promise<DayData | undefined> {
  return db ? get<DayData>(`day:${date}`, db) : undefined;
}

export async function fetchDay(date: string): Promise<DayData> {
  const day = await getJson<DayData>(`/api/day?date=${encodeURIComponent(date)}`);
  if (db) await set(`day:${date}`, day, db);
  return day;
}

export async function cachedProgress(): Promise<ProgressData | undefined> {
  return db ? get<ProgressData>("progress", db) : undefined;
}

export async function fetchProgress(): Promise<ProgressData> {
  const progress = await getJson<ProgressData>("/api/progress");
  if (db) await set("progress", progress, db);
  return progress;
}

/** Applies queued, not-yet-synced changes on top of data loaded from the server or cache. */
export function overlayDay(day: DayData, ops: Op[]): DayData {
  const out: DayData = { ...day, meals: { ...day.meals } };
  for (const o of ops) {
    if (o.type === "weight" && o.date === day.date) {
      out.weightKg = o.weightKg;
      if (o.note !== undefined) out.note = o.note;
    } else if (o.type === "meal" && o.date === day.date) {
      out.meals[o.meal] = { done: o.done, topUp: o.topUp, updatedAt: o.at };
    } else if (o.type === "workout" && o.date === day.date) {
      out.workout = {
        session: o.session,
        completed: o.completed,
        minutes: o.minutes ?? null,
        avgHr: o.avgHr ?? null,
        activeKcal: o.activeKcal ?? null,
        effort: o.effort ?? null,
        notes: o.notes ?? "",
        updatedAt: o.at,
      };
    }
  }
  return out;
}

/** Applies queued workout changes to the progress data's workout list. */
export function overlayProgress(progress: ProgressData, ops: Op[]): ProgressData {
  // Progress cached by an older version of the app has no workouts list.
  const workouts = [...(progress.workouts ?? [])];
  for (const o of ops) {
    if (o.type !== "workout") continue;
    const entry = {
      date: o.date,
      session: o.session,
      completed: o.completed,
      minutes: o.minutes ?? null,
      effort: o.effort ?? null,
      notes: o.notes ?? "",
    };
    const i = workouts.findIndex((w) => w.date === o.date && w.session === o.session);
    if (i >= 0) workouts[i] = entry;
    else workouts.push(entry);
  }
  return { ...progress, workouts };
}

/** Wipes everything this app stored on the device (used on sign-out). */
export async function clearDevice() {
  if (db) await clear(db);
  if (typeof caches !== "undefined") {
    for (const key of await caches.keys()) await caches.delete(key);
  }
}
