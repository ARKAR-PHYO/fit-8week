import "server-only";
import { MEALS, type Meal } from "@/content/menu";
import {
  CHECKIN_FIELDS,
  type CheckinField,
  type CheckinOp,
  type MealOp,
  type Op,
  type OpStatus,
  type WeightOp,
  type WorkoutOp,
} from "@/lib/ops";
import { navyBodyFatMale } from "@/lib/bodyfat";
import { checkinDate, checkinLabel } from "@/lib/plan";
import type { CheckinEntry, DayData, MealEntry, ProgressData, WorkoutEntry, WorkoutLogEntry } from "@/lib/types";
import type { Cell, SheetsGateway, ValueUpdate } from "./gateway";
import {
  cellBool,
  cellDate,
  cellNumber,
  cellText,
  colLetter,
  mapColumns,
  quoteTab,
  readTabs,
  SheetStructureError,
  TABS,
} from "./schema";

const emptyMeal = (): MealEntry => ({ done: false, topUp: false, updatedAt: null });

/** Rows after the header, with their 1-based Sheet row number. */
function dataRows(grid: Cell[][]): { row: Cell[]; rowNumber: number }[] {
  return grid.slice(1).map((row, i) => ({ row, rowNumber: i + 2 }));
}

/** ISO timestamps compare correctly as strings. Picks the newest of duplicate rows. */
function newer(a: string | null, b: string | null): boolean {
  return (a ?? "") > (b ?? "");
}

// ---------- Reads ----------

export async function getDay(gw: SheetsGateway, date: string): Promise<DayData> {
  const tabs = await readTabs(gw, [TABS.dailyWeight.name, TABS.mealLog.name, TABS.workoutLog.name]);

  const dw = tabs.get(TABS.dailyWeight.name)!;
  const dwCols = mapColumns(TABS.dailyWeight.name, dw[0], TABS.dailyWeight.headers);
  const weightRow = dataRows(dw).find(({ row }) => cellDate(row[dwCols.date]) === date)?.row;

  const ml = tabs.get(TABS.mealLog.name)!;
  const mlCols = mapColumns(TABS.mealLog.name, ml[0], TABS.mealLog.headers);
  const meals = Object.fromEntries(MEALS.map((m) => [m, emptyMeal()])) as Record<Meal, MealEntry>;
  for (const { row } of dataRows(ml)) {
    if (cellDate(row[mlCols.date]) !== date) continue;
    const meal = cellText(row[mlCols.meal]).toLowerCase() as Meal;
    if (!MEALS.includes(meal)) continue;
    const entry: MealEntry = {
      done: cellBool(row[mlCols.done]),
      topUp: cellBool(row[mlCols.topUp]),
      updatedAt: cellText(row[mlCols.updatedAt]) || null,
    };
    if (meals[meal].updatedAt === null || newer(entry.updatedAt, meals[meal].updatedAt)) meals[meal] = entry;
  }

  const wl = tabs.get(TABS.workoutLog.name)!;
  const wlCols = mapColumns(TABS.workoutLog.name, wl[0], TABS.workoutLog.headers);
  let workout: WorkoutEntry | null = null;
  for (const { row } of dataRows(wl)) {
    if (cellDate(row[wlCols.date]) !== date) continue;
    const entry: WorkoutEntry = {
      session: cellText(row[wlCols.session]),
      completed: cellBool(row[wlCols.completed]),
      minutes: cellNumber(row[wlCols.minutes]),
      avgHr: cellNumber(row[wlCols.avgHr]),
      activeKcal: cellNumber(row[wlCols.activeKcal]),
      effort: cellNumber(row[wlCols.effort]),
      notes: cellText(row[wlCols.notes]),
      updatedAt: cellText(row[wlCols.updatedAt]) || null,
    };
    if (!workout || newer(entry.updatedAt, workout.updatedAt)) workout = entry;
  }

  return {
    date,
    weightKg: weightRow ? cellNumber(weightRow[dwCols.weight]) : null,
    note: weightRow ? cellText(weightRow[dwCols.notes]) : "",
    meals,
    workout,
  };
}

