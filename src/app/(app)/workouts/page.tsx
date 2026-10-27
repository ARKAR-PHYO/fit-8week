import { Suspense } from "react";
import { STOP_SIGNS, VIDEOS, WARM_UP } from "@/content/workouts";
import { WeekSkeleton } from "@/components/Skeleton";
import { Card } from "@/components/ui";
import { WeekView } from "./WeekView";

export default function WorkoutsPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<WeekSkeleton />}>
        <WeekView />
      </Suspense>

      <Card title="Videos">
        <ul className="space-y-3">
          {Object.values(VIDEOS).map((v) => (
            <li key={v.id}>
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 underline dark:text-emerald-400">
                Video {v.id}: {v.title}
              </a>
              <p className="text-xs text-neutral-500">
                {v.channel ? `${v.channel} · ` : ""}
                {v.minutes} min{v.id === "C" ? " · not before Week 4" : ""}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Warm-up, 5–7 min">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {WARM_UP.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Card>

      <Card title="Stop and get checked if you have">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {STOP_SIGNS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
