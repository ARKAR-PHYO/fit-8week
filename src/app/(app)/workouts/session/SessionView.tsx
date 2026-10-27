"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { SCHEDULE, STOP_SIGNS, type SessionId } from "@/content/workouts";
import { useToday } from "@/lib/client/hooks";
import { enqueue } from "@/lib/client/store";
import { formatLongDate, isLoggableDate, planDay } from "@/lib/plan";
import {
  composeNotes,
  COOL_DOWN_STEPS,
  sessionSteps,
  STEP_LABELS,
  WARM_UP_STEPS,
  type SessionStep,
} from "@/lib/training";
import { buttonClass, Card, inputClass, Notice } from "@/components/ui";
import { StepList } from "@/components/workout/StepList";
import { VideoPlayer } from "@/components/workout/VideoPlayer";
import { clock, loadJson, removeKey, saveJson, unlockAudio, useNow, useWakeLock } from "@/components/workout/session-utils";

interface Saved {
  startedAt: number;
  step: number;
  /** When the current timer step began, for cardio and walk timers. */
  stepStartedAt: number;
}

export function SessionView() {
  const today = useToday();
  const params = useSearchParams();
  if (!today) return null;

  const date = params.get("date") ?? today;
  if (!isLoggableDate(date) || date > today) {
    return (
      <div className="space-y-4">
        <Notice tone="warn">Sessions can be started for today or logged for earlier plan days only.</Notice>
        <Link href="/workouts" className="text-sm text-emerald-700 underline">
          Back to this week
        </Link>
      </div>
    );
  }
  return <SessionRunner key={date} date={date} />;
}

