"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SCHEDULE } from "@/content/workouts";
import { useProgress, useToday } from "@/lib/client/hooks";
import { formatLongDate, planDay, PLAN_START, WEEKDAY_LABELS } from "@/lib/plan";
import { dayStatus, findLog, hasPain, PLAN_WEEKS, weekDates, weeklyChecklist, type DayStatus } from "@/lib/training";
import { Card, Notice, PageTitle } from "@/components/ui";
import { VideoPlayer } from "@/components/workout/VideoPlayer";

const STATUS: Record<DayStatus, { label: string; cls: string }> = {
  done: { label: "✓ Done", cls: "bg-emerald-600 text-white" },
  missed: { label: "Missed", cls: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
  today: { label: "Today", cls: "bg-sky-600 text-white" },
  upcoming: { label: "Upcoming", cls: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" },
  rest: { label: "Rest", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
};

export function WeekView() {
  const today = useToday();
  const params = useSearchParams();
  const router = useRouter();
  const { data, error } = useProgress();

  if (!today) return null;
  const current = today < PLAN_START ? 1 : planDay(today).week;
  const asked = Number(params.get("week"));
  const week = Number.isInteger(asked) && asked >= 1 && asked <= PLAN_WEEKS ? asked : current;
  const logs = data?.workouts ?? [];
  const checklist = weeklyChecklist(week, logs, today);
  const days = weekDates(week);

  return (
    <div className="space-y-4">
      <PageTitle sub={`${formatLongDate(days[0].date)} – ${formatLongDate(days[6].date)}`}>Week {week}</PageTitle>

      <nav aria-label="Plan weeks" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {Array.from({ length: PLAN_WEEKS }, (_, i) => i + 1).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => router.replace(`/workouts?week=${w}`, { scroll: false })}
            aria-current={w === week ? "true" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${
              w === week
                ? "bg-emerald-700 text-white"
                : "bg-white text-neutral-700 shadow-sm dark:bg-neutral-900 dark:text-neutral-300"
            }`}
          >
            Wk {w}
            {w === current && w !== week ? " •" : ""}
          </button>
        ))}
      </nav>

      {error && <Notice tone="warn">{error}</Notice>}

      <Card title="This week's checklist" aside={<span className="text-xs text-neutral-500">80–90% is excellent</span>}>
        <ul className="grid grid-cols-2 gap-2">
          {checklist.map((item) => {
            const met = item.done >= item.target;
            return (
              <li
                key={item.key}
                className={`rounded-xl px-3 py-2 ${met ? "bg-emerald-50 dark:bg-emerald-950" : "bg-neutral-100 dark:bg-neutral-800"}`}
              >
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.label}</p>
                <p className={`text-lg font-semibold ${met ? "text-emerald-800 dark:text-emerald-300" : ""}`}>
                  {met ? "✓ " : ""}
                  {item.key === "rest" ? (met ? "Done" : "Sunday") : `${item.done} / ${item.target}`}
                </p>
                {item.note && <p className="text-xs text-neutral-500">{item.note}</p>}
              </li>
            );
          })}
        </ul>
        {week >= 4 && (
          <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-900 dark:bg-violet-950 dark:text-violet-200">
            Video C unlocked: it can replace Friday&apos;s short HIIT when recovery is good
            {week === 4 ? ". This week, try only 15–20 min of it." : "."}
          </p>
        )}
      </Card>

      <ul className="space-y-3">
        {days.map(({ date, weekday }) => {
          const plan = SCHEDULE[weekday];
          const status = dayStatus(date, today, plan.session, logs);
          const entry = findLog(logs, date, plan.session);
          const canStart = plan.session !== "rest" && date <= today && status !== "done";
          return (
            <li key={date}>
              <Card
                title={
                  <span>
                    {WEEKDAY_LABELS[weekday]} · {formatLongDate(date).split(" ").slice(1).join(" ")}
                  </span>
                }
                aside={<span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[status].cls}`}>{STATUS[status].label}</span>}
              >
                <h3 className="font-semibold">{plan.title}</h3>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
                  {plan.plan(week).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {entry?.completed && (entry.minutes !== null || entry.effort !== null) && (
                  <p className="mt-2 text-xs text-neutral-500">
                    {entry.minutes !== null ? `${entry.minutes} min` : ""}
                    {entry.minutes !== null && entry.effort !== null ? " · " : ""}
                    {entry.effort !== null ? `effort ${entry.effort}/10` : ""}
                  </p>
                )}
                {entry && hasPain(entry.notes) && (
                  <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                    {entry.notes}
                  </p>
                )}
                {(status === "today" || status === "upcoming") && plan.videos(week).length > 0 && (
                  <div className="mt-3 space-y-2">
                    {plan.videos(week).map((id) => (
                      <VideoPlayer key={id} id={id} />
                    ))}
                  </div>
                )}
                {canStart && (
                  <Link
                    href={`/workouts/session?date=${date}`}
                    className="mt-3 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {status === "today" ? "Start workout" : "Log this session"}
                  </Link>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
