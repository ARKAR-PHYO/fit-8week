"use client";

import { useEffect, useRef, useState } from "react";
import type { TimedStep } from "@/lib/training";
import { beep, clock, useNow } from "./session-utils";

/**
 * Walks through a list of warm-up or cool-down steps. Timed steps count down and beep at the
 * end; rep steps are ticked off. Calls onFinish after the last step.
 */
export function StepList({ steps, onFinish, finishLabel }: { steps: TimedStep[]; onFinish: () => void; finishLabel: string }) {
  const [index, setIndex] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const now = useNow(endsAt !== null);
  const beeped = useRef(false);

  const step = steps[index];
  const seconds = step?.seconds ?? 0;
  const left = endsAt !== null ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : (pausedLeft ?? seconds);
  const finishedCountdown = endsAt !== null && left === 0;

  useEffect(() => {
    if (finishedCountdown && !beeped.current) {
      beeped.current = true;
      beep();
    }
  }, [finishedCountdown]);

  const next = () => {
    setEndsAt(null);
    setPausedLeft(null);
    beeped.current = false;
    if (index + 1 >= steps.length) onFinish();
    else setIndex(index + 1);
  };

  return (
    <div className="space-y-4">
      <ol className="space-y-1.5 text-sm">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
              i === index ? "bg-emerald-50 font-medium dark:bg-emerald-950" : i < index ? "text-neutral-400 line-through" : ""
            }`}
          >
            <span className="w-5 text-right text-xs tabular-nums text-neutral-500">{i + 1}.</span>
            <span className="flex-1">{s.label}</span>
            {s.seconds && <span className="text-xs tabular-nums text-neutral-500">{clock(s.seconds)}</span>}
          </li>
        ))}
      </ol>

      {step && (
        <div className="rounded-2xl bg-neutral-100 p-4 text-center dark:bg-neutral-800">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{step.label}</p>
          {step.seconds ? (
            <>
              <p className={`my-2 text-5xl font-semibold tabular-nums ${finishedCountdown ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                {clock(left)}
              </p>
              <div className="flex justify-center gap-2">
                {finishedCountdown ? null : endsAt === null ? (
                  <button
                    type="button"
                    className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white"
                    onClick={() => setEndsAt(Date.now() + left * 1000)}
                  >
                    {pausedLeft !== null ? "Resume" : "Start"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-xl bg-neutral-300 px-5 py-2.5 text-sm font-semibold dark:bg-neutral-700"
                    onClick={() => {
                      setPausedLeft(left);
                      setEndsAt(null);
                    }}
                  >
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold ${
                    finishedCountdown ? "bg-emerald-700 text-white" : "text-neutral-600 dark:text-neutral-300"
                  }`}
                  onClick={next}
                >
                  {finishedCountdown ? (index + 1 >= steps.length ? finishLabel : "Next") : "Skip"}
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="mt-3 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white" onClick={next}>
              {index + 1 >= steps.length ? finishLabel : "Done, next"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
