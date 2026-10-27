import { describe, expect, it } from "vitest";
import type { Op } from "@/lib/ops";
import { op as opSchema } from "@/lib/ops";
import { applyOp, getDay, getProgress } from "@/server/sheets/repo";
import { SheetStructureError } from "@/server/sheets/schema";
import { FakeGateway, trackerFixture } from "./fake-gateway";

const uuid = () => crypto.randomUUID();

function sheet() {
  return new FakeGateway(trackerFixture());
}

describe("weight", () => {
  it("writes only the Weight cell of the matching date row and leaves formulas alone", async () => {
    const gw = sheet();
    await applyOp(gw, { id: uuid(), at: "2026-11-05T01:00:00.000Z", type: "weight", date: "2026-11-05", weightKg: 95.8 });
    const row = gw.tabs.get("Daily Weight")![4];
    expect(row).toEqual(["2026-11-05", 95.8, "=formula", "=formula", "=formula", ""]);
    expect(gw.calls.append).toBe(0);
  });

  it("is idempotent: the same op twice leaves one value", async () => {
    const gw = sheet();
    const o: Op = { id: uuid(), at: "2026-11-05T01:00:00.000Z", type: "weight", date: "2026-11-05", weightKg: 95.8 };
    await applyOp(gw, o);
    await applyOp(gw, o);
    expect((await getDay(gw, "2026-11-05")).weightKg).toBe(95.8);
    expect(gw.tabs.get("Daily Weight")!.length).toBe(58);
  });

  it("null clears the entry", async () => {
    const gw = sheet();
    await applyOp(gw, { id: uuid(), at: "2026-11-02T01:00:00.000Z", type: "weight", date: "2026-11-02", weightKg: null });
    expect((await getDay(gw, "2026-11-02")).weightKg).toBeNull();
  });

  it("refuses to append when the date row is missing", async () => {
    const gw = sheet();
    gw.tabs.get("Daily Weight")!.pop(); // drop Dec 28
    await expect(
      applyOp(gw, { id: uuid(), at: "2026-12-28T01:00:00.000Z", type: "weight", date: "2026-12-28", weightKg: 92 }),
    ).rejects.toBeInstanceOf(SheetStructureError);
  });

  it("still finds a date that Sheets converted to a date serial", async () => {
    const gw = sheet();
    gw.tabs.get("Daily Weight")![2][0] = 46329; // 2026-11-03 as a Sheets serial
    await applyOp(gw, { id: uuid(), at: "2026-11-03T01:00:00.000Z", type: "weight", date: "2026-11-03", weightKg: 96.1 });
    expect(gw.tabs.get("Daily Weight")![2][1]).toBe(96.1);
  });
});

describe("meal and workout logs", () => {
  it("appends once, then updates the same row", async () => {
    const gw = sheet();
    const base = { type: "meal", date: "2026-11-03", meal: "lunch", topUp: false } as const;
    await applyOp(gw, { ...base, id: uuid(), at: "2026-11-03T05:00:00.000Z", done: true });
    await applyOp(gw, { ...base, id: uuid(), at: "2026-11-03T05:01:00.000Z", done: true, topUp: true });
    const log = gw.tabs.get("Meal Log")!;
    expect(log.length).toBe(2);
    expect(log[1]).toEqual(["2026-11-03", "lunch", true, true, "2026-11-03T05:01:00.000Z"]);
  });

  it("drops a stale change from another device", async () => {
    const gw = sheet();
    const base = { type: "meal", date: "2026-11-03", meal: "dinner", topUp: false } as const;
    await applyOp(gw, { ...base, id: uuid(), at: "2026-11-03T14:00:00.000Z", done: true });
    const status = await applyOp(gw, { ...base, id: uuid(), at: "2026-11-03T13:00:00.000Z", done: false });
    expect(status).toBe("stale");
    expect((await getDay(gw, "2026-11-03")).meals.dinner.done).toBe(true);
  });

  it("reads the newest of duplicate rows", async () => {
    const gw = sheet();
    const log = gw.tabs.get("Meal Log")!;
    log.push(["2026-11-04", "breakfast", true, false, "2026-11-04T02:00:00.000Z"]);
    log.push(["2026-11-04", "breakfast", false, false, "2026-11-04T01:00:00.000Z"]);
    expect((await getDay(gw, "2026-11-04")).meals.breakfast.done).toBe(true);
  });

  it("stores workouts by date and session", async () => {
    const gw = sheet();
    await applyOp(gw, {
      id: uuid(), at: "2026-11-02T13:00:00.000Z", type: "workout", date: "2026-11-02",
      session: "strength", completed: true, minutes: 42, avgHr: 128, activeKcal: 310, effort: 6, notes: "felt fine",
    });
    const day = await getDay(gw, "2026-11-02");
    expect(day.workout).toMatchObject({ session: "strength", completed: true, minutes: 42, effort: 6 });
  });

  it("writes text that looks like a formula as plain text (RAW), not a formula", async () => {
    const gw = sheet();
    await applyOp(gw, {
      id: uuid(), at: "2026-11-02T13:00:00.000Z", type: "workout", date: "2026-11-02",
      session: "strength", completed: true, notes: "=IMPORTXML(1)",
    });
    expect(gw.tabs.get("Workout Log")![1][7]).toBe("=IMPORTXML(1)");
  });
});

