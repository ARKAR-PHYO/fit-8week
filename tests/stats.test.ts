import { describe, expect, it } from "vitest";
import { bmi, elapsedPlanDays, scheduledSessions, sevenDayAverage, weeklyRate } from "@/lib/stats";

describe("stats", () => {
  it("averages only entries inside the trailing 7 days", () => {
    const avgs = sevenDayAverage([
      { date: "2026-11-02", weightKg: 96.6 },
      { date: "2026-11-03", weightKg: 96.0 },
      { date: "2026-11-09", weightKg: 95.0 },
      { date: "2026-11-10", weightKg: 94.8 },
    ]);
    expect(avgs[1].avg).toBe(96.3);
    expect(avgs[2].avg).toBe(95.5); // Nov 3..9 window: 96.0 and 95.0
    expect(avgs[3].avg).toBe(94.9); // Nov 4..10 window
  });

  it("matches the Sheet's BMI for the baseline", () => {
    expect(bmi(96.6, 170.6)).toBe(33.2);
  });

  it("counts elapsed days and sessions", () => {
    expect(elapsedPlanDays("2026-10-30")).toBe(0);
    expect(elapsedPlanDays("2026-11-02")).toBe(1);
    expect(elapsedPlanDays("2027-01-10")).toBe(56);
    expect(scheduledSessions("2026-11-08")).toBe(6);
    expect(scheduledSessions("2026-12-27")).toBe(48);
  });

  it("computes a weekly rate only after a week of data", () => {
    expect(weeklyRate([{ date: "2026-11-02", avg: 96.6 }, { date: "2026-11-05", avg: 96 }])).toBeNull();
    expect(weeklyRate([{ date: "2026-11-02", avg: 96.6 }, { date: "2026-11-16", avg: 95.4 }])).toBe(-0.6);
  });
});
