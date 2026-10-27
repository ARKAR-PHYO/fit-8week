import "server-only";
import { connection, NextResponse } from "next/server";
import { SheetStructureError } from "./sheets/schema";
import { requireUser, UnauthorizedError } from "./session";

/**
 * Wraps a route handler: requires an allowlisted session, then maps known errors to
 * responses without leaking internals. Sheet structure problems are surfaced as 409 so the
 * UI can say "the Sheet layout changed" instead of failing silently.
 */
export async function withUser(handler: (user: { email: string }) => Promise<Response>): Promise<Response> {
  // Personal data must never be prerendered at build time. This also keeps the framework's
  // prerender signal outside the try/catch below, so it isn't mistaken for an app error.
  await connection();
  try {
    const user = await requireUser();
    return await handler(user);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (err instanceof SheetStructureError) {
      return NextResponse.json({ error: "sheet_structure", message: err.message }, { status: 409 });
    }
    console.error("[api] unexpected error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/**
 * Rejects cross-site writes. The session cookie is SameSite=Lax already; this also refuses
 * requests whose Origin doesn't match the host, and anything that isn't JSON.
 */
export function isSameOriginJson(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) return false;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const noStore = { "Cache-Control": "private, no-store" };
