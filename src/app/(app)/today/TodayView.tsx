"use client";

import Image from "next/image";
import Link from "next/link";
import { MEAL_IMAGE_SIZE, mealImage } from "@/content/images";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { DAILY_TARGETS, MEAL_LABELS, MEALS, MENU, type Meal } from "@/content/menu";
import { SCHEDULE, VIDEOS } from "@/content/workouts";
import { useDay, useToday } from "@/lib/client/hooks";
import { enqueue } from "@/lib/client/store";
import {
  addDays,
  checkinLabel,
  checkinWeekForDate,
  DIET_START,
  FINAL_CHECKIN,
  formatLongDate,
  isLoggableDate,
  PLAN_START,
  planDay,
} from "@/lib/plan";
import type { DayData } from "@/lib/types";
import { buttonClass, Card, inputClass, Notice } from "@/components/ui";
import { LoadingLabel, Skeleton } from "@/components/Skeleton";

export function TodayView() {
  const today = useToday();
  const params = useSearchParams();
  const requested = params.get("date");

  if (!today) return <p className="text-sm text-neutral-500">Loading today…</p>;

  // Before the plan starts, preview Day 1; after it ends, show the final check-in day.
  const fallback = today < PLAN_START ? PLAN_START : today > FINAL_CHECKIN ? FINAL_CHECKIN : today;
  const date = requested && isLoggableDate(requested) ? requested : fallback;

  return <DayScreen key={date} date={date} today={today} />;
}

