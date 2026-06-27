import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { getDb } from "@/lib/ports";
import { schema, createAgentRunPort } from "@ssota/adapter-postgres";
import { runSchedulerAgentWorkflow } from "@/app/workflows/scheduler-agent";
import { shouldRunNow } from "@/lib/schedules/should-run-now";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Heartbeat interval. The heartbeat (Supabase pg_cron) ticks every minute and
 * each schedule's own cron_expression decides whether it is actually due now.
 */
const TICK_MS = 60_000;

async function authorize(request: Request): Promise<boolean> {
  const secret = process.env.AGENT_RUN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === secret;
}

/**
 * Cron entrypoint: a single heartbeat that fans out to every enabled schedule
 * and runs only those whose cron_expression (evaluated in the schedule's own
 * timezone) is due in the current tick. Schedules outside their window/days are
 * skipped without invoking the agent — that is the token gate.
 */
export async function GET(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const agentRunPort = createAgentRunPort(db);
  const now = new Date();

  const schedules = await db
    .select()
    .from(schema.schedules)
    .where(eq(schema.schedules.enabled, true));

  const started: string[] = [];
  const skipped: string[] = [];

  for (const schedule of schedules) {
    const { run, fire } = shouldRunNow(
      schedule.cronExpression,
      schedule.timezone,
      now,
      TICK_MS,
    );
    if (!run || !fire) {
      skipped.push(schedule.id);
      continue;
    }
    // Dedupe: if this schedule already produced a run for this fire (e.g. a
    // double heartbeat or overlapping buffer), do not spawn another.
    if (await agentRunPort.hasRunForScheduleSince(schedule.id, fire)) {
      skipped.push(schedule.id);
      continue;
    }
    const runHandle = await start(runSchedulerAgentWorkflow, [
      {
        teamspaceId: schedule.teamspaceId,
        scheduleId: schedule.id,
        accountId: schedule.accountId ?? undefined,
      },
    ]);
    started.push(runHandle.runId);
  }

  return NextResponse.json({
    started,
    skipped,
    evaluated: schedules.length,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
