import { NextResponse } from "next/server";
import { noStore, withUser } from "@/server/api";
import { getGateway } from "@/server/sheets/gateway";
import { getProgress } from "@/server/sheets/repo";

export async function GET() {
  return withUser(async () => {
    const progress = await getProgress(getGateway());
    return NextResponse.json(progress, { headers: noStore });
  });
}
