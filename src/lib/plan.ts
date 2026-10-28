/**
 * Plan calendar. All "what day is it" logic goes through this file so the
 * whole app agrees on dates. Dates are plain "YYYY-MM-DD" strings in the
 * plan time zone (Asia/Yangon), which is also how the Sheet stores them.
 */

export const PLAN_TIME_ZONE = "Asia/Yangon";
export const PLAN_START = "2026-10-28"; // Day 1, Wednesday: first workout + baseline tape measurements
export const DIET_START = "2026-10-29"; // Day 2: the meal plan starts the day after the first workout
export const PLAN_DAYS = 56; // 8 weeks, last day Tue 2026-12-22
export const FINAL_CHECKIN = "2026-12-23"; // Week 8 check-in, the Wednesday after Day 56
// Plan weeks run Wednesday to Tuesday. Menus and workouts still follow the weekday.

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function isIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toUtcMs(date: string): number {
  if (!isIsoDate(date)) throw new Error(`Invalid date: ${date}`);
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today's date in the plan time zone, regardless of the device's own zone. */
export function todayInPlanZone(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PLAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

export function weekdayOf(date: string): Weekday {
  // getUTCDay: 0 = Sunday ... 6 = Saturday
  const js = new Date(toUtcMs(date)).getUTCDay();
  return WEEKDAYS[(js + 6) % 7];
}

export type PlanPhase = "before" | "active" | "after";

export interface PlanDay {
  date: string;
  weekday: Weekday;
  phase: PlanPhase;
  /** 1..56 while active; clamped to the nearest plan day otherwise. */
  dayNumber: number;
  /** 1..8, derived from dayNumber. */
  week: number;
}

export function planDay(date: string): PlanDay {
  const offset = daysBetween(PLAN_START, date);
  const phase: PlanPhase = offset < 0 ? "before" : offset >= PLAN_DAYS ? "after" : "active";
  const dayNumber = Math.min(Math.max(offset + 1, 1), PLAN_DAYS);
  return {
    date,
    weekday: weekdayOf(date),
    phase,
    dayNumber,
    week: Math.ceil(dayNumber / 7),
  };
}

/** Dates on which the app accepts daily logs: Day 1 through the final check-in. */
export function isLoggableDate(date: string): boolean {
  if (!isIsoDate(date)) return false;
  return daysBetween(PLAN_START, date) >= 0 && daysBetween(date, FINAL_CHECKIN) >= 0;
}

/** Weekly check-ins: 0 = Baseline (Day 1), 1..8 = the same weekday each following week. */
export const CHECKIN_WEEKS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
export type CheckinWeek = (typeof CHECKIN_WEEKS)[number];

export function checkinDate(week: number): string {
  return addDays(PLAN_START, week * 7);
}

export function checkinLabel(week: number): string {
  return week === 0 ? "Baseline" : `Week ${week}`;
}

/** The check-in week for a date, or null if the date is not a check-in day. */
export function checkinWeekForDate(date: string): CheckinWeek | null {
  const offset = daysBetween(PLAN_START, date);
  if (offset < 0 || offset % 7 !== 0) return null;
  const week = offset / 7;
  return week <= 8 ? (week as CheckinWeek) : null;
}

export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(toUtcMs(date)));
}