function SessionRunner({ date }: { date: string }) {
  const pd = planDay(date);
  const plan = SCHEDULE[pd.weekday];
  const steps = sessionSteps(plan.session, pd.week);
  const storageKey = `fit8w:session:${date}`;

  const [saved, setSaved] = useState<Saved | null>(() => loadJson<Saved>(storageKey));
  const [done, setDone] = useState(false);
  const running = saved !== null && !done;
  const now = useNow(running);
  useWakeLock(running);

  const update = (next: Saved | null) => {
    setSaved(next);
    if (next) saveJson(storageKey, next);
    else removeKey(storageKey);
  };
  const goTo = (step: number) => update({ ...saved!, step, stepStartedAt: Date.now() });

  if (plan.session === "rest") {
    return (
      <div className="space-y-4">
        <Notice>Sunday is a rest day. Light walking or gentle stretching is fine; no session to log.</Notice>
        <Link href="/workouts" className="text-sm text-emerald-700 underline">
          Back to this week
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-5xl">✓</p>
        <h1 className="text-2xl font-semibold">Session saved</h1>
        <p className="text-sm text-neutral-500">It&apos;s in your Workout Log, or will be as soon as you&apos;re online.</p>
        <div className="flex justify-center gap-2">
          <Link href={`/today?date=${date}`} className={buttonClass}>
            Back to Today
          </Link>
          <Link href={`/workouts?week=${pd.week}`} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-700">
            This week
          </Link>
        </div>
      </div>
    );
  }

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          {formatLongDate(date)} · Week {pd.week}
        </p>
        <h1 className="text-xl font-semibold tracking-tight">{plan.title}</h1>
        <p className="text-xs text-neutral-500">
          Effort {plan.effort} · Apple Watch: {plan.watch}
        </p>
      </div>
      {saved && <p className="shrink-0 text-2xl font-semibold tabular-nums">{clock((now - saved.startedAt) / 1000)}</p>}
    </div>
  );

  if (!saved) {
    return (
      <div className="space-y-4">
        {header}
        <Card title="Plan for today">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {plan.plan(pd.week).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-neutral-500">Start your Apple Watch workout at the same time.</p>
        </Card>
        <button
          type="button"
          className={`${buttonClass} w-full py-3.5 text-base`}
          onClick={() => {
            unlockAudio();
            const t = Date.now();
            update({ startedAt: t, step: 0, stepStartedAt: t });
          }}
        >
          Start session
        </button>
        <button type="button" className="w-full text-sm text-neutral-500 underline" onClick={() => {
          const t = Date.now();
          update({ startedAt: t, step: steps.length - 1, stepStartedAt: t });
        }}>
          Already did it? Just log it
        </button>
      </div>
    );
  }

  const index = Math.min(saved.step, steps.length - 1);
  const step = steps[index];
  const next = () => goTo(index + 1);

  return (
    <div className="space-y-4">
      {header}
      <ol className="flex gap-1.5" aria-label="Session steps">
        {steps.map((s, i) => (
          <li
            key={i}
            aria-current={i === index ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full ${i < index ? "bg-emerald-600" : i === index ? "bg-emerald-400" : "bg-neutral-200 dark:bg-neutral-800"}`}
          />
        ))}
      </ol>
      <p className="text-sm font-medium text-neutral-500">
        Step {index + 1} of {steps.length}: {STEP_LABELS[step.kind]}
      </p>

      <StepBody
        step={step}
        now={now}
        stepStartedAt={saved.stepStartedAt}
        onNext={next}
        onSave={async (log) => {
          await enqueue({ type: "workout", date, session: plan.session, completed: true, ...log });
          removeKey(storageKey);
          setDone(true);
        }}
        session={plan.session}
        elapsedMinutes={Math.max(1, Math.round((now - saved.startedAt) / 60000))}
      />

      <div className="flex justify-between pt-2 text-sm">
        <button
          type="button"
          className="text-neutral-500 underline disabled:opacity-40"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
        >
          ‹ Back a step
        </button>
        {step.kind !== "log" ? (
          <button type="button" className="text-neutral-500 underline" onClick={() => goTo(steps.length - 1)}>
            End early and log
          </button>
        ) : (
          <button
            type="button"
            className="text-neutral-500 underline"
            onClick={() => {
              if (confirm("Discard this session? Nothing will be logged.")) update(null);
            }}
          >
            Discard
          </button>
        )}
      </div>
    </div>
  );
}

interface LogValues {
  minutes: number;
  effort: number;
  avgHr: number | null;
  activeKcal: number | null;
  notes: string;
}

function StepBody({
  step,
  now,
  stepStartedAt,
  onNext,
  onSave,
  session,
  elapsedMinutes,
}: {
  step: SessionStep;
  now: number;
  stepStartedAt: number;
  onNext: () => void;
  onSave: (log: LogValues) => Promise<void>;
  session: SessionId;
  elapsedMinutes: number;
}) {
  switch (step.kind) {
    case "warmup":
      return (
        <Card title="Warm-up, 5–7 min">
          <StepList steps={WARM_UP_STEPS} onFinish={onNext} finishLabel="Start the workout" />
        </Card>
      );
    case "cooldown":
      return (
        <Card title="Cool-down, about 5 min">
          <StepList steps={COOL_DOWN_STEPS} onFinish={onNext} finishLabel="Log the session" />
        </Card>
      );
    case "video":
      return (
        <Card title={`Video ${step.video}`}>
          <VideoPlayer id={step.video} defaultOpen />
          {step.note && <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{step.note}</p>}
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-neutral-500">
            {step.video === "D" ? (
              <>
                <li>Keep your breathing relaxed; this is recovery, not a workout.</li>
                <li>Stop any move that causes shooting pain, numbness, tingling or pain down a leg.</li>
              </>
            ) : (
              <>
                <li>Pause whenever your breathing or form gets away from you.</li>
                <li>Use a chair for balance and wall or table push-ups if needed.</li>
                <li>Stop any move that causes sharp back, knee, hip or shoulder pain.</li>
              </>
            )}
          </ul>
          <button type="button" className={`${buttonClass} mt-4 w-full`} onClick={onNext}>
            Done with Video {step.video}
          </button>
        </Card>
      );
    case "timer": {
      const elapsed = (now - stepStartedAt) / 1000;
      const [min, max] = step.target;
      const pct = Math.min(100, (elapsed / (max * 60)) * 100);
      const reachedMin = elapsed >= min * 60;
      return (
        <Card title={step.label}>
          <p className="text-center text-6xl font-semibold tabular-nums">{clock(elapsed)}</p>
          <p className="mt-1 text-center text-sm text-neutral-500">
            Target {min}–{max} min this week{session === "mobility" ? "" : " · talk test: short sentences"}
          </p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full ${reachedMin ? "bg-emerald-600" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-center text-xs text-neutral-500">
            {reachedMin ? `Minimum reached. Keep going up to ${max} min if you feel good.` : `${Math.ceil(min - elapsed / 60)} min to the minimum`}
          </p>
          {session === "mobility" && <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">Skip the walk if your back or legs don&apos;t feel right.</p>}
          <button type="button" className={`${buttonClass} mt-4 w-full`} onClick={onNext}>
            {reachedMin ? "Finish" : "Finish early"}
          </button>
        </Card>
      );
    }
    case "log":
      return <LogForm session={session} elapsedMinutes={elapsedMinutes} onSave={onSave} />;
  }
}

function LogForm({
  session,
  elapsedMinutes,
  onSave,
}: {
  session: SessionId;
  elapsedMinutes: number;
  onSave: (log: LogValues) => Promise<void>;
}) {
  const defaultEffort = session === "mobility" ? 3 : session === "cardio" || session === "long_cardio" ? 5 : 6;
  const [minutes, setMinutes] = useState(String(elapsedMinutes));
  const [effort, setEffort] = useState(defaultEffort);
  const [pain, setPain] = useState(false);
  const [notes, setNotes] = useState("");
  const [showWatch, setShowWatch] = useState(false);
  const [avgHr, setAvgHr] = useState("");
  const [kcal, setKcal] = useState("");
  const [saving, setSaving] = useState(false);

  const int = (v: string, lo: number, hi: number) => {
    const n = Math.round(Number(v));
    return v.trim() !== "" && Number.isFinite(n) && n >= lo && n <= hi ? n : null;
  };
  const mins = int(minutes, 1, 300);

  return (
    <Card title="Log it">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (mins === null) return;
          setSaving(true);
          await onSave({
            minutes: mins,
            effort,
            avgHr: int(avgHr, 40, 220),
            activeKcal: int(kcal, 0, 3000),
            notes: composeNotes(pain, notes),
          });
        }}
      >
        <label className="block text-sm">
          <span className="text-neutral-500">Minutes</span>
          <input inputMode="numeric" className={`${inputClass} mt-1 ${mins === null ? "border-red-500" : ""}`} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>

        <div>
          <div className="flex items-baseline justify-between text-sm">
            <label htmlFor="effort" className="text-neutral-500">
              How hard did it feel?
            </label>
            <span className="text-2xl font-semibold tabular-nums">{effort}/10</span>
          </div>
          <input
            id="effort"
            type="range"
            min={1}
            max={10}
            step={1}
            value={effort}
            onChange={(e) => setEffort(Number(e.target.value))}
            className="mt-2 w-full accent-emerald-700"
          />
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Easy</span>
            <span>Moderate 5–6</span>
            <span>Very hard</span>
          </div>
          {effort >= 8 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">8+ is harder than this plan needs, especially in the early weeks.</p>}
        </div>

        <fieldset>
          <legend className="text-sm text-neutral-500">Any pain or discomfort?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[false, true].map((v) => (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={pain === v}
                onClick={() => setPain(v)}
                className={`rounded-xl py-2.5 text-sm font-semibold ${
                  pain === v
                    ? v
                      ? "bg-red-600 text-white"
                      : "bg-emerald-700 text-white"
                    : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </fieldset>

        {pain && (
          <div className="space-y-2 rounded-xl bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
            <p className="font-semibold">Next session, go easier on whatever hurt:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Slow down and reduce the range of motion.</li>
              <li>Use supported versions: chair, wall, shorter lunges.</li>
              <li>Skip the movement that caused it, and keep jumping out.</li>
            </ul>
            <p className="font-semibold">Stop training and get it checked if you have:</p>
            <ul className="list-disc space-y-1 pl-5">
              {STOP_SIGNS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <label className="block text-sm">
          <span className="text-neutral-500">{pain ? "Where, and what did it feel like?" : "Notes (optional)"}</span>
          <input className={`${inputClass} mt-1`} maxLength={280} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div>
          <button type="button" className="text-sm text-emerald-700 underline dark:text-emerald-400" onClick={() => setShowWatch((s) => !s)} aria-expanded={showWatch}>
            {showWatch ? "Hide Apple Watch stats" : "Add Apple Watch stats (optional)"}
          </button>
          {showWatch && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs text-neutral-500">
                Avg HR
                <input inputMode="numeric" className={`${inputClass} mt-1`} value={avgHr} onChange={(e) => setAvgHr(e.target.value)} />
              </label>
              <label className="text-xs text-neutral-500">
                Active kcal
                <input inputMode="numeric" className={`${inputClass} mt-1`} value={kcal} onChange={(e) => setKcal(e.target.value)} />
              </label>
            </div>
          )}
        </div>

        <button type="submit" className={`${buttonClass} w-full py-3`} disabled={mins === null || saving}>
          {saving ? "Saving…" : "Save session"}
        </button>
      </form>
    </Card>
  );
}
