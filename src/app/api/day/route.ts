import { NextResponse } from "next/server";
import { isLoggableDate } from "@/lib/plan";
import { noStore, withUser } from "@/server/api";
import { getGateway } from "@/server/sheets/gateway";
import { getDay } from "@/server/sheets/repo";

export async function GET(req: Request) {
  return withUser(async () => {
    const date = new URL(req.url).searchParams.get("date") ?? "";
    if (!isLoggableDate(date)) {
      return NextResponse.json({ error: "bad_date" }, { status: 400 });
    }
    const day = await getDay(getGateway(), date);
    return NextResponse.json(day, { headers: noStore });
  });
}
