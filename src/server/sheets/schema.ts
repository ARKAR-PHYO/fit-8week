import "server-only";
import type { Cell, SheetsGateway } from "./gateway";

/**
 * Tabs and the headers the app depends on. Columns are located by header text, never by
 * position, and a missing header stops the request with SheetStructureError instead of
 * writing into the wrong column. Header text must match exactly (case-insensitive, trimmed).
 */
export const TABS = {
  dashboard: { name: "Dashboard" },
  dailyWeight: {
    name: "Daily Weight",
    headers: { date: "Date", weight: "Weight (kg)", notes: "Notes" },
  },
  weekly: {
    name: "Weekly Measurements",
    headers: {
      week: "Week",
      date: "Check-in Date",
      weightKg: "Weight (kg)",
      waistCm: "Waist at Navel (cm)",
      chestCm: "Chest (cm)",
      hipsCm: "Hips (cm)",
      neckCm: "Neck (cm)",
      leftArmCm: "Left Arm (cm)",
      rightArmCm: "Right Arm (cm)",
      leftThighCm: "Left Thigh (cm)",
      rightThighCm: "Right Thigh (cm)",
      bodyFatPct: "Body Fat % (optional)",
      notes: "Notes",
      bodyFatNavy: "Body Fat % (Navy est.)",
    },
  },
  mealLog: {
    name: "Meal Log",
    headers: { date: "Date", meal: "Meal", done: "Done", topUp: "Top-up Done", updatedAt: "Updated At" },
  },
  workoutLog: {
    name: "Workout Log",
    headers: {
      date: "Date",
      session: "Session",
      completed: "Completed",
      minutes: "Minutes",
      avgHr: "Avg HR",
      activeKcal: "Active kcal",
      effort: "Effort (1-10)",
      notes: "Notes",
      updatedAt: "Updated At",
    },
  },
} as const;

export class SheetStructureError extends Error {}

export function quoteTab(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

export function colLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Whole-tab range wide enough for every tab the app uses. */
export function tabRange(name: string): string {
  return `${quoteTab(name)}!A1:Z`;
}

export type ColumnMap<K extends string> = Record<K, number>;

/** Maps logical keys to 0-based column indexes using the tab's header row. */
export function mapColumns<K extends string>(
  tabName: string,
  headerRow: Cell[] | undefined,
  wanted: Record<K, string>,
): ColumnMap<K> {
  const normalized = (headerRow ?? []).map((h) => String(h ?? "").trim().toLowerCase());
  const map = {} as ColumnMap<K>;
  const missing: string[] = [];
  for (const [key, header] of Object.entries(wanted) as [K, string][]) {
    const idx = normalized.indexOf(header.toLowerCase());
    if (idx === -1) missing.push(header);
    else map[key] = idx;
  }
  if (missing.length > 0) {
    throw new SheetStructureError(`Tab "${tabName}" is missing column(s): ${missing.join(", ")}`);
  }
  return map;
}

/** Reads whole tabs in one API call, keyed by tab name. */
export async function readTabs(gw: SheetsGateway, names: string[]): Promise<Map<string, Cell[][]>> {
  const grids = await gw.readMany(names.map(tabRange));
  return new Map(names.map((n, i) => [n, grids[i] ?? []]));
}

export function cellText(cell: Cell | undefined): string {
  if (cell === null || cell === undefined) return "";
  return String(cell).trim();
}

export function cellNumber(cell: Cell | undefined): number | null {
  if (cell === null || cell === undefined || cell === "") return null;
  const n = typeof cell === "number" ? cell : Number(String(cell).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function cellBool(cell: Cell | undefined): boolean {
  if (typeof cell === "boolean") return cell;
  return ["true", "yes", "1", "x"].includes(cellText(cell).toLowerCase());
}

/**
 * Dates in the tracker are stored as text "YYYY-MM-DD". If someone retypes one and Sheets
 * turns it into a date serial number, convert it back so lookups still match.
 */
export function cellDate(cell: Cell | undefined): string {
  if (typeof cell === "number" && cell > 30000 && cell < 80000) {
    const ms = Math.round((cell - 25569) * 86_400_000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  return cellText(cell);
}
