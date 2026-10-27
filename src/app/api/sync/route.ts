import { NextResponse } from "next/server";
import { op as opSchema, syncRequest, type OpResult } from "@/lib/ops";
import { isSameOriginJson, noStore, withUser } from "@/server/api";
import { getGateway } from "@/server/sheets/gateway";
import { applyOp } from "@/server/sheets/repo";
import { SheetStructureError } from "@/server/sheets/schema";

/**
 * Applies queued writes from the device. Each op is validated and applied on its own and
 * gets its own result, so one bad op can't block the rest of the queue:
 *  - ok:      written
 *  - stale:   a newer change from another device is already in the Sheet; dropped
 *  - invalid: failed validation or doesn't fit the Sheet; dropped (retrying won't help)
 *  - error:   transient failure; the device keeps it and retries later
 */
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  return withUser(async () => {
    const body = syncRequest.safeParse(await req.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    // Validate everything first, so bad ops are reported even if the Sheet is unreachable.
    const parsedOps = body.data.ops.map((raw) => ({
      id: typeof (raw as { id?: unknown })?.id === "string" ? (raw as { id: string }).id : "unknown",
      parsed: opSchema.safeParse(raw),
    }));
    const results: OpResult[] = [];
    let gw: ReturnType<typeof getGateway> | null = null;

    // Sequential on purpose: ops for the same row must apply in the order they were made.
    for (const { id, parsed } of parsedOps) {
      if (!parsed.success) {
        results.push({ id, status: "invalid", message: parsed.error.issues[0]?.message });
        continue;
      }
      try {
        gw ??= getGateway();
        results.push({ id, status: await applyOp(gw, parsed.data) });
      } catch (err) {
        if (err instanceof SheetStructureError) {
          results.push({ id, status: "invalid", message: err.message });
        } else {
          console.error("[sync] op failed", parsed.data.type, err);
          results.push({ id, status: "error" });
        }
      }
    }
    return NextResponse.json({ results }, { headers: noStore });
  });
}
