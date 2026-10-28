import { describe, expect, it } from "vitest";
import {
  addDays,
  checkinDate,
  checkinLabel,
  checkinWeekForDate,
  isIsoDate,
  isLoggableDate,
  planDay,
  todayInPlanZone,
  weekdayOf,
} from "@/lib/plan";

describe("planDay", () => {
  it("Oct 28 is Day 1, Week 1, Wednesday", () => {
    expect(planDay("2026-10-28")).toMatchObject({ dayNumber: 1, week: 1, weekday: "wed", phase: "active" });
  });

  it("Nov 3 is Day 7, still Week 1, Tuesday", () => {
    expect(planDay("2026-11-03")).toMatchObject({ dayNumber: 7, week: 1, weekday: "tue" });
  });

  it("Nov 4 starts Week 2", () => {
    expect(planDay("2026-11-04")).toMatchObject({ dayNumber: 8, week: 2, weekday: "wed" });
  });

  it("Dec 22 is Day 56, Week 8, the last active day", () => {
    expect(planDay("2026-12-22")).toMatchObject({ dayNumber: 56, week: 8, weekday: "tue", phase: "active" });
  });

  it("Dec 23 is after the plan", () => {
    expect(planDay("2026-12-23").phase).toBe("after");
  });

  it("before the start is clamped to Day 1", () => {
    expect(planDay("2026-10-20")).toMatchObject({ phase: "before", dayNumber: 1, week: 1 });
  });
});

describe("todayInPlanZone", () => {
  it("uses Yangon time, not UTC: 18:00 UTC Nov 1 is already Nov 2 in Yangon", () => {
    expect(todayInPlanZone(new Date("2026-11-01T18:00:00Z"))).toBe("2026-11-02");
  });

  it("17:29 UTC is still the previous day in Yangon (UTC+6:30)", () => {
    expect(todayInPlanZone(new Date("2026-11-01T17:29:00Z"))).toBe("2026-11-01");
  });
});

describe("dates", () => {
  it("validates real calendar dates only", () => {
    expect(isIsoDate("2026-11-02")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-11-2")).toBe(false);
    expect(isIsoDate("02/11/2026")).toBe(false);
  });

  it("adds days across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-27", 1)).toBe("2026-12-28");
  });

  it("knows weekdays", () => {
    expect(weekdayOf("2026-12-25")).toBe("fri");
  });

  it("accepts logs from Oct 28 through Dec 23 only", () => {
    expect(isLoggableDate("2026-10-27")).toBe(false);
    expect(isLoggableDate("2026-10-28")).toBe(true);
    expect(isLoggableDate("2026-12-23")).toBe(true);
    expect(isLoggableDate("2026-12-24")).toBe(false);
  });
});

describe("check-ins", () => {
  it("maps weeks to Wednesday check-in dates and labels", () => {
    expect(checkinDate(0)).toBe("2026-10-28");
    expect(checkinDate(1)).toBe("2026-11-04");
    expect(checkinDate(8)).toBe("2026-12-23");
    expect(checkinLabel(0)).toBe("Baseline");
    expect(checkinLabel(3)).toBe("Week 3");
  });

  it("finds the check-in week for a check-in Wednesday", () => {
    expect(checkinWeekForDate("2026-10-28")).toBe(0);
    expect(checkinWeekForDate("2026-11-11")).toBe(2);
    expect(checkinWeekForDate("2026-12-23")).toBe(8);
    expect(checkinWeekForDate("2026-11-02")).toBeNull();
    expect(checkinWeekForDate("2026-12-30")).toBeNull();
  });
});