describe("check-ins", () => {
  it("writes only the fields provided, by header name", async () => {
    const gw = sheet();
    await applyOp(gw, { id: uuid(), at: "2026-11-09T01:00:00.000Z", type: "checkin", week: 1, weightKg: 95.4, waistCm: 108 });
    const row = gw.tabs.get("Weekly Measurements")![2];
    expect(row[0]).toBe("Week 1");
    expect(row[2]).toBe(95.4);
    expect(row[3]).toBe(108);
    expect(row[4] ?? "").toBe("");
  });
});

describe("Navy body fat estimate", () => {
  const navyCol = 16; // "Body Fat % (Navy est.)", after Notes

  it("is calculated on save from waist, neck and the Dashboard height", async () => {
    const gw = sheet();
    await applyOp(gw, { id: uuid(), at: "2026-11-02T01:00:00.000Z", type: "checkin", week: 0, waistCm: 109, neckCm: 42 });
    expect(gw.tabs.get("Weekly Measurements")![1][navyCol]).toBe(31);
    const p = await getProgress(gw);
    expect(p.checkins[0].bodyFatNavyPct).toBe(31);
  });

  it("uses the neck already in the Sheet when only the waist changes", async () => {
    const gw = sheet();
    await applyOp(gw, { id: uuid(), at: "2026-11-09T01:00:00.000Z", type: "checkin", week: 1, neckCm: 42 });
    await applyOp(gw, { id: uuid(), at: "2026-11-09T01:05:00.000Z", type: "checkin", week: 1, waistCm: 105 });
    expect(gw.tabs.get("Weekly Measurements")![2][navyCol]).toBe(28.7);
  });

  it("clears the estimate instead of leaving a stale one when an input is removed", async () => {
    const gw = sheet();
    await applyOp(gw, { id: uuid(), at: "2026-11-02T01:00:00.000Z", type: "checkin", week: 0, waistCm: 109, neckCm: 42 });
    await applyOp(gw, { id: uuid(), at: "2026-11-02T01:05:00.000Z", type: "checkin", week: 0, neckCm: null });
    expect(gw.tabs.get("Weekly Measurements")![1][navyCol]).toBe("");
  });

  it("leaves the manual Body Fat % column alone", async () => {
    const gw = sheet();
    await applyOp(gw, { id: uuid(), at: "2026-11-02T01:00:00.000Z", type: "checkin", week: 0, bodyFatPct: 29.5 });
    await applyOp(gw, { id: uuid(), at: "2026-11-02T01:05:00.000Z", type: "checkin", week: 0, waistCm: 109, neckCm: 42 });
    const row = gw.tabs.get("Weekly Measurements")![1];
    expect(row[11]).toBe(29.5);
    expect(row[navyCol]).toBe(31);
  });

  it("does not touch the estimate when waist and neck are not part of the save", async () => {
    const gw = sheet();
    await applyOp(gw, { id: uuid(), at: "2026-11-02T01:00:00.000Z", type: "checkin", week: 0, waistCm: 109, neckCm: 42 });
    await applyOp(gw, { id: uuid(), at: "2026-11-02T01:05:00.000Z", type: "checkin", week: 0, chestCm: 112 });
    expect(gw.tabs.get("Weekly Measurements")![1][navyCol]).toBe(31);
  });
});

