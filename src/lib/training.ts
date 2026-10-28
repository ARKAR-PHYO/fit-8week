/**
 * Workout logic shared by the week view and the guided session: which dates belong to a plan
 * week, the target minutes for timed sessions, each day's status, the weekly checklist from the
 * workout plan, and the steps of a guided session. Pure functions, unit-tested.
 */
import { SCHEDULE, VIDEOS, WARM_UP, type SessionId, type Video } from "@/content/workouts";
import { addDays, PLAN_START, weekdayOf, type Weekday } from "@/lib/plan";
import type { WorkoutLogEntry } from "@/lib/types";

export const PLAN_WEEKS = 8;

/** The 7 dates of plan week 1–8, in order. Weeks start on the plan's first weekday, not Monday. */
export function weekDates(week: number): { date: string; weekday: Weekday }[] {
  const first = addDays(PLAN_START, (week - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(first, i);
    return { date, weekday: weekdayOf(date) };
  });
}

/** Target minutes for sessions measured by time, from the workout plan's weekly progression. */
export function targetMinutes(session: SessionId, week: number): [number, number] | null {
  if (session === "cardio") {
    if (week <= 2) return [30, 40];
    if (week <= 4) return [35, 45];
    if (week <= 6) return [40, 50];
    return [45, 60];
  }
  if (session === "long_cardio") {
    if (week <= 2) return [40, 50];
    if (week <= 4) return [45, 55];
    return [45, 60];
  }
  if (session === "mobility") return [20, 30]; // the easy walk after Video D
  return null;
}

export type DayStatus = "done" | "missed" | "today" | "upcoming" | "rest";

export function findLog(logs: WorkoutLogEntry[], date: string, session: SessionId): WorkoutLogEntry | undefined {
  return logs.find((l) => l.date === date && l.session === session);
}

export function dayStatus(date: string, today: string, session: SessionId, logs: WorkoutLogEntry[]): DayStatus {
  if (session === "rest") return "rest";
  if (findLog(logs, date, session)?.completed) return "done";
  if (date === today) return "today";
  return date < today ? "missed" : "upcoming";
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: number;
  target: number;
  /** Shown instead of done/target when the item isn't counted, e.g. "1–2". */
  note?: string;
}

/**
 * The workout plan's weekly checklist, filled from the log:
 * strength 3 (Mon, Wed and Fri's strength part), cardio 2 (Tue, Sat), HIIT 1 (Fri),
 * mobility 1 (Thu), and at least one full rest day.
 */
export function weeklyChecklist(week: number, logs: WorkoutLogEntry[], today: string): ChecklistItem[] {
  const dates = new Set(weekDates(week).map((d) => d.date));
  const done = (sessions: SessionId[]) =>
    logs.filter((l) => dates.has(l.date) && l.completed && sessions.includes(l.session as SessionId)).length;
  const sunday = weekDates(week).find((d) => d.weekday === "sun")!.date;
  const sundayHard = logs.some((l) => l.date === sunday && l.completed && l.session !== "rest");

  return [
    { key: "strength", label: "Strength", done: done(["strength", "strength_hiit"]), target: 3 },
    { key: "cardio", label: "Cardio", done: done(["cardio", "long_cardio"]), target: 2 },
    {
      key: "hiit",
      label: "Low-impact HIIT",
      done: done(["strength_hiit"]),
      target: 1,
      note: week >= 5 ? "1–2 max" : undefined,
    },
    { key: "mobility", label: "Mobility", done: done(["mobility"]), target: 1 },
    { key: "rest", label: "Full rest day", done: sunday <= today && !sundayHard ? 1 : 0, target: 1 },
  ];
}

/** "https://www.youtube.com/watch?v=ID" → "ID". */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

export function embedUrl(video: Video): string | null {
  const id = youtubeId(video.url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1` : null;
}

// ---------- Guided session ----------

export interface TimedStep {
  label: string;
  /** Countdown length; steps without seconds are reps you tick off. */
  seconds?: number;
}

/** The warm-up from the plan, with the timed parts as countdowns. */
export const WARM_UP_STEPS: TimedStep[] = [
  { label: WARM_UP[0], seconds: 60 },
  { label: WARM_UP[1], seconds: 60 },
  { label: WARM_UP[2], seconds: 60 },
  { label: WARM_UP[3] },
  { label: WARM_UP[4] },
  { label: WARM_UP[5] },
  { label: WARM_UP[6], seconds: 60 },
];

export const COOL_DOWN_STEPS: TimedStep[] = [
  { label: "Slow walking or marching", seconds: 120 },
  { label: "Gentle calf stretch, each side", seconds: 30 },
  { label: "Gentle quadriceps stretch, each side", seconds: 30 },
  { label: "Hip-flexor stretch, each side", seconds: 30 },
  { label: "Chest and shoulder opening", seconds: 30 },
  { label: "Relaxed breathing", seconds: 30 },
];

export type SessionStep =
  | { kind: "warmup" }
  | { kind: "video"; video: Video["id"]; note?: string }
  | { kind: "timer"; label: string; target: [number, number] }
  | { kind: "cooldown" }
  | { kind: "log" };

/** Steps for a day's session. The plan asks for a warm-up before strength or HIIT only. */
export function sessionSteps(session: SessionId, week: number): SessionStep[] {
  switch (session) {
    case "strength":
      return [{ kind: "warmup" }, { kind: "video", video: "A" }, { kind: "cooldown" }, { kind: "log" }];
    case "strength_hiit":
      return [
        { kind: "warmup" },
        { kind: "video", video: "A", note: week <= 3 ? "20–30 min is enough this week." : undefined },
        week >= 4
          ? { kind: "video", video: "B", note: "Or swap in Video C when recovery is good. Never stack A + B + C." }
          : { kind: "video", video: "B", note: "Once only. Don't repeat it." },
        { kind: "cooldown" },
        { kind: "log" },
      ];
    case "cardio":
    case "long_cardio":
      return [
        { kind: "timer", label: SCHEDULE[session === "cardio" ? "tue" : "sat"].title, target: targetMinutes(session, week)! },
        { kind: "cooldown" },
        { kind: "log" },
      ];
    case "mobility":
      return [
        { kind: "video", video: "D", note: "Move slowly. Don't chase a deep stretch." },
        { kind: "timer", label: "Easy walk, if comfortable", target: targetMinutes("mobility", week)! },
        { kind: "log" },
      ];
    case "rest":
      return [];
  }
}

export const STEP_LABELS: Record<SessionStep["kind"], string> = {
  warmup: "Warm-up",
  video: "Workout",
  timer: "Workout",
  cooldown: "Cool-down",
  log: "Log it",
};

/** Notes column text: a pain flag first, so it's easy to spot in the Sheet. */
export function composeNotes(pain: boolean, notes: string): string {
  const trimmed = notes.trim();
  if (!pain) return trimmed.slice(0, 300);
  return (trimmed ? `PAIN: ${trimmed}` : "PAIN reported").slice(0, 300);
}

export function hasPain(notes: string): boolean {
  return /^PAIN\b/.test(notes);
}

export { VIDEOS };