/** Reads label/value pairs from the Dashboard tab's first two columns. */
function dashboardValue(grid: Cell[][], label: string): number | null {
  const row = grid.find((r) => cellText(r[0]).toLowerCase() === label.toLowerCase());
  return row ? cellNumber(row[1]) : null;
}

export async function getProgress(gw: SheetsGateway): Promise<ProgressData> {
  const tabs = await readTabs(gw, [
    TABS.dashboard.name,
    TABS.dailyWeight.name,
    TABS.weekly.name,
    TABS.mealLog.name,
    TABS.workoutLog.name,
  ]);

  const dash = tabs.get(TABS.dashboard.name)!;
  const settings = {
    startWeightKg: dashboardValue(dash, "Starting Weight (kg)"),
    heightCm: dashboardValue(dash, "Height (cm)"),
    targetKg: dashboardValue(dash, "8-Week Target (kg)"),
    milestoneKg: dashboardValue(dash, "Long-term Milestone — BMI 30 (kg)"),
  };

  const dw = tabs.get(TABS.dailyWeight.name)!;
  const dwCols = mapColumns(TABS.dailyWeight.name, dw[0], TABS.dailyWeight.headers);
  const weights = dataRows(dw)
    .map(({ row }) => ({ date: cellDate(row[dwCols.date]), weightKg: cellNumber(row[dwCols.weight]) }))
    .filter((w): w is { date: string; weightKg: number } => !!w.date && w.weightKg !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const wk = tabs.get(TABS.weekly.name)!;
  const wkCols = mapColumns(TABS.weekly.name, wk[0], TABS.weekly.headers);
  const checkins: CheckinEntry[] = [];
  for (let week = 0; week <= 8; week++) {
    const label = checkinLabel(week);
    const row = dataRows(wk).find(({ row }) => cellText(row[wkCols.week]).toLowerCase() === label.toLowerCase())?.row;
    const values = Object.fromEntries(
      CHECKIN_FIELDS.map((f) => [f, row ? cellNumber(row[wkCols[f]]) : null]),
    ) as Record<CheckinField, number | null>;
    checkins.push({
      week,
      label,
      date: row ? cellDate(row[wkCols.date]) || checkinDate(week) : checkinDate(week),
      values,
      bodyFatNavyPct: row ? cellNumber(row[wkCols.bodyFatNavy]) : null,
      notes: row ? cellText(row[wkCols.notes]) : "",
    });
  }

  // Count the latest state per key, so duplicate rows from two devices don't double count.
  const ml = tabs.get(TABS.mealLog.name)!;
  const mlCols = mapColumns(TABS.mealLog.name, ml[0], TABS.mealLog.headers);
  const latestMeal = new Map<string, { done: boolean; topUp: boolean; at: string }>();
  for (const { row } of dataRows(ml)) {
    const key = `${cellDate(row[mlCols.date])}|${cellText(row[mlCols.meal]).toLowerCase()}`;
    const at = cellText(row[mlCols.updatedAt]);
    const prev = latestMeal.get(key);
    if (!prev || at > prev.at) {
      latestMeal.set(key, { done: cellBool(row[mlCols.done]), topUp: cellBool(row[mlCols.topUp]), at });
    }
  }

  const wl = tabs.get(TABS.workoutLog.name)!;
  const wlCols = mapColumns(TABS.workoutLog.name, wl[0], TABS.workoutLog.headers);
  const latestWorkout = new Map<string, WorkoutLogEntry & { at: string }>();
  for (const { row } of dataRows(wl)) {
    const date = cellDate(row[wlCols.date]);
    const session = cellText(row[wlCols.session]);
    if (!date || !session) continue;
    const key = `${date}|${session}`;
    const at = cellText(row[wlCols.updatedAt]);
    const prev = latestWorkout.get(key);
    if (!prev || at > prev.at) {
      latestWorkout.set(key, {
        date,
        session,
        completed: cellBool(row[wlCols.completed]),
        minutes: cellNumber(row[wlCols.minutes]),
        effort: cellNumber(row[wlCols.effort]),
        notes: cellText(row[wlCols.notes]),
        at,
      });
    }
  }

  return {
    settings,
    weights,
    checkins,
    mealsDone: [...latestMeal.values()].filter((m) => m.done).length,
    topUpsDone: [...latestMeal.values()].filter((m) => m.topUp).length,
    workoutsDone: [...latestWorkout.values()].filter((w) => w.completed).length,
    workouts: [...latestWorkout.values()]
      .map((w): WorkoutLogEntry => ({
        date: w.date,
        session: w.session,
        completed: w.completed,
        minutes: w.minutes,
        effort: w.effort,
        notes: w.notes,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ---------- Writes ----------

function rowRange(tab: string, rowNumber: number, fromCol: number, toCol: number): string {
  return `${quoteTab(tab)}!${colLetter(fromCol)}${rowNumber}:${colLetter(toCol)}${rowNumber}`;
}

function cellRange(tab: string, rowNumber: number, col: number): string {
  return `${quoteTab(tab)}!${colLetter(col)}${rowNumber}`;
}

/** Builds a full row in header order from a sparse key → value map. */
function buildRow(width: number, values: [number, Cell][]): Cell[] {
  const row: Cell[] = new Array(width).fill("");
  for (const [col, v] of values) row[col] = v;
  return row;
}

async function applyWeight(gw: SheetsGateway, op: WeightOp): Promise<OpStatus> {
  const tab = TABS.dailyWeight.name;
  const [grid] = await gw.readMany([`${quoteTab(tab)}!A1:Z`]);
  const cols = mapColumns(tab, grid[0], TABS.dailyWeight.headers);
  const hit = dataRows(grid).find(({ row }) => cellDate(row[cols.date]) === op.date);
  if (!hit) {
    // Daily Weight rows carry formulas, so the app never appends there.
    throw new SheetStructureError(`Daily Weight has no row for ${op.date}`);
  }
  // Only the input cells are written; the formula columns are never touched.
  const updates: ValueUpdate[] = [
    { range: cellRange(tab, hit.rowNumber, cols.weight), values: [[op.weightKg ?? ""]] },
  ];
  if (op.note !== undefined) {
    updates.push({ range: cellRange(tab, hit.rowNumber, cols.notes), values: [[op.note]] });
  }
  await gw.write(updates);
  return "ok";
}

/** Update-or-insert for log tabs keyed by (Date, keyColumn), with last-write-wins on Updated At. */
async function upsertLogRow<H extends Record<string, string> & { date: string; updatedAt: string }>(
  gw: SheetsGateway,
  tab: string,
  headers: H,
  keyField: keyof H & string,
  key: { date: string; value: string },
  at: string,
  values: Partial<Record<keyof H & string, Cell>>,
): Promise<OpStatus> {
  const [grid] = await gw.readMany([`${quoteTab(tab)}!A1:Z`]);
  const cols = mapColumns(tab, grid[0], headers) as Record<string, number>;
  const width = Math.max(...Object.values(cols)) + 1;

  const matches = dataRows(grid).filter(
    ({ row }) =>
      cellDate(row[cols.date]) === key.date &&
      cellText(row[cols[keyField]]).toLowerCase() === key.value.toLowerCase(),
  );
  const rowValues: [number, Cell][] = Object.entries(values).map(([k, v]) => [cols[k], v as Cell]);
  rowValues.push([cols.date, key.date], [cols[keyField], key.value], [cols.updatedAt, at]);
  const row = buildRow(width, rowValues);

  if (matches.length === 0) {
    await gw.append(`${quoteTab(tab)}!A1:${colLetter(width - 1)}`, [row]);
    return "ok";
  }

  // If two devices ever created duplicates, keep writing to the newest one.
  const target = matches.reduce((a, b) =>
    cellText(b.row[cols.updatedAt]) > cellText(a.row[cols.updatedAt]) ? b : a,
  );
  if (cellText(target.row[cols.updatedAt]) > at) return "stale";
  await gw.write([{ range: rowRange(tab, target.rowNumber, 0, width - 1), values: [row] }]);
  return "ok";
}

async function applyMeal(gw: SheetsGateway, op: MealOp): Promise<OpStatus> {
  const h = TABS.mealLog.headers;
  return upsertLogRow(gw, TABS.mealLog.name, h, "meal", { date: op.date, value: op.meal }, op.at, {
    done: op.done,
    topUp: op.topUp,
  });
}

async function applyWorkout(gw: SheetsGateway, op: WorkoutOp): Promise<OpStatus> {
  const h = TABS.workoutLog.headers;
  return upsertLogRow(gw, TABS.workoutLog.name, h, "session", { date: op.date, value: op.session }, op.at, {
    completed: op.completed,
    minutes: op.minutes ?? "",
    avgHr: op.avgHr ?? "",
    activeKcal: op.activeKcal ?? "",
    effort: op.effort ?? "",
    notes: op.notes ?? "",
  });
}

async function applyCheckin(gw: SheetsGateway, op: CheckinOp): Promise<OpStatus> {
  const tab = TABS.weekly.name;
  const weeklyRange = `${quoteTab(tab)}!A1:Z`;
  const [[grid, dash], [formulas]] = await Promise.all([
    gw.readMany([weeklyRange, `${quoteTab(TABS.dashboard.name)}!A1:Z`]),
    gw.readFormulas([weeklyRange]),
  ]);
  const cols = mapColumns(tab, grid[0], TABS.weekly.headers);
  const label = checkinLabel(op.week);
  const hit = dataRows(grid).find(({ row }) => cellText(row[cols.week]).toLowerCase() === label.toLowerCase());
  if (!hit) throw new SheetStructureError(`Weekly Measurements has no row "${label}"`);
  const formulaRow = formulas[hit.rowNumber - 1] ?? [];
  const isFormula = (col: number) => String(formulaRow[col] ?? "").startsWith("=");
  const updates: ValueUpdate[] = [];
  const write = (col: number, value: Cell, header: string) => {
    // Never overwrite a formula the Sheet relies on.
    if (isFormula(col)) throw new SheetStructureError(`"${header}" in ${label} is a formula; the app won't overwrite it`);
    updates.push({ range: cellRange(tab, hit.rowNumber, col), values: [[value]] });
  };

  // Only fields present in the op are written, so a partial check-in never blanks others.
  for (const field of CHECKIN_FIELDS) {
    const v = op[field];
    if (v === undefined) continue;
    if (field === "weightKg" && isFormula(cols.weightKg)) continue; // saved as that day's weigh-in, below
    write(cols[field], v ?? "", TABS.weekly.headers[field]);
  }
  if (op.notes !== undefined) {
    updates.push({ range: cellRange(tab, hit.rowNumber, cols.notes), values: [[op.notes]] });
  }

  // Recalculate the Navy estimate from the row as it will be after this save: values in the op
  // win, otherwise what's already in the Sheet. Height comes from the Dashboard. If an input is
  // missing or implausible, the estimate cell is cleared rather than left stale.
  if (op.waistCm !== undefined || op.neckCm !== undefined) {
    const waist = op.waistCm !== undefined ? op.waistCm : cellNumber(hit.row[cols.waistCm]);
    const neck = op.neckCm !== undefined ? op.neckCm : cellNumber(hit.row[cols.neckCm]);
    const estimate = navyBodyFatMale(waist, neck, dashboardValue(dash ?? [], "Height (cm)"));
    write(cols.bodyFatNavy, estimate ?? "", TABS.weekly.headers.bodyFatNavy);
  }

  await gw.write(updates);

  // The check-in's Weight cell is a formula that looks up Daily Weight for the check-in date,
  // so a weight entered at check-in is saved as that morning's weigh-in instead.
  if (op.weightKg !== undefined && isFormula(cols.weightKg)) {
    const date = cellDate(hit.row[cols.date]);
    await applyWeight(gw, { id: op.id, at: op.at, type: "weight", date, weightKg: op.weightKg });
  }
  return "ok";
}

export async function applyOp(gw: SheetsGateway, op: Op): Promise<OpStatus> {
  switch (op.type) {
    case "weight":
      return applyWeight(gw, op);
    case "meal":
      return applyMeal(gw, op);
    case "workout":
      return applyWorkout(gw, op);
    case "checkin":
      return applyCheckin(gw, op);
  }
}
