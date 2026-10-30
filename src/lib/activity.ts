/**
 * Apple Watch / Apple Health activity sent by the iPhone Shortcut to /api/ingest/activity.
 *
 * Shortcuts is loose about types: a number can arrive as a JSON number or as text, sometimes
 * with a comma decimal separator. Numbers are accepted in both forms and range-checked.
 * Workout times arrive as ISO 8601 with an offset and are stored as plan-zone (Yangon) local
 * date and time, so the Sheet reads the way the watch shows it.
 */
import { z } from "zod";
import { FINAL_CHECKIN, isLoggableDate, PLAN_START, PLAN_TIME_ZONE } from "@/lib/plan";

const planDate = z.string().refine(isLoggableDate, `Date must be a real date from ${PLAN_START} to ${FINAL_CHECKIN}`);

/** A number, or numeric text such as "720.2" or "720,2". Empty text and null mean "not sent". */
function num(min: number, max: number) {
  return z.preprocess(
    (v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === "string") {
        const t = v.trim().replace(",", ".");
        return t === "" ? null : Number(t);
      }
      return v;
    },
    z.number().finite().min(min).max(max).nullable(),
  ).optional();
}

const round = (v: number | null | undefined, digits: number): number | "" =>
  v === null || v === undefined ? "" : Math.round(v * 10 ** digits) / 10 ** digits;

export const watchWorkout = z.object({
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }).optional(),
  type: z.string().trim().min(1).max(60),
  minutes: num(0, 600),
  activeKcal: num(0, 5000),
  avgHr: num(30, 230),
  maxHr: num(30, 240),
  distanceKm: num(0, 300),
});

export const activityPayload = z.object({
  date: planDate,
  activeKcal: num(0, 10000),
  exerciseMin: num(0, 1440),
  steps: num(0, 200000),
  distanceKm: num(0, 300),
  restingHr: num(25, 200),
  workouts: z.array(watchWorkout).max(20).default([]),
}).superRefine((p, ctx) => {
  p.workouts.forEach((w, i) => {
    // An unparseable start is already reported by the field check; don't format it.
    if (Number.isNaN(Date.parse(w.start))) return;
    if (!isLoggableDate(toPlanLocal(w.start).date)) {
      ctx.addIssue({ code: "custom", path: ["workouts", i, "start"], message: "Workout is outside the plan dates" });
    }
  });
});

export type ActivityPayload = z.infer<typeof activityPayload>;
export type WatchWorkout = z.infer<typeof watchWorkout>;

/** Splits an ISO instant into plan-zone local date ("2026-10-28") and time ("19:00:07"). */
export function toPlanLocal(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}:${get("second")}` };
}

/** Values as they are written to the Sheet: rounded, blanks for anything not sent. */
export function dailyCells(p: ActivityPayload) {
  return {
    activeKcal: round(p.activeKcal, 0),
    exerciseMin: round(p.exerciseMin, 0),
    steps: round(p.steps, 0),
    distanceKm: round(p.distanceKm, 2),
    restingHr: round(p.restingHr, 0),
  };
}

export function workoutCells(w: WatchWorkout) {
  const start = toPlanLocal(w.start);
  let minutes = w.minutes;
  if ((minutes === null || minutes === undefined) && w.end) {
    minutes = (Date.parse(w.end) - Date.parse(w.start)) / 60000;
  }
  return {
    date: start.date,
    start: start.time,
    end: w.end ? toPlanLocal(w.end).time : "",
    type: w.type,
    minutes: round(minutes, 1),
    activeKcal: round(w.activeKcal, 0),
    avgHr: round(w.avgHr, 0),
    maxHr: round(w.maxHr, 0),
    distanceKm: round(w.distanceKm, 2),
  };
}
