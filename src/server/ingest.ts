import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/** Shortest token accepted; anything shorter in the environment counts as "not configured". */
export const MIN_TOKEN_LENGTH = 32;

export type TokenCheck = "ok" | "disabled" | "unauthorized";

/**
 * Checks `Authorization: Bearer <token>` against INGEST_TOKEN.
 * - No (or too short) INGEST_TOKEN in the environment → "disabled": the endpoint is off.
 * - Both sides are hashed first so the comparison is constant-time and length-independent.
 */
export function checkIngestToken(authorization: string | null, expected = process.env.INGEST_TOKEN): TokenCheck {
  if (!expected || expected.trim().length < MIN_TOKEN_LENGTH) return "disabled";
  const m = /^Bearer\s+(\S+)\s*$/i.exec(authorization ?? "");
  if (!m) return "unauthorized";
  const a = createHash("sha256").update(m[1]).digest();
  const b = createHash("sha256").update(expected.trim()).digest();
  return timingSafeEqual(a, b) ? "ok" : "unauthorized";
}

/** Largest request body accepted, in bytes. A day with 20 workouts is well under this. */
export const MAX_BODY_BYTES = 32 * 1024;
