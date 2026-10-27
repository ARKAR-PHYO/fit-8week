import type { Cell, SheetsGateway, ValueUpdate } from "@/server/sheets/gateway";

/** In-memory stand-in for the Sheets API, enough for the A1 ranges the repo uses. */
export class FakeGateway implements SheetsGateway {
  tabs = new Map<string, Cell[][]>();
  calls = { readMany: 0, write: 0, append: 0 };

  constructor(initial: Record<string, Cell[][]>) {
    for (const [name, grid] of Object.entries(initial)) this.tabs.set(name, grid.map((r) => [...r]));
  }

  private parse(range: string) {
    const m = /^'((?:[^']|'')+)'!([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?$/.exec(range);
    if (!m) throw new Error(`FakeGateway cannot parse range ${range}`);
    const tab = m[1].replace(/''/g, "'");
    const col = (s: string) => [...s].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;
    const grid = this.tabs.get(tab);
    if (!grid) throw new Error(`Unable to parse range: ${range}`);
    return {
      grid,
      c1: col(m[2]),
      r1: m[3] ? Number(m[3]) - 1 : 0,
      c2: m[4] ? col(m[4]) : col(m[2]),
      r2: m[5] ? Number(m[5]) - 1 : m[4] ? Number.MAX_SAFE_INTEGER : m[3] ? Number(m[3]) - 1 : Number.MAX_SAFE_INTEGER,
    };
  }

  async readMany(ranges: string[]): Promise<Cell[][][]> {
    this.calls.readMany++;
    return ranges.map((range) => {
      const { grid, c1, r1, c2, r2 } = this.parse(range);
      const rows = grid.slice(r1, Math.min(r2 + 1, grid.length)).map((row) => {
        const slice = row.slice(c1, c2 + 1);
        while (slice.length && (slice[slice.length - 1] === "" || slice[slice.length - 1] == null)) slice.pop();
        return slice;
      });
      while (rows.length && rows[rows.length - 1].length === 0) rows.pop();
      return rows;
    });
  }

  async write(updates: ValueUpdate[]): Promise<void> {
    this.calls.write++;
    for (const { range, values } of updates) {
      const { grid, c1, r1 } = this.parse(range);
      values.forEach((vals, dr) => {
        const r = r1 + dr;
        while (grid.length <= r) grid.push([]);
        vals.forEach((v, dc) => {
          const row = grid[r];
          while (row.length <= c1 + dc) row.push("");
          row[c1 + dc] = v;
        });
      });
    }
  }

  async append(range: string, rows: Cell[][]): Promise<void> {
    this.calls.append++;
    const { grid } = this.parse(range);
    for (const r of rows) grid.push([...r]);
  }
}

/** A Sheet shaped like the real tracker, including the two new log tabs. */
export function trackerFixture(): Record<string, Cell[][]> {
  const daily: Cell[][] = [["Date", "Weight (kg)", "7-Day Avg (kg)", "Loss From Start (kg)", "BMI", "Notes"]];
  for (let d = 0; d < 57; d++) {
    const date = new Date(Date.UTC(2026, 10, 2 + d)).toISOString().slice(0, 10);
    daily.push([date, d === 0 ? 96.6 : "", "=formula", "=formula", "=formula", ""]);
  }
  const weekly: Cell[][] = [
    [
      "Week", "Check-in Date", "Weight (kg)", "Waist at Navel (cm)", "Chest (cm)", "Hips (cm)", "Neck (cm)",
      "Left Arm (cm)", "Right Arm (cm)", "Left Thigh (cm)", "Right Thigh (cm)", "Body Fat % (optional)",
      "Front Photo Link", "Side Photo Link", "Back Photo Link", "Notes",
    ],
  ];
  for (let w = 0; w <= 8; w++) {
    const date = new Date(Date.UTC(2026, 10, 2 + w * 7)).toISOString().slice(0, 10);
    weekly.push([w === 0 ? "Baseline" : `Week ${w}`, date, w === 0 ? 96.6 : ""]);
  }
  return {
    Dashboard: [
      ["Body Transformation Dashboard"],
      ["Start Date", "2026-11-02"],
      ["Height (cm)", 170.6],
      ["Starting Weight (kg)", 96.6],
      ["Long-term Milestone — BMI 30 (kg)", 87.3],
      ["8-Week Target (kg)", 91.5],
    ],
    "Daily Weight": daily,
    "Weekly Measurements": weekly,
    "Meal Log": [["Date", "Meal", "Done", "Top-up Done", "Updated At"]],
    "Workout Log": [
      ["Date", "Session", "Completed", "Minutes", "Avg HR", "Active kcal", "Effort (1-10)", "Notes", "Updated At"],
    ],
  };
}