describe("structure checks", () => {
  it("fails loudly if a header is renamed", async () => {
    const gw = sheet();
    gw.tabs.get("Meal Log")![0][2] = "Completed?";
    await expect(
      applyOp(gw, { id: uuid(), at: "2026-11-03T05:00:00.000Z", type: "meal", date: "2026-11-03", meal: "lunch", done: true, topUp: false }),
    ).rejects.toThrow(/missing column\(s\): Done/);
  });
});

describe("progress", () => {
  it("reads settings from the Dashboard by label and counts latest states", async () => {
    const gw = sheet();
    await applyOp(gw, { id: uuid(), at: "2026-11-03T01:00:00.000Z", type: "weight", date: "2026-11-03", weightKg: 96.0 });
    await applyOp(gw, { id: uuid(), at: "2026-11-03T05:00:00.000Z", type: "meal", date: "2026-11-03", meal: "lunch", done: true, topUp: true });
    await applyOp(gw, { id: uuid(), at: "2026-11-03T06:00:00.000Z", type: "meal", date: "2026-11-03", meal: "lunch", done: true, topUp: true });
    const p = await getProgress(gw);
    expect(p.settings).toEqual({ startWeightKg: 96.6, heightCm: 170.6, targetKg: 91.5, milestoneKg: 87.3 });
    expect(p.weights).toEqual([
      { date: "2026-11-02", weightKg: 96.6 },
      { date: "2026-11-03", weightKg: 96 },
    ]);
    expect(p.mealsDone).toBe(1);
    expect(p.topUpsDone).toBe(1);
    expect(p.checkins[0]).toMatchObject({ label: "Baseline", date: "2026-11-02" });
  });
});

describe("progress workouts list", () => {
  it("returns the latest state of each logged session, oldest first", async () => {
    const gw = sheet();
    const base = { type: "workout", session: "strength" } as const;
    await applyOp(gw, { ...base, id: uuid(), at: "2026-11-04T13:00:00.000Z", date: "2026-11-04", completed: true, minutes: 40, effort: 6 });
    await applyOp(gw, { ...base, id: uuid(), at: "2026-11-02T13:00:00.000Z", date: "2026-11-02", completed: false });
    await applyOp(gw, { ...base, id: uuid(), at: "2026-11-02T14:00:00.000Z", date: "2026-11-02", completed: true, notes: "PAIN: knee" });
    const p = await getProgress(gw);
    expect(p.workouts).toEqual([
      { date: "2026-11-02", session: "strength", completed: true, minutes: null, effort: null, notes: "PAIN: knee" },
      { date: "2026-11-04", session: "strength", completed: true, minutes: 40, effort: 6, notes: "" },
    ]);
    expect(p.workoutsDone).toBe(2);
  });
});

describe("op validation", () => {
  const ok = { id: crypto.randomUUID(), at: "2026-11-03T05:00:00.000Z" };
  it("rejects dates outside the plan", () => {
    expect(opSchema.safeParse({ ...ok, type: "weight", date: "2026-10-30", weightKg: 96 }).success).toBe(false);
  });
  it("rejects impossible weights", () => {
    expect(opSchema.safeParse({ ...ok, type: "weight", date: "2026-11-03", weightKg: 960 }).success).toBe(false);
  });
  it("rejects unknown meals and sessions", () => {
    expect(opSchema.safeParse({ ...ok, type: "meal", date: "2026-11-03", meal: "brunch", done: true, topUp: false }).success).toBe(false);
    expect(opSchema.safeParse({ ...ok, type: "workout", date: "2026-11-03", session: "yoga", completed: true }).success).toBe(false);
  });
  it("rejects effort outside 1-10", () => {
    expect(opSchema.safeParse({ ...ok, type: "workout", date: "2026-11-03", session: "cardio", completed: true, effort: 11 }).success).toBe(false);
  });
  it("accepts a valid op", () => {
    expect(opSchema.safeParse({ ...ok, type: "meal", date: "2026-11-03", meal: "lunch", done: true, topUp: true }).success).toBe(true);
  });
});
