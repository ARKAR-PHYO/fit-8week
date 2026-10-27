import type { Meal } from "@/content/menu";
import type { SessionId } from "@/content/workouts";
import type { CheckinField } from "@/lib/ops";

/** Read models returned by the API and used by both server and client. */

export interface MealEntry {
  done: boolean;
  topUp: boolean;
  updatedAt: string | null;
}

export interface WorkoutEntry {
  session: SessionId | string;
  completed: boolean;
  minutes: number | null;
  avgHr: number | null;
  activeKcal: number | null;
  effort: number | null;
  notes: string;
  updatedAt: string | null;
}

export interface DayData {
  date: string;
  weightKg: number | null;
  note: string;
  meals: Record<Meal, MealEntry>;
  workout: WorkoutEntry | null;
}

export interface CheckinEntry {
  week: number;
  label: string;
  date: string;
  values: Record<CheckinField, number | null>;
  notes: string;
}

export interface ProgressData {
  settings: {
    startWeightKg: number | null;
    heightCm: number | null;
    targetKg: number | null;
    milestoneKg: number | null;
  };
  weights: { date: string; weightKg: number }[];
  checkins: CheckinEntry[];
  mealsDone: number;
  topUpsDone: number;
  workoutsDone: number;
}
