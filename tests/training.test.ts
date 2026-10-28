import { describe, expect, it } from "vitest";
import {
  composeNotes,
  dayStatus,
  embedUrl,
  hasPain,
  sessionSteps,
  targetMinutes,
  weekDates,
  weeklyChecklist,
  youtubeId,
} from "@/lib/training";
import { VIDEOS } from "@/content/workouts";
import type { WorkoutLogEntry } from "@/lib/types";

const log = (date: string, session: string, completed = true): WorkoutLogEntry => ({
  date,
  session,
  completed,
  minutes: null,
  effort: null,
  notes: "",
});

describe("weekDates", () => {
  it("weeks run Wednesday to Tuesday: week 1 is Oct 28 – Nov 3, week 8 ends Dec 22", () => {
    expect(weekDates(1)[0]).toEqual({ date: "2026-10-28", weekday: "wed" });
    expect(weekDates(1)[4]).toEqual({ date: "2026-11-01", weekday: "sun" });
    expect(weekDates(1)[6]).toEqual({ date: "2026-11-03", weekday: "tue" });
    expect(weekDates(8)[6].date).toBe("2026-12-22");
  });
});

describe("targetMinutes", () => {
  it("follows the plan's cardio progression", () => {
    expect(targetMinutes("cardio", 1)).toEqual([30, 40]);
    expect(targetMinutes("cardio", 3)).toEqual([35, 45]);
    expect(targetMinutes("cardio", 6)).toEqual([40, 50]);
    expect(targetMinutes("cardio", 8)).toEqual([45, 60]);
    expect(targetMinutes("long_cardio", 2)).toEqual([40, 50]);
    expect(targetMinutes("long_cardio", 7)).toEqual([45, 60]);
    expect(targetMinutes("strength", 3)).toBeNull();
  });
});

describe("dayStatus", () => {
  const today = "2026-11-04";
  it("marks done, missed, today, upcoming and rest", () => {
    const logs = [log("2026-11-02", "strength")];
    expect(dayStatus("2026-11-02", today, "strength", logs)).toBe("done");
    expect(dayStatus("2026-11-03", today, "cardio", logs)).toBe("missed");
    expect(dayStatus("2026-11-04", today, "strength", logs)).toBe("today");
    expect(dayStatus("2026-11-05", today, "mobility", logs)).toBe("upcoming");
    expect(dayStatus("2026-11-08", today, "rest", logs)).toBe("rest");
  });

  it("an unticked log is not done", () => {
    expect(dayStatus("2026-11-02", today, "strength", [log("2026-11-02", "strength", false)])).toBe("missed");
  });
});

describe("weeklyChecklist", () => {
  it("counts Friday toward both strength and HIIT", () => {
    // Week 1: Wed 28 Oct – Tue 3 Nov.
    const logs = [
      log("2026-10-28", "strength"),
      log("2026-10-29", "mobility"),
      log("2026-10-30", "strength_hiit"),
      log("2026-11-02", "strength"),
      log("2026-11-03", "cardio"),
      log("2026-11-07", "cardio"), // next week, ignored
    ];
    const c = Object.fromEntries(weeklyChecklist(1, logs, "2026-11-04").map((i) => [i.key, i]));
    expect(c.strength.done).toBe(3);
    expect(c.hiit.done).toBe(1);
    expect(c.cardio.done).toBe(1);
    expect(c.mobility.done).toBe(1);
    expect(c.rest.done).toBe(1);
  });

  it("rest day only counts once Sunday has come, and not if a hard session was logged", () => {
    expect(weeklyChecklist(1, [], "2026-10-31").find((i) => i.key === "rest")!.done).toBe(0);
    expect(weeklyChecklist(1, [], "2026-11-01").find((i) => i.key === "rest")!.done).toBe(1);
    const c = weeklyChecklist(1, [log("2026-11-01", "cardio")], "2026-11-02");
    expect(c.find((i) => i.key === "rest")!.done).toBe(0);
  });

  it("notes the higher HIIT allowance from week 5", () => {
    expect(weeklyChecklist(5, [], "2026-12-01").find((i) => i.key === "hiit")!.note).toBe("1–2 max");
  });
});

describe("videos", () => {
  it("extracts IDs and builds privacy-friendly embed URLs", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=5kOvFjM6128")).toBe("5kOvFjM6128");
    expect(youtubeId("https://youtu.be/abc123")).toBe("abc123");
    expect(youtubeId("not a url")).toBeNull();
    expect(embedUrl(VIDEOS.A)).toBe("https://www.youtube-nocookie.com/embed/5kOvFjM6128?playsinline=1&rel=0&modestbranding=1");
  });
});

describe("sessionSteps", () => {
  it("warms up before strength, not before cardio", () => {
    expect(sessionSteps("strength", 1).map((s) => s.kind)).toEqual(["warmup", "video", "cooldown", "log"]);
    expect(sessionSteps("cardio", 1).map((s) => s.kind)).toEqual(["timer", "cooldown", "log"]);
    expect(sessionSteps("rest", 1)).toEqual([]);
  });

  it("uses the week's cardio target", () => {
    const step = sessionSteps("cardio", 7)[0];
    expect(step.kind === "timer" && step.target).toEqual([45, 60]);
  });

  it("Friday is strength then the short HIIT", () => {
    const vids = sessionSteps("strength_hiit", 2).filter((s) => s.kind === "video");
    expect(vids.map((s) => s.kind === "video" && s.video)).toEqual(["A", "B"]);
  });
});

describe("notes", () => {
  it("flags pain at the start of the note", () => {
    expect(composeNotes(true, "lower back tight")).toBe("PAIN: lower back tight");
    expect(composeNotes(true, "  ")).toBe("PAIN reported");
    expect(composeNotes(false, " fine ")).toBe("fine");
    expect(hasPain("PAIN: knee")).toBe(true);
    expect(hasPain("no pain today")).toBe(false);
  });
});
