import "server-only";
import { auth as googleAuth, sheets } from "@googleapis/sheets";

export type Cell = string | number | boolean | null;

export interface ValueUpdate {
  range: string;
  values: Cell[][];
}

/**
 * The only surface the app uses from the Sheets API. Keeping it this small makes the
 * repository testable against an in-memory fake (tests/fake-gateway.ts).
 */
export interface SheetsGateway {
  /** Reads several A1 ranges in one call. Values come back unformatted (numbers as numbers). */
  readMany(ranges: string[]): Promise<Cell[][][]>;
  /** Like readMany, but formula cells come back as their formula text ("=..."). */
  readFormulas(ranges: string[]): Promise<Cell[][][]>;
  /** Writes several ranges in one call. Values are written RAW: text starting with "=" stays text. */
  write(updates: ValueUpdate[]): Promise<void>;
  /** Appends rows after the last row of the table that starts in `range`. */
  append(range: string, rows: Cell[][]): Promise<void>;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/** Vercel's env editor often stores the key's line breaks as literal "\n"; restore them. */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
  return key.replace(/\\n/g, "\n");
}

let cached: SheetsGateway | null = null;

export function getGateway(): SheetsGateway {
  if (cached) return cached;

  const spreadsheetId = requiredEnv("SHEET_ID");
  const client = new googleAuth.JWT({
    email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: normalizePrivateKey(requiredEnv("GOOGLE_PRIVATE_KEY")),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const api = sheets({ version: "v4", auth: client });

  cached = {
    async readMany(ranges) {
      const res = await api.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      });
      return (res.data.valueRanges ?? []).map((vr) => (vr.values ?? []) as Cell[][]);
    },
    async readFormulas(ranges) {
      const res = await api.spreadsheets.values.batchGet({ spreadsheetId, ranges, valueRenderOption: "FORMULA" });
      return (res.data.valueRanges ?? []).map((vr) => (vr.values ?? []) as Cell[][]);
    },
    async write(updates) {
      if (updates.length === 0) return;
      await api.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: updates },
      });
    },
    async append(range, rows) {
      await api.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: rows },
      });
    },
  };
  return cached;
}
