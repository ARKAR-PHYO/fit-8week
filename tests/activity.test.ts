import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activityPayload, toPlanLocal } from "@/lib/activity";
import { checkIngestToken } from "@/server/ingest";
import { applyActivity } from "@/server/sheets/repo";
import { SheetStructureError } from "@/server/sheets/schema";
import { FakeGateway, trackerFixture } from "./fake-gateway";

const TOKEN = "a".repeat(20) + "B7xQ9mK2pL4vN8sR1tY6wZ3c"; // 44 chars

/** Oct 28: the three treadmill parts from the Apple Health export. */
const oct28 = {
  date: "2026-10-28",
  activeKcal: 720.235,
  exerciseMin: 49,
  steps: 13910,
  distanceKm: 9.0,
  restingHr: 66,
  workouts: [
    { start: "2026-10-28T19:00:07+06:30", end: "2026-10-28T19:12:37+06:30", type: "Running", minutes: 12.49, activeKcal: 106.4, avgHr: 146.9, maxHr: 174, distanceKm: 0.87 },
    { start: "2026-10-28T19:14:13+06:30", end: "2026-10-28T19:27:04+06:30", type: "Running", minutes: 12.85, activeKcal: 99.9, avgHr: 149.6, maxHr: 177, distanceKm: 0.685 },
  ],
};

const parse = (v: unknown) => activityPayload.parse(v);
const tab = (gw: FakeGateway, name: string) => gw.tabs.get(name)!;

describe("ingest token", () => {
  it("is off when INGEST_TOKEN is missing or too short", () => {
    expect(checkIngestToken(`Bearer ${TOKEN}`, undefined)).toBe("disabled");
    expect(checkIngestToken(`Bearer short`, "short")).toBe("disabled");
  });

  it("accepts only the exact bearer token", () => {
    expect(checkIngestToken(`Bearer ${TOKEN}`, TOKEN)).toBe("ok");
    expect(checkIngestToken(`bearer ${TOKEN}`, TOKEN)).toBe("ok");
    expect(checkIngestToken(`Bearer ${TOKEN}x`, TOKEN)).toBe("unauthorized");
    expect(checkIngestToken(`Bearer ${TOKEN.slice(0, -1)}`, TOKEN)).toBe("unauthorized");
    expect(checkIngestToken(TOKEN, TOKEN)).toBe("unauthorized");
    expect(checkIngestToken(null, TOKEN)).toBe("unauthorized");
    expect(checkIngestToken("Basic abc", TOKEN)).toBe("unauthorized");
  });
});

describe("activity payload", () => {
  it("accepts numbers sent as text, including comma decimals", () => {
    const p = parse({ date: "2026-10-30", activeKcal: "720,2", steps: "13910", exerciseMin: "" });
    expect(p.activeKcal).toBe(720.2);
    expect(p.steps).toBe(13910);
    expect(p.exerciseMin).toBeNull();
    expect(p.workouts).toEqual([]);
  });

  it("rejects dates outside the plan, bad numbers and bad times", () => {
    expect(activityPayload.safeParse({ date: "2026-10-27" }).success).toBe(false);
    expect(activityPayload.safeParse({ date: "2026-12-24" }).success).toBe(false);
    expect(activityPayload.safeParse({ date: "2026-10-30", steps: -1 }).success).toBe(false);
    expect(activityPayload.safeParse({ date: "2026-10-30", steps: "lots" }).success).toBe(false);
    expect(activityPayload.safeParse({ date: "2026-10-30", workouts: [{ start: "yesterday", type: "Run" }] }).success).toBe(false);
    expect(
      activityPayload.safeParse({ date: "2026-10-30", workouts: [{ start: "2026-10-20T19:00:00+06:30", type: "Run" }] }).success,
    ).toBe(false);
  });

  it("converts workout times to Yangon local time", () => {
    expect(toPlanLocal("2026-10-28T12:30:07Z")).toEqual({ date: "2026-10-28", time: "19:00:07" });
    expect(toPlanLocal("2026-10-28T18:00:00Z")).toEqual({ date: "2026-10-29", time: "00:30:00" });
  });
});

