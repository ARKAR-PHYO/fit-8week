"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { navyBodyFatMale } from "@/lib/bodyfat";
import { CHECKIN_FIELDS, type CheckinField } from "@/lib/ops";
import { useProgress, useToday } from "@/lib/client/hooks";
import { enqueue } from "@/lib/client/store";
import { checkinDate, checkinLabel, CHECKIN_WEEKS, daysBetween, formatLongDate, PLAN_START } from "@/lib/plan";
import type { CheckinEntry } from "@/lib/types";
import { buttonClass, Card, inputClass, Notice, PageTitle } from "@/components/ui";
import { LoadingLabel, Skeleton } from "@/components/Skeleton";

const LABELS: Record<CheckinField, string> = {
  weightKg: "Weight (kg)",
  waistCm: "Waist at navel (cm)",
  chestCm: "Chest (cm)",
  hipsCm: "Hips (cm)",
  neckCm: "Neck (cm)",
  leftArmCm: "Left arm (cm)",
  rightArmCm: "Right arm (cm)",
  leftThighCm: "Left thigh (cm)",
  rightThighCm: "Right thigh (cm)",
  bodyFatPct: "Body fat % (optional)",
};

/** The most recent check-in Monday on or before today, clamped to 0–8. */
function currentWeek(today: string): number {
  const offset = daysBetween(PLAN_START, today);
  return Math.min(Math.max(Math.floor(offset / 7), 0), 8);
}

export function CheckinView() {
  const today = useToday();
  const params = useSearchParams();
  const router = useRouter();
  const progress = useProgress();

  if (!today) return null;
  const fromQuery = Number(params.get("week"));
  const week = Number.isInteger(fromQuery) && fromQuery >= 0 && fromQuery <= 8 && params.get("week") !== null
    ? fromQuery
    : currentWeek(today);
  const entry = progress.data?.checkins.find((c) => c.week === week);

  return (
    <div className="space-y-4">
      <PageTitle sub="Mondays before breakfast. Same tape, same spot, relaxed stomach.">Weekly check-in</PageTitle>
      <label className="block text-sm">
        <span className="text-neutral-500">Check-in</span>
        <select
          className={`${inputClass} mt-1`}
          value={week}
          onChange={(e) => router.replace(`/checkin?week=${e.target.value}`)}
        >
          {CHECKIN_WEEKS.map((w) => (
            <option key={w} value={w}>
              {checkinLabel(w)} · {formatLongDate(checkinDate(w))}
            </option>
          ))}
        </select>
      </label>
      {progress.error && <Notice tone="warn">{progress.error}</Notice>}
      {/* Wait for saved values before showing the form, so nothing typed gets reset when they arrive. */}
      {progress.source === "none" && !progress.error ? (
        <Card title={checkinLabel(week)}>
          <LoadingLabel>Loading check-in</LoadingLabel>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="h-[4.25rem] rounded-xl" />
            ))}
            <Skeleton className="col-span-2 h-20 rounded-xl" />
            <Skeleton className="col-span-2 h-11 rounded-xl" />
          </div>
        </Card>
      ) : (
        // Keyed so the form resets when the week or the loaded values change.
        <CheckinForm
          key={`${week}-${JSON.stringify(entry?.values ?? {})}`}
          week={week}
          entry={entry}
          heightCm={progress.data?.settings.heightCm ?? null}
        />
      )}
    </div>
  );
}

function parseCm(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function CheckinForm({
  week,
  entry,
  heightCm,
}: {
  week: number;
  entry: CheckinEntry | undefined;
  heightCm: number | null;
}) {
  const initial = Object.fromEntries(
    CHECKIN_FIELDS.map((f) => [f, entry?.values[f] == null ? "" : String(entry.values[f])]),
  ) as Record<CheckinField, string>;
  const [values, setValues] = useState(initial);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [saved, setSaved] = useState(false);

  const changed = CHECKIN_FIELDS.filter((f) => values[f] !== initial[f]);
  const invalid = changed.filter((f) => values[f] !== "" && !Number.isFinite(Number(values[f].replace(",", "."))));
  const estimate = navyBodyFatMale(parseCm(values.waistCm), parseCm(values.neckCm), heightCm);

  return (
    <Card title={checkinLabel(week)}>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (invalid.length) return;
          const patch: Partial<Record<CheckinField, number | null>> = {};
          for (const f of changed) patch[f] = values[f] === "" ? null : Number(values[f].replace(",", "."));
          void enqueue({
            type: "checkin",
            week,
            ...patch,
            ...(notes !== (entry?.notes ?? "") ? { notes } : {}),
          });
          setSaved(true);
        }}
      >
        {CHECKIN_FIELDS.map((f) => (
          <label key={f} className={`text-xs text-neutral-500 ${f === "weightKg" || f === "waistCm" ? "col-span-1" : ""}`}>
            {LABELS[f]}
            <input
              inputMode="decimal"
              className={`${inputClass} mt-1 ${invalid.includes(f) ? "border-red-500" : ""}`}
              value={values[f]}
              onChange={(e) => {
                setSaved(false);
                setValues((v) => ({ ...v, [f]: e.target.value }));
              }}
            />
          </label>
        ))}
        <div className="col-span-2 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950" aria-live="polite">
          <p className="text-xs text-emerald-900 dark:text-emerald-200">Estimated body fat (US Navy method)</p>
          <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
            {estimate !== null ? `${estimate.toFixed(1)}%` : "Enter waist and neck"}
          </p>
          <p className="text-xs text-emerald-900/70 dark:text-emerald-200/70">
            Calculated from waist, neck and height{heightCm ? ` (${heightCm} cm)` : ""}. Saved to its own column. About
            ±3–4% for one reading; the weekly trend is what counts.
          </p>
        </div>
        <label className="col-span-2 text-xs text-neutral-500">
          Notes
          <input className={`${inputClass} mt-1`} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button type="submit" className={`${buttonClass} col-span-2`} disabled={invalid.length > 0}>
          {saved ? "Saved ✓" : "Save check-in"}
        </button>
      </form>
      <p className="mt-3 text-xs text-neutral-500">Progress photos stay in your Sheet&apos;s photo columns for now.</p>
    </Card>
  );
}
