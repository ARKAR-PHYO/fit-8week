"use client";

import { useEffect, useState } from "react";
import { useToday } from "@/lib/client/hooks";
import { formatLongDate, planDay, PLAN_DAYS, PLAN_START } from "@/lib/plan";

/** Set once per app launch, so the splash shows on a cold start and not on reloads mid-session. */
export const SPLASH_SEEN_KEY = "fit8w:splash";

// Geometry matches scripts/make-splash.mjs (logo = 36vw, ring centred 5.4vw above mid-screen),
// so iOS's static launch image hands over to this without a jump.
const R = 33;
const CIRC = 2 * Math.PI * R;
const LAUNCH_ARC = 0.83; // the arc drawn in the launch image

function label(today: string): { text: string; progress: number } {
  if (today < PLAN_START) return { text: `Starts ${formatLongDate(PLAN_START)}`, progress: 0 };
  const pd = planDay(today);
  if (pd.phase === "after") return { text: "Plan complete", progress: 1 };
  return { text: `Day ${pd.dayNumber} · Week ${pd.week}`, progress: pd.dayNumber / PLAN_DAYS };
}

export function Splash() {
  const today = useToday();
  const [phase, setPhase] = useState<"show" | "hide" | "gone">("show");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SPLASH_SEEN_KEY) === "1";
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      // Private mode etc.: just show it.
    }
    // Hold briefly so the ring animation is visible, but never past ~0.7 s after page start.
    const wait = seen ? 0 : Math.max(0, 700 - performance.now());
    const hide = setTimeout(() => setPhase("hide"), wait);
    const gone = setTimeout(() => setPhase("gone"), wait + 400);
    return () => {
      clearTimeout(hide);
      clearTimeout(gone);
    };
  }, []);

  if (phase === "gone") return null;
  const info = today ? label(today) : null;
  const arc = info ? info.progress : LAUNCH_ARC;

  return (
    <div
      id="splash"
      aria-hidden="true"
      className={`fixed inset-0 z-50 bg-[#047857] transition-opacity duration-300 motion-reduce:transition-none ${
        phase === "hide" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute left-[32vw] w-[36vw] overflow-visible"
        style={{ top: "calc(50vh - 23.4vw)" }}
      >
        <circle cx="50" cy="50" r={R} fill="none" stroke="#d1fae5" strokeOpacity="0.35" strokeWidth="5.5" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="#d1fae5"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeDasharray={`${CIRC * Math.max(arc, 0.001)} ${CIRC}`}
          transform="rotate(-90 50 50)"
          className="transition-[stroke-dasharray] duration-500 ease-out motion-reduce:transition-none"
        />
        <text x="50" y="61" textAnchor="middle" fill="#fff" fontWeight="700" fontSize="30" fontFamily="Helvetica, Arial, sans-serif">
          8W
        </text>
        <text x="50" y="125" textAnchor="middle" fill="#fff" fontWeight="600" fontSize="18.06" fontFamily="Helvetica, Arial, sans-serif">
          8-Week Plan
        </text>
        <text
          x="50"
          y="143"
          textAnchor="middle"
          fill="#d1fae5"
          fontWeight="500"
          fontSize="9"
          fontFamily="Helvetica, Arial, sans-serif"
          className={`transition-opacity duration-300 ${info ? "opacity-100" : "opacity-0"}`}
        >
          {info?.text ?? ""}
        </text>
      </svg>
    </div>
  );
}
