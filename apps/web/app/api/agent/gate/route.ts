import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getTaskPort } from "@ssota/agent-runtime";
import { getJobRunner } from "@/app/workflows/job-runner";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  approved: z.boolean(),
  note: z.string().optional(),
});

async function authorize(request: Request): Promise<boolean> {
  const secret = process.env.AGENT_RUN_SECRET;
  if (secret) {
    const token = (request.headers.get("authorization") ?? "").replace(
      /^Bearer\s+/i,
      "",
    );
    if (token && token === secret) return true;
  }
  return Boolean(await getCurrentUser().catch(() => null));
}

/**
 * Resolve a human-approval gate raised by the `request_approval` tool. On
 * approval the task returns to `ready` and a fresh agent run is started; on
 * rejection the task is cancelled. The gate descriptor lives in the task's
 * `context.gate` (set when the agent blocked).
 */
export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  const tasks = getTaskPort(body.projectId);
  const task = await tasks.getTask(body.taskId);
  if (!task || task.projectId !== body.projectId) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!body.approved) {
    await tasks.updateTask(body.taskId, {
      status: "cancelled",
      context: { gateDecision: { approved: false, note: body.note } },
    });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  // Approved: clear the gate, return to ready, and re-run the agent. The new
  // run re-reads context and continues past the gate (the decision is recorded
  // so the agent can see it was approved).
  await tasks.updateTask(body.taskId, {
    status: "ready",
    context: { gateDecision: { approved: true, note: body.note } },
  });

  const runner = await getJobRunner();
  const run = await runner.start({
    projectId: body.projectId,
    taskId: body.taskId,
    accountId: body.accountId,
  });
  after(run.completion);

  return NextResponse.json({ ok: true, status: "ready", runId: run.runId });
}
