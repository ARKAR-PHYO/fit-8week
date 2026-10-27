import { addDays, daysBetween, PLAN_DAYS, PLAN_START, weekdayOf } from "@/lib/plan";

export interface WeightPoint {
  date: string;
  weightKg: number;
}

/** Trailing 7-day average for each logged day, over the entries that exist in that window. */
export function sevenDayAverage(points: WeightPoint[]): { date: string; avg: number }[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p) => {
    const windowStart = addDays(p.date, -6);
    const inWindow = sorted.filter((q) => q.date >= windowStart && q.date <= p.date);
    const avg = inWindow.reduce((s, q) => s + q.weightKg, 0) / inWindow.length;
    return { date: p.date, avg: Math.round(avg * 100) / 100 };
  });
}

export function bmi(weightKg: number, heightCm: number): number {
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
}

/** Plan days that have fully passed or are today, capped to the plan length. */
export function elapsedPlanDays(today: string): number {
  return Math.min(Math.max(daysBetween(PLAN_START, today) + 1, 0), PLAN_DAYS);
}

/** Training sessions scheduled so far (every day except Sunday rest). */
export function scheduledSessions(today: string): number {
  let n = 0;
  for (let i = 0; i < elapsedPlanDays(today); i++) {
    if (weekdayOf(addDays(PLAN_START, i)) !== "sun") n++;
  }
  return n;
}

/** Average weekly change, from the first to the latest 7-day average. */
export function weeklyRate(avgs: { date: string; avg: number }[]): number | null {
  if (avgs.length < 2) return null;
  const first = avgs[0];
  const last = avgs[avgs.length - 1];
  const days = daysBetween(first.date, last.date);
  if (days < 7) return null;
  return Math.round(((last.avg - first.avg) / days) * 7 * 100) / 100;
}
