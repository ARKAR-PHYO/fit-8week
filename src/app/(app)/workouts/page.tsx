import { SCHEDULE, STOP_SIGNS, VIDEOS, WARM_UP } from "@/content/workouts";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/lib/plan";
import { Card, PageTitle } from "@/components/ui";

/** Groups consecutive weeks with identical guidance: [[1,2], lines], [[3,4], lines], ... */
function phases(plan: (week: number) => string[]): { from: number; to: number; lines: string[] }[] {
  const out: { from: number; to: number; lines: string[] }[] = [];
  for (let w = 1; w <= 8; w++) {
    const lines = plan(w);
    const last = out[out.length - 1];
    if (last && last.lines.join("|") === lines.join("|")) last.to = w;
    else out.push({ from: w, to: w, lines });
  }
  return out;
}

export default function WorkoutsPage() {
  return (
    <div className="space-y-4">
      <PageTitle sub="Home training, 19:00 most days. Effort mostly 5–7/10.">Workouts</PageTitle>

      {WEEKDAYS.map((day) => {
        const w = SCHEDULE[day];
        const groups = phases(w.plan);
        return (
          <Card key={day} title={WEEKDAY_LABELS[day]} aside={<span className="text-xs text-neutral-500">{w.effort}</span>}>
            <h3 className="font-semibold">{w.title}</h3>
            {groups.map((g) => (
              <div key={g.from} className="mt-2">
                {groups.length > 1 && (
                  <p className="text-xs font-medium text-neutral-500">
                    {g.from === g.to ? `Week ${g.from}` : `Weeks ${g.from}–${g.to}`}
                  </p>
                )}
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {g.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>
        );
      })}

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