describe("applyActivity", () => {
  it("writes the day's totals and each workout, rounded, in Yangon time", async () => {
    const gw = new FakeGateway(trackerFixture());
    const res = await applyActivity(gw, parse(oct28), "2026-10-28T16:00:00.000Z");
    expect(res).toEqual({ daily: "ok", workouts: 2 });
    expect(tab(gw, "Daily Activity")[1]).toEqual(["2026-10-28", "Apple Health", 720, 49, 13910, 9, 66, "2026-10-28T16:00:00.000Z"]);
    expect(tab(gw, "Watch Workouts").slice(1)).toEqual([
      ["2026-10-28", "19:00:07", "19:12:37", "Running", 12.5, 106, 147, 174, 0.87, "Apple Health", "2026-10-28T16:00:00.000Z"],
      ["2026-10-28", "19:14:13", "19:27:04", "Running", 12.9, 100, 150, 177, 0.69, "Apple Health", "2026-10-28T16:00:00.000Z"],
    ]);
  });

  it("is idempotent: sending the same day again updates the same rows", async () => {
    const gw = new FakeGateway(trackerFixture());
    await applyActivity(gw, parse(oct28), "2026-10-28T16:00:00.000Z");
    await applyActivity(gw, parse({ ...oct28, activeKcal: 800 }), "2026-10-28T17:00:00.000Z");
    expect(tab(gw, "Daily Activity")).toHaveLength(2);
    expect(tab(gw, "Daily Activity")[1][2]).toBe(800);
    expect(tab(gw, "Watch Workouts")).toHaveLength(3);
  });

  it("adds a workout that wasn't there on an earlier run", async () => {
    const gw = new FakeGateway(trackerFixture());
    await applyActivity(gw, parse({ ...oct28, workouts: oct28.workouts.slice(0, 1) }), "2026-10-28T13:00:00.000Z");
    await applyActivity(gw, parse(oct28), "2026-10-28T16:00:00.000Z");
    expect(tab(gw, "Watch Workouts")).toHaveLength(3);
  });

  it("works out minutes from start and end when minutes aren't sent", async () => {
    const gw = new FakeGateway(trackerFixture());
    const w = { start: "2026-10-30T19:00:00+06:30", end: "2026-10-30T19:36:30+06:30", type: "Walking" };
    await applyActivity(gw, parse({ date: "2026-10-30", workouts: [w] }), "2026-10-30T16:00:00.000Z");
    expect(tab(gw, "Watch Workouts")[1].slice(0, 5)).toEqual(["2026-10-30", "19:00:00", "19:36:30", "Walking", 36.5]);
  });

  it("never touches the plan's own logs", async () => {
    const gw = new FakeGateway(trackerFixture());
    const before = JSON.stringify(["Daily Weight", "Weekly Measurements", "Meal Log", "Workout Log", "Dashboard"].map((n) => tab(gw, n)));
    await applyActivity(gw, parse(oct28));
    const after = JSON.stringify(["Daily Weight", "Weekly Measurements", "Meal Log", "Workout Log", "Dashboard"].map((n) => tab(gw, n)));
    expect(after).toBe(before);
  });

  it("stops with a clear error if a tab's headers don't match", async () => {
    const fixture = trackerFixture();
    fixture["Daily Activity"] = [["Date", "Source", "Kcal"]];
    await expect(applyActivity(new FakeGateway(fixture), parse(oct28))).rejects.toBeInstanceOf(SheetStructureError);
  });
});

describe("proxy matcher", () => {
  // Next requires the matcher to be a literal in proxy.ts, so read it from the source.
  const source = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  const matcher = /matcher:\s*\[[\s\S]*?"(\/\(\(\?![^"]+)"/.exec(source)![1];
  const guarded = (path: string) => new RegExp(`^${matcher}$`).test(path);

  it("lets only the ingest endpoint skip Google sign-in among API routes", () => {
    expect(guarded("/api/ingest/activity")).toBe(false);
    expect(guarded("/api/sync")).toBe(true);
    expect(guarded("/api/day")).toBe(true);
    expect(guarded("/api/progress")).toBe(true);
    expect(guarded("/api/ingestx")).toBe(true);
    expect(guarded("/api/ingest")).toBe(true);
    expect(guarded("/today")).toBe(true);
  });
});
