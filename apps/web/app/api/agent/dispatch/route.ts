import { NextResponse } from "next/server";
import { z } from "zod";
import { start } from "workflow/api";
import { runTaskAgentWorkflow } from "@/app/workflows/task-agent";
import { getDb, getTaskPort } from "@/lib/ports";
import { and, eq, sql } from "drizzle-orm";
import { schema } from "@ssota/adapter-postgres";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_CONCURRENCY = 3;

const bodySchema = z.object({
  projectId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(20).optional(),
  modelId: z.string().optional(),
});

async function authorize(request: Request): Promise<boolean> {
  const secret = process.env.AGENT_RUN_SECRET;
  if (secret) {
    const header = request.headers.get("authorization") ?? "";
    const token = header.replace(/^Bearer\s+/i, "");
    if (token && token === secret) return true;
  }
  const user = await getCurrentUser().catch(() => null);
  return Boolean(user);
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  const user = await getCurrentUser().catch(() => null);
  let accountId = parsed.accountId;
  if (user) {
    try {
      const scope = await resolveApiAccountScope(parsed.projectId, {
        referer: request.headers.get("referer"),
        requestedAccountId: parsed.accountId,
      });
      accountId = scope.accountId;
    } catch (error) {
      const response = apiScopeErrorResponse(error);
      if (response) return response;
      throw error;
    }
  }

  const db = getDb();
  const concurrency =
    Number(process.env.AGENT_DISPATCH_CONCURRENCY) || DEFAULT_CONCURRENCY;

  const runningCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.agentRuns)
    .where(
      and(
        eq(schema.agentRuns.projectId, parsed.projectId),
        eq(schema.agentRuns.status, "running"),
        eq(schema.agentRuns.runtimeKind, "task"),
      ),
    );
  const slots = Math.max(0, concurrency - (runningCount[0]?.count ?? 0));

  if (slots === 0) {
    return NextResponse.json({ dispatched: [], skipped: "concurrency_limit" });
  }

  let taskIds: string[] = [];
  if (parsed.taskId) {
    taskIds = [parsed.taskId];
  } else {
    const tasks = await getTaskPort(parsed.projectId, accountId).queryTasks({
      status: "ready",
      executorType: "Agent",
      limit: Math.min(parsed.limit ?? slots, slots),
    });
    taskIds = tasks.map((task) => task.id);
  }

  const dispatched: string[] = [];
  for (const taskId of taskIds) {
    const run = await start(runTaskAgentWorkflow, [
      {
        projectId: parsed.projectId,
        taskId,
        accountId,
        modelId: parsed.modelId,
      },
    ]);
    dispatched.push(run.runId);
  }

  return NextResponse.json({ dispatched, count: dispatched.length });
}
