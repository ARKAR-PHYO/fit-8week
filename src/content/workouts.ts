import type { Weekday } from "@/lib/plan";

/** Session ids are stored in the Sheet's Workout Log, so treat them as a stable API. */
export const SESSIONS = ["strength", "cardio", "mobility", "strength_hiit", "long_cardio", "rest"] as const;
export type SessionId = (typeof SESSIONS)[number];

export interface Video {
  id: "A" | "B" | "C" | "D";
  title: string;
  channel?: string;
  minutes: number;
  url: string;
}

export const VIDEOS: Record<Video["id"], Video> = {
  A: {
    id: "A",
    title: "30 Minute Full Body Strength Workout [No Equipment]",
    channel: "Juice & Toya",
    minutes: 30,
    url: "https://www.youtube.com/watch?v=5kOvFjM6128",
  },
  B: {
    id: "B",
    title: "10 Minute Full Body Low Impact HIIT",
    channel: "Juice & Toya",
    minutes: 10,
    url: "https://www.youtube.com/watch?v=kwEx3l998Ps",
  },
  C: {
    id: "C",
    title: "30 Min Full Body HIIT Workout, No Equipment",
    channel: "HASfit",
    minutes: 30,
    url: "https://www.youtube.com/watch?v=JLZKYFV1auE",
  },
  D: {
    id: "D",
    title: "10 Min Hip Mobility and Back Strengthening",
    minutes: 10,
    url: "https://www.youtube.com/watch?v=LhQeye6nw88",
  },
};

export interface WorkoutDay {
  session: SessionId;
  title: string;
  time: string;
  /** Effort target on the 1–10 scale. */
  effort: string;
  /** Returns the guidance for a given plan week (1–8). */
  plan: (week: number) => string[];
  /** Videos available on this day for a given week. */
  videos: (week: number) => Video["id"][];
  watch: string;
}

function byWeek(week: number, ranges: [number, number, string][]): string {
  const hit = ranges.find(([from, to]) => week >= from && week <= to);
  return hit ? hit[2] : ranges[ranges.length - 1][2];
}

export const SCHEDULE: Record<Weekday, WorkoutDay> = {
  mon: {
    session: "strength",
    title: "Full-body strength",
    time: "19:00",
    effort: "5–7/10",
    watch: "Functional Strength Training",
    videos: () => ["A"],
    plan: () => [
      "5–7 min warm-up",
      "Video A, about 30 min. Pause whenever you need to.",
      "5 min cool-down",
      "Optional: 10–20 min easy walking",
    ],
  },
  tue: {
    session: "cardio",
    title: "Low-impact cardio",
    time: "19:00",
    effort: "Talk test: short sentences",
    watch: "Outdoor Walk / Indoor Walk / Indoor Cycle",
    videos: () => [],
    plan: (week) => [
      "Brisk walk, indoor walking, stationary bike, step-ups or easy shadow boxing",
      `Duration: ${byWeek(week, [
        [1, 2, "30–40 min"],
        [3, 4, "35–45 min"],
        [5, 6, "40–50 min"],
        [7, 8, "45–60 min"],
      ])}`,
    ],
  },
  wed: {
    session: "strength",
    title: "Full-body strength",
    time: "19:00",
    effort: "5–7/10",
    watch: "Functional Strength Training",
    videos: () => ["A"],
    plan: () => [
      "5–7 min warm-up",
      "Video A, about 30 min",
      "If still sore from Monday, use easier versions and longer rests instead of skipping",
      "5 min cool-down",
    ],
  },
  thu: {
    session: "mobility",
    title: "Recovery and mobility",
    time: "19:00",
    effort: "Easy",
    watch: "Mind & Body for mobility, Walk for walking",
    videos: () => ["D"],
    plan: () => [
      "Video D, 10 min. Move slowly; don't chase a deep stretch.",
      "Then 20–30 min easy walking if comfortable",
    ],
  },
  fri: {
    session: "strength_hiit",
    title: "Strength + low-impact HIIT",
    time: "19:00",
    effort: "HIIT about 7/10, controlled",
    watch: "Functional Strength Training, then a separate HIIT workout",
    videos: (week) => (week >= 4 ? ["A", "B", "C"] : ["A", "B"]),
    plan: (week) => {
      if (week <= 3) return ["20–30 min strength with Video A", "Video B once (10 min). Don't repeat it."];
      if (week === 4)
        return [
          "Video A + Video B, or try 15–20 min of Video C",
          "Stop Video C if your form slips",
          "Never stack A + B + C on the same day",
        ];
      if (week <= 6)
        return [
          "Video A + Video B, or work toward the full Video C",
          "10–20 min of low-impact intervals if knees, back and recovery feel good",
          "Never stack A + B + C on the same day",
        ];
      return [
        "Full Video C can replace the shorter HIIT when recovery is good",
        "Never stack A + B + C on the same day",
      ];
    },
  },
  sat: {
    session: "long_cardio",
    title: "Longer low-impact cardio",
    time: "19:00",
    effort: "Moderate, not HIIT",
    watch: "Outdoor Walk / Indoor Walk / Indoor Cycle",
    videos: () => [],
    plan: (week) => [
      "Brisk walking or other low-impact cardio",
      `Duration: ${byWeek(week, [
        [1, 2, "40–50 min"],
        [3, 4, "45–55 min"],
        [5, 8, "45–60 min"],
      ])}`,
    ],
  },
  sun: {
    session: "rest",
    title: "Rest and recovery",
    time: "Any time",
    effort: "No hard workout",
    watch: "Only record a walk if you take one",
    videos: () => [],
    plan: () => ["Light walking or gentle stretching is fine", "Hydrate, sleep, and prep meals for the week"],
  },
};

export const WARM_UP: string[] = [
  "Easy march in place, 60 seconds",
  "Shoulder circles, 30 seconds each direction",
  "Hip circles, 30 seconds each direction",
  "Bodyweight quarter squats, 10 reps",
  "Alternating knee raises, 10 each side",
  "Gentle torso rotation, 10 each side",
  "Easy step-touch, 60 seconds",
];

export const STOP_SIGNS: string[] = [
  "Severe or worsening back pain",
  "Pain radiating down a leg, numbness or tingling",
  "New weakness, or loss of bowel or bladder control",
  "Chest pain, fainting or unusual breathlessness",
];
