import { and, eq, sql } from "drizzle-orm";
import { start } from "workflow/api";
import { schema } from "@ssota/adapter-postgres";
import { runTaskAgentWorkflow } from "@/app/workflows/task-agent";
import { getDb, getTaskPort } from "@/lib/ports";

const DEFAULT_CONCURRENCY = 3;

export interface DispatchReadyTasksInput {
  projectId: string;
  accountId?: string;
  /** Dispatch a specific task instead of querying ready ones. */
  taskId?: string;
  limit?: number;
  modelId?: string;
}

export interface DispatchResult {
  dispatched: string[];
  skipped?: "concurrency_limit";
}

/**
 * Start task-agent workflows for ready Agent tasks (or a specific task),
 * respecting a per-project concurrency cap based on currently-running task
 * runs. Shared by the /api/agent/dispatch endpoint and the chat route's
 * post-response auto-dispatch (so a task spawned mid-conversation executes
 * without a separate manual dispatch).
 */
export async function dispatchReadyTasks(
  input: DispatchReadyTasksInput,
): Promise<DispatchResult> {
  const db = getDb();
  const concurrency =
    Number(process.env.AGENT_DISPATCH_CONCURRENCY) || DEFAULT_CONCURRENCY;

  const runningCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.agentRuns)
    .where(
      and(
        eq(schema.agentRuns.projectId, input.projectId),
        eq(schema.agentRuns.status, "running"),
        eq(schema.agentRuns.runtimeKind, "task"),
      ),
    );
  const slots = Math.max(0, concurrency - (runningCount[0]?.count ?? 0));
  if (slots === 0) {
    return { dispatched: [], skipped: "concurrency_limit" };
  }

  let taskIds: string[];
  if (input.taskId) {
    taskIds = [input.taskId];
  } else {
    const tasks = await getTaskPort(input.projectId, input.accountId).queryTasks({
      status: "ready",
      executorType: "Agent",
      limit: Math.min(input.limit ?? slots, slots),
    });
    taskIds = tasks.map((task) => task.id);
  }

  const dispatched: string[] = [];
  for (const taskId of taskIds) {
    const run = await start(runTaskAgentWorkflow, [
      {
        projectId: input.projectId,
        taskId,
        accountId: input.accountId,
        modelId: input.modelId,
      },
    ]);
    dispatched.push(run.runId);
  }

  return { dispatched };
}
