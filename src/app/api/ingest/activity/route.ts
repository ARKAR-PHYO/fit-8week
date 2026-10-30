import { connection, NextResponse } from "next/server";
import { activityPayload } from "@/lib/activity";
import { noStore } from "@/server/api";
import { checkIngestToken, MAX_BODY_BYTES } from "@/server/ingest";
import { getGateway } from "@/server/sheets/gateway";
import { applyActivity } from "@/server/sheets/repo";
import { SheetStructureError } from "@/server/sheets/schema";

/**
 * Receives daily Apple Watch activity from the iPhone Shortcut.
 *
 * This is the one API route without Google sign-in (a Shortcut can't do OAuth), so it is
 * deliberately narrow: bearer token only, write-only (the response holds no Sheet data),
 * and it can only write the Daily Activity and Watch Workouts tabs.
 */
export async function POST(req: Request) {
  await connection();

  const token = checkIngestToken(req.headers.get("authorization"));
  if (token === "disabled") {
    return NextResponse.json({ error: "disabled" }, { status: 503, headers: noStore });
  }
  if (token !== "ok") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "bad_request", message: "Send JSON" }, { status: 400, headers: noStore });
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413, headers: noStore });
  }
  const text = await req.text().catch(() => "");
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413, headers: noStore });
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_request", message: "Body is not valid JSON" }, { status: 400, headers: noStore });
  }
  const parsed = activityPayload.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid payload";
    return NextResponse.json({ error: "invalid", message }, { status: 422, headers: noStore });
  }

  try {
    const result = await applyActivity(getGateway(), parsed.data);
    return NextResponse.json({ ok: true, date: parsed.data.date, ...result }, { headers: noStore });
  } catch (err) {
    if (err instanceof SheetStructureError) {
      return NextResponse.json({ error: "sheet_structure", message: err.message }, { status: 409, headers: noStore });
    }
    console.error("[ingest] activity write failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: noStore });
  }
}
