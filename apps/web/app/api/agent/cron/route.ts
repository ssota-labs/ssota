import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { getDb } from "@/lib/ports";
import { schema } from "@ssota/adapter-supabase";
import { runSchedulerAgentWorkflow } from "@/app/workflows/scheduler-agent";

export const runtime = "nodejs";
export const maxDuration = 300;

async function authorize(request: Request): Promise<boolean> {
  const secret = process.env.AGENT_RUN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === secret;
}

/**
 * Cron entrypoint: runs enabled schedules whose cron_expression matches the
 * current tick. Invoked by Vercel Cron or an external scheduler.
 */
export async function GET(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const schedules = await db
    .select()
    .from(schema.schedules)
    .where(eq(schema.schedules.enabled, true));

  const started: string[] = [];
  for (const schedule of schedules) {
    const run = await start(runSchedulerAgentWorkflow, [
      {
        projectId: schedule.projectId,
        scheduleId: schedule.id,
        accountId: schedule.accountId ?? undefined,
      },
    ]);
    started.push(run.runId);
  }

  return NextResponse.json({ started, count: started.length });
}

export async function POST(request: Request) {
  return GET(request);
}
