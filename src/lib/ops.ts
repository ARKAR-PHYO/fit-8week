/**
 * Write operations. Shared by the client (offline queue) and the server (/api/sync),
 * so both sides validate with the same schema. Every op carries:
 *  - id: a client-generated UUID, used to report per-op results back to the queue.
 *  - at: when the change was made on the device, used for last-write-wins between devices.
 */
import { z } from "zod";
import { MEALS } from "@/content/menu";
import { SESSIONS } from "@/content/workouts";
import { FINAL_CHECKIN, isLoggableDate, PLAN_START } from "@/lib/plan";

const planDate = z.string().refine(isLoggableDate, `Date must be a real date from ${PLAN_START} to ${FINAL_CHECKIN}`);

const base = {
  id: z.uuid(),
  at: z.iso.datetime(),
};

const optionalNumber = (min: number, max: number) => z.number().min(min).max(max).nullable().optional();
const optionalInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable().optional();

export const weightOp = z.object({
  ...base,
  type: z.literal("weight"),
  date: planDate,
  /** null clears the entry. */
  weightKg: z.number().min(30).max(250).nullable(),
  note: z.string().max(200).optional(),
});

export const mealOp = z.object({
  ...base,
  type: z.literal("meal"),
  date: planDate,
  meal: z.enum(MEALS),
  done: z.boolean(),
  topUp: z.boolean(),
});

export const workoutOp = z.object({
  ...base,
  type: z.literal("workout"),
  date: planDate,
  session: z.enum(SESSIONS),
  completed: z.boolean(),
  minutes: optionalInt(0, 300),
  avgHr: optionalInt(40, 220),
  activeKcal: optionalInt(0, 3000),
  effort: optionalInt(1, 10),
  notes: z.string().max(300).optional(),
});

export const CHECKIN_FIELDS = [
  "weightKg",
  "waistCm",
  "chestCm",
  "hipsCm",
  "neckCm",
  "leftArmCm",
  "rightArmCm",
  "leftThighCm",
  "rightThighCm",
  "bodyFatPct",
] as const;
export type CheckinField = (typeof CHECKIN_FIELDS)[number];

export const checkinOp = z.object({
  ...base,
  type: z.literal("checkin"),
  week: z.number().int().min(0).max(8),
  weightKg: optionalNumber(30, 250),
  waistCm: optionalNumber(20, 250),
  chestCm: optionalNumber(20, 250),
  hipsCm: optionalNumber(20, 250),
  neckCm: optionalNumber(10, 100),
  leftArmCm: optionalNumber(10, 100),
  rightArmCm: optionalNumber(10, 100),
  leftThighCm: optionalNumber(10, 150),
  rightThighCm: optionalNumber(10, 150),
  bodyFatPct: optionalNumber(3, 70),
  notes: z.string().max(300).optional(),
});

export const op = z.discriminatedUnion("type", [weightOp, mealOp, workoutOp, checkinOp]);
export type Op = z.infer<typeof op>;
export type WeightOp = z.infer<typeof weightOp>;
export type MealOp = z.infer<typeof mealOp>;
export type WorkoutOp = z.infer<typeof workoutOp>;
export type CheckinOp = z.infer<typeof checkinOp>;

export const MAX_OPS_PER_SYNC = 25;

export const syncRequest = z.object({
  ops: z.array(z.unknown()).min(1).max(MAX_OPS_PER_SYNC),
});

export type OpStatus = "ok" | "stale" | "invalid" | "error";
export interface OpResult {
  id: string;
  status: OpStatus;
  message?: string;
}
