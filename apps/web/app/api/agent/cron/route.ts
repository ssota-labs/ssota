import { NextResponse } from "next/server";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { start } from "workflow/api";
import { getDb } from "@/lib/ports";
import { schema } from "@ssota/adapter-postgres";
import { runSchedulerAgentWorkflow } from "@/app/workflows/scheduler-agent";
import { nextOccurrence } from "@/lib/schedules/recurrence";

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
 * Cron entrypoint (Supabase pg_cron heartbeat, ~1/min).
 *
 * Instead of scanning every enabled schedule each tick, we select only rows the
 * index says are due (`next_run_at <= now`), plus rows that still need their
 * next_run_at computed (`next_run_at IS NULL` — fresh after the column was
 * added). For a due row we claim it with an atomic compare-and-advance of
 * next_run_at (concurrency-safe against overlapping heartbeats) and only then
 * start the agent. Everything outside a schedule's window/days simply has a
 * future next_run_at, so it is never selected and no tokens are spent.
 */
export async function GET(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();

  const candidates = await db
    .select()
    .from(schema.schedules)
    .where(
      and(
        eq(schema.schedules.enabled, true),
        or(
          isNull(schema.schedules.nextRunAt),
          lte(schema.schedules.nextRunAt, now),
        ),
      ),
    );

  const started: string[] = [];
  const skipped: string[] = [];
  const repaired: string[] = [];

  for (const schedule of candidates) {
    const next = nextOccurrence(schedule.cronExpression, schedule.timezone, now);

    // Newly-migrated row with no next_run_at yet: schedule it forward without
    // firing (we can't know whether it was due in the past).
    if (schedule.nextRunAt === null) {
      await db
        .update(schema.schedules)
        .set({ nextRunAt: next })
        .where(eq(schema.schedules.id, schedule.id));
      repaired.push(schedule.id);
      continue;
    }

    // Claim this fire: advance next_run_at, but only while the row is still due.
    // A concurrent heartbeat that already advanced it past `now` makes this
    // update match 0 rows, so the agent is dispatched exactly once. Using
    // `<= now` (not exact-equality) keeps the claim robust to timestamp
    // precision differences.
    const claimed = await db
      .update(schema.schedules)
      .set({ nextRunAt: next })
      .where(
        and(
          eq(schema.schedules.id, schedule.id),
          eq(schema.schedules.enabled, true),
          lte(schema.schedules.nextRunAt, now),
        ),
      )
      .returning({ id: schema.schedules.id });
    if (claimed.length === 0) {
      skipped.push(schedule.id);
      continue;
    }

    const runHandle = await start(runSchedulerAgentWorkflow, [
      {
        projectId: schedule.projectId,
        scheduleId: schedule.id,
        accountId: schedule.accountId ?? undefined,
      },
    ]);
    started.push(runHandle.runId);
  }

  return NextResponse.json({
    started,
    skipped,
    repaired,
    evaluated: candidates.length,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