function DayScreen({ date, today }: { date: string; today: string }) {
  const pd = planDay(date);
  const { data, source, error } = useDay(date);
  // Nothing cached and the Sheet hasn't answered yet: show placeholders, not empty values.
  const loading = source === "none" && !error;
  const menu = MENU[pd.weekday];
  const checkinWeek = checkinWeekForDate(date);
  const prev = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <DayLink date={prev} label="Previous day" disabled={!isLoggableDate(prev)}>
          ‹
        </DayLink>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            {pd.phase === "after" ? "Final check-in" : `Day ${pd.dayNumber} · Week ${pd.week}`}
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            {formatLongDate(date)}
            {date === today && <span className="ml-2 text-sm font-normal text-neutral-500">Today</span>}
          </h1>
        </div>
        <DayLink date={next} label="Next day" disabled={!isLoggableDate(next)}>
          ›
        </DayLink>
      </div>

      {today < PLAN_START && date === PLAN_START && (
        <Notice>The plan starts {formatLongDate(PLAN_START)}. This is a preview of Day 1.</Notice>
      )}
      {error && <Notice tone="warn">{error}</Notice>}
      {loading && <LoadingLabel>Loading your entries</LoadingLabel>}

      <WeightCard date={date} data={data} checkinWeek={checkinWeek} loading={loading} />

      {pd.phase !== "after" && (
        <>
          {date < DIET_START ? (
            <Notice>
              Day 1: workout and baseline measurements only. The meal plan starts tomorrow, {formatLongDate(DIET_START)}.
              Weigh yourself tomorrow morning for your baseline weight.
            </Notice>
          ) : (
            <Card title="Meals" aside={<span className="text-xs text-neutral-500">{DAILY_TARGETS.protein}</span>}>
              <ul className="divide-y divide-black/5 dark:divide-white/10">
                {MEALS.map((meal) => (
                  <MealRow key={meal} date={date} meal={meal} data={data} loading={loading} />
                ))}
              </ul>
              <p className="mt-3 text-xs text-neutral-500">
                {DAILY_TARGETS.kcal} · {DAILY_TARGETS.water} · {DAILY_TARGETS.oil}
              </p>
            </Card>
          )}

          <WorkoutCard key={`${date}-${data?.workout?.updatedAt ?? ""}`} date={date} week={pd.week} data={data} loading={loading} />
          {menu.lunch.topUp && date >= DIET_START && (
            <p className="px-1 text-xs text-neutral-500">
              Protein top-up day: 1 extra egg and 80 g extra chicken at lunch.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function DayLink({ date, label, disabled, children }: { date: string; label: string; disabled: boolean; children: string }) {
  const cls = "flex h-10 w-10 items-center justify-center rounded-full text-2xl";
  if (disabled) return <span className={`${cls} text-neutral-300 dark:text-neutral-700`} aria-hidden="true">{children}</span>;
  return (
    <Link href={`/today?date=${date}`} aria-label={label} className={`${cls} bg-white shadow-sm dark:bg-neutral-900`}>
      {children}
    </Link>
  );
}

function WeightCard({
  date,
  data,
  checkinWeek,
  loading,
}: {
  date: string;
  data: DayData | null;
  checkinWeek: number | null;
  loading: boolean;
}) {
  const saved = data?.weightKg ?? null;
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? (saved === null ? "" : String(saved));
  const parsed = Number(value.replace(",", "."));
  const valid = value !== "" && Number.isFinite(parsed) && parsed >= 30 && parsed <= 250;
  const changed = valid && parsed !== saved;

  return (
    <Card
      title="Morning weigh-in"
      aside={
        loading ? (
          <Skeleton className="h-4 w-14" />
        ) : saved !== null ? (
          <span className="text-sm font-semibold">{saved} kg</span>
        ) : null
      }
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          void enqueue({ type: "weight", date, weightKg: Math.round(parsed * 10) / 10 });
          setDraft(null);
        }}
      >
        <label className="sr-only" htmlFor="weight">
          Weight in kg
        </label>
        <input
          id="weight"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 95.8"
          className={inputClass}
          value={value}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className={buttonClass} disabled={!changed}>
          Save
        </button>
      </form>
      <p className="mt-2 text-xs text-neutral-500">After the bathroom, before food or drinks. Judge by the 7-day average.</p>
      {checkinWeek !== null && (
        <Link
          href={`/checkin?week=${checkinWeek}`}
          className="mt-3 block rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          It&apos;s check-in day: record {checkinLabel(checkinWeek)} measurements →
        </Link>
      )}
    </Card>
  );
}

function MealRow({ date, meal, data, loading }: { date: string; meal: Meal; data: DayData | null; loading: boolean }) {
  const day = planDay(date).weekday;
  const item = MENU[day][meal];
  const photo = (
    <Image
      src={mealImage(day, meal)}
      alt=""
      width={MEAL_IMAGE_SIZE.width}
      height={MEAL_IMAGE_SIZE.height}
      unoptimized
      className="h-14 w-[4.5rem] shrink-0 rounded-lg object-cover"
    />
  );
  const entry = data?.meals[meal] ?? { done: false, topUp: false };

  return (
    <li className="flex items-start gap-3 py-3">
      {loading ? (
        <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-full" />
      ) : (
        <button
          type="button"
          role="checkbox"
          aria-checked={entry.done}
          aria-label={`${MEAL_LABELS[meal]} eaten`}
          onClick={() => void enqueue({ type: "meal", date, meal, done: !entry.done, topUp: entry.topUp })}
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
            entry.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 dark:border-neutral-600"
          }`}
        >
          {entry.done && (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
          )}
        </button>
      )}
      {item.recipeId ? (
        <Link href={`/recipes/${item.recipeId}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
          {photo}
        </Link>
      ) : (
        photo
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{MEAL_LABELS[meal]}</p>
        {item.recipeId ? (
          <Link href={`/recipes/${item.recipeId}`} className="font-medium underline-offset-2 hover:underline">
            {item.title}
          </Link>
        ) : (
          <p className="font-medium">{item.title}</p>
        )}
        {item.topUp && loading && <Skeleton className="mt-1.5 h-6 w-full max-w-56 rounded-full" />}
        {item.topUp && !loading && (
          <button
            type="button"
            role="checkbox"
            aria-checked={entry.topUp}
            onClick={() => void enqueue({ type: "meal", date, meal, done: entry.done, topUp: !entry.topUp })}
            className={`mt-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              entry.topUp
                ? "bg-emerald-600 text-white"
                : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {entry.topUp ? "✓ Top-up added" : "+ Protein top-up (1 egg, 80 g chicken)"}
          </button>
        )}
      </div>
    </li>
  );
}

function numberOrNull(v: string, min: number, max: number): number | null {
  if (v.trim() === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function WorkoutCard({ date, week, data, loading }: { date: string; week: number; data: DayData | null; loading: boolean }) {
  const plan = SCHEDULE[planDay(date).weekday];
  const saved = data?.workout && data.workout.session === plan.session ? data.workout : null;
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(saved?.minutes?.toString() ?? "");
  const [avgHr, setAvgHr] = useState(saved?.avgHr?.toString() ?? "");
  const [kcal, setKcal] = useState(saved?.activeKcal?.toString() ?? "");
  const [effort, setEffort] = useState(saved?.effort?.toString() ?? "");
  const [notes, setNotes] = useState(saved?.notes ?? "");
  const completed = saved?.completed ?? false;

  const save = (done: boolean) =>
    enqueue({
      type: "workout",
      date,
      session: plan.session,
      completed: done,
      minutes: numberOrNull(minutes, 0, 300),
      avgHr: numberOrNull(avgHr, 40, 220),
      activeKcal: numberOrNull(kcal, 0, 3000),
      effort: numberOrNull(effort, 1, 10),
      notes: notes.slice(0, 300),
    });

  return (
    <Card
      title="Workout"
      aside={<span className="text-xs text-neutral-500">{plan.time} · {plan.effort}</span>}
    >
      <h3 className="text-lg font-semibold">{plan.title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {plan.plan(week).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {plan.videos(week).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {plan.videos(week).map((id) => (
            <a
              key={id}
              href={VIDEOS[id].url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200"
            >
              ▶ Video {id} · {VIDEOS[id].minutes} min
            </a>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-neutral-500">Apple Watch: {plan.watch}</p>

      {plan.session !== "rest" && loading && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-10 w-48 rounded-xl" />
        </div>
      )}
      {plan.session !== "rest" && !loading && (
        <div className="mt-4 space-y-3">
          {!completed && (
            <Link href={`/workouts/session?date=${date}`} className={`${buttonClass} w-full py-3 text-base`}>
              Start workout
            </Link>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className={completed ? buttonClass : "rounded-xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"}
              onClick={() => void save(!completed)}
            >
              {completed ? "✓ Done (tap to undo)" : "Just mark as done"}
            </button>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="rounded-xl px-3 text-sm font-medium text-neutral-600 dark:text-neutral-300"
              aria-expanded={open}
            >
              {open ? "Hide details" : "Add Watch stats"}
            </button>
          </div>
          {open && (
            <form
              className="grid grid-cols-2 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void save(true);
                setOpen(false);
              }}
            >
              <Field label="Minutes" value={minutes} onChange={setMinutes} />
              <Field label="Avg HR" value={avgHr} onChange={setAvgHr} />
              <Field label="Active kcal" value={kcal} onChange={setKcal} />
              <Field label="Effort (1–10)" value={effort} onChange={setEffort} />
              <label className="col-span-2 text-xs text-neutral-500">
                Pain or notes
                <input className={`${inputClass} mt-1`} value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <button type="submit" className={`${buttonClass} col-span-2`}>
                Save workout
              </button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-xs text-neutral-500">
      {label}
      <input inputMode="numeric" className={`${inputClass} mt-1`} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
