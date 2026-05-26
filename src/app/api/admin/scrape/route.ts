import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runScrape } from "@/lib/scrapeRunner";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const headerToken = request.headers.get("x-admin-token");
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = headerToken || bearer;

  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScrape();
  return NextResponse.json(result);
}
