"use client";

import { useProgress, useToday } from "@/lib/client/hooks";
import { addDays, FINAL_CHECKIN, PLAN_START, daysBetween, formatLongDate } from "@/lib/plan";
import { bmi, elapsedPlanDays, scheduledSessions, sevenDayAverage, weeklyRate } from "@/lib/stats";
import type { ProgressData } from "@/lib/types";
import { Card, Notice, PageTitle } from "@/components/ui";
import { LoadingLabel, Skeleton, SkeletonStats } from "@/components/Skeleton";

export function ProgressView() {
  const today = useToday();
  const { data, error, source } = useProgress();

  return (
    <div className="space-y-4">
      <PageTitle sub="Judge the trend, not single days.">Progress</PageTitle>
      {error && <Notice tone="warn">{error}</Notice>}
      {!data && source === "none" && !error && (
        <>
          <LoadingLabel>Loading progress</LoadingLabel>
          <SkeletonStats tiles={6} />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <SkeletonStats tiles={6} />
        </>
      )}
      {data && today && <Summary data={data} today={today} />}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

const fmt = (n: number | null | undefined, digits = 1) => (n === null || n === undefined ? "—" : n.toFixed(digits));

function Summary({ data, today }: { data: ProgressData; today: string }) {
  const { settings, weights } = data;
  const avgs = sevenDayAverage(weights);
  const latest = weights.at(-1) ?? null;
  const latestAvg = avgs.at(-1)?.avg ?? null;
  const start = settings.startWeightKg ?? weights[0]?.weightKg ?? null;
  const lost = start !== null && latestAvg !== null ? start - latestAvg : null;
  const rate = weeklyRate(avgs);
  const days = elapsedPlanDays(today);
  const sessions = scheduledSessions(today);
  const baselineWaist = data.checkins[0]?.values.waistCm ?? null;
  const latestWaist = [...data.checkins].reverse().find((c) => c.values.waistCm !== null)?.values.waistCm ?? null;
  const navy = data.checkins.filter((c) => c.bodyFatNavyPct !== null);
  const firstNavy = navy[0] ?? null;
  const lastNavy = navy.at(-1) ?? null;

  return (
    <>
      <Card title="Weight">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Latest" value={latest ? `${fmt(latest.weightKg)} kg` : "—"} sub={latest ? formatLongDate(latest.date) : undefined} />
          <Stat label="7-day average" value={latestAvg !== null ? `${fmt(latestAvg, 2)} kg` : "—"} />
          <Stat
            label="Lost (by 7-day avg)"
            value={lost !== null ? `${fmt(lost)} kg` : "—"}
            sub={lost !== null && start ? `${fmt((lost / start) * 100)}% of start` : undefined}
          />
          <Stat
            label="Pace"
            value={rate !== null ? `${rate > 0 ? "+" : ""}${fmt(rate, 2)} kg/wk` : "After week 1"}
            sub="Plan: −0.4 to −0.8"
          />
          <Stat
            label="BMI"
            value={latestAvg !== null && settings.heightCm ? fmt(bmi(latestAvg, settings.heightCm)) : "—"}
          />
          <Stat
            label="To 8-week target"
            value={latestAvg !== null && settings.targetKg ? `${fmt(latestAvg - settings.targetKg)} kg` : "—"}
            sub={settings.targetKg ? `Target ${fmt(settings.targetKg)} kg` : undefined}
          />
        </div>
        <WeightChart data={data} avgs={avgs} />
      </Card>

      <Card title="Consistency">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Meals logged" value={`${data.mealsDone} / ${days * 4}`} sub={days ? `${Math.round((data.mealsDone / (days * 4)) * 100)}%` : undefined} />
          <Stat label="Workouts done" value={`${data.workoutsDone} / ${sessions}`} sub={sessions ? `${Math.round((data.workoutsDone / sessions) * 100)}%` : undefined} />
          <Stat label="Weigh-ins" value={`${weights.length}`} sub={`${days} plan day${days === 1 ? "" : "s"} so far`} />
          <Stat
            label="Waist change"
            value={baselineWaist !== null && latestWaist !== null ? `${fmt(latestWaist - baselineWaist)} cm` : "—"}
            sub={baselineWaist === null ? "Add a baseline waist" : undefined}
          />
          <Stat
            label="Body fat (Navy est.)"
            value={lastNavy ? `${fmt(lastNavy.bodyFatNavyPct)}%` : "—"}
            sub={lastNavy ? `${lastNavy.label}` : "Add waist + neck at check-in"}
          />
          <Stat
            label="Body fat change"
            value={
              firstNavy && lastNavy && firstNavy !== lastNavy
                ? `${fmt(lastNavy.bodyFatNavyPct! - firstNavy.bodyFatNavyPct!)} pts`
                : "—"
            }
            sub={firstNavy && lastNavy && firstNavy !== lastNavy ? `Since ${firstNavy.label}` : "After 2 check-ins"}
          />
        </div>
        <p className="mt-3 text-xs text-neutral-500">80–90% consistency is an excellent week.</p>
      </Card>
    </>
  );
}

function WeightChart({ data, avgs }: { data: ProgressData; avgs: { date: string; avg: number }[] }) {
  const pts = data.weights;
  if (pts.length < 2) {
    return <p className="mt-4 text-sm text-neutral-500">The chart appears after two weigh-ins.</p>;
  }

  const W = 340;
  const H = 180;
  const pad = { l: 34, r: 8, t: 10, b: 22 };
  const totalDays = daysBetween(PLAN_START, FINAL_CHECKIN);
  const values = [...pts.map((p) => p.weightKg), data.settings.targetKg ?? pts[0].weightKg];
  const min = Math.floor(Math.min(...values) - 0.5);
  const max = Math.ceil(Math.max(...values) + 0.5);
  const x = (date: string) => pad.l + (daysBetween(PLAN_START, date) / totalDays) * (W - pad.l - pad.r);
  const y = (kg: number) => pad.t + ((max - kg) / (max - min)) * (H - pad.t - pad.b);
  const avgPath = avgs.map((a, i) => `${i ? "L" : "M"}${x(a.date).toFixed(1)},${y(a.avg).toFixed(1)}`).join(" ");
  const ticks = [min, Math.round((min + max) / 2), max];

  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weight over the 8 weeks with 7-day average">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-neutral-200 dark:stroke-neutral-800" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="fill-neutral-500 text-[10px]">
              {t}
            </text>
          </g>
        ))}
        {[0, 4, 8].map((wk) => (
          <text
            key={wk}
            x={x(addDays(PLAN_START, wk * 7))}
            y={H - 6}
            textAnchor={wk === 0 ? "start" : wk === 8 ? "end" : "middle"}
            className="fill-neutral-500 text-[10px]"
          >
            {wk === 0 ? "Start" : `Wk ${wk}`}
          </text>
        ))}
        {data.settings.targetKg && (
          <g>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(data.settings.targetKg)}
              y2={y(data.settings.targetKg)}
              strokeDasharray="4 4"
              className="stroke-emerald-600"
            />
            <text x={W - pad.r} y={y(data.settings.targetKg) - 4} textAnchor="end" className="fill-emerald-700 text-[10px] dark:fill-emerald-400">
              Target {data.settings.targetKg}
            </text>
          </g>
        )}
        {pts.map((p) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.weightKg)} r={2.5} className="fill-neutral-400 dark:fill-neutral-500" />
        ))}
        <path d={avgPath} fill="none" strokeWidth={2.5} strokeLinejoin="round" className="stroke-emerald-700 dark:stroke-emerald-400" />
      </svg>
      <figcaption className="mt-1 text-xs text-neutral-500">Dots: daily weigh-ins. Line: 7-day average.</figcaption>
    </figure>
  );
}
