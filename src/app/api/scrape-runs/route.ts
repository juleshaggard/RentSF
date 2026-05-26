import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ScrapeRunDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const runs = await prisma.scrapeRun.findMany({
      take: 12,
      orderBy: { startedAt: "desc" }
    });

    const payload: ScrapeRunDTO[] = runs.map((run) => ({
      id: run.id,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      status: run.status,
      totalFound: run.totalFound,
      newCount: run.newCount,
      updatedCount: run.updatedCount,
      inactiveCount: run.inactiveCount,
      sourceStats: run.sourceStats,
      errors: run.errors
    }));

    return NextResponse.json({ runs: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ runs: [], error: message }, { status: 200 });
  }
}
