import { NextResponse } from "next/server";
import { z } from "zod";
import { start } from "workflow/api";
import { spawnTask } from "@ssota/core";
import { getGraphReadPort, getTaskPort } from "@ssota/agent-runtime";
import { runSsotaAgentWorkflow } from "@/app/workflows/ssota-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  projectId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  text: z.string().min(1),
  threadId: z.string().optional(),
  user: z.string().optional(),
  messageId: z.string().optional(),
});

function authorize(request: Request): boolean {
  const secret = process.env.AGENT_RUN_SECRET;
  if (!secret) return true; // open in dev
  const token = (request.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  return token === secret;
}

/**
 * Chat SDK delivery adapter (Phase 6). One endpoint per platform
 * (slack/web/telegram/...) — inbound messages become `executorType=Agent`
 * tasks routed through the same durable `runSsotaAgentWorkflow`. "Build the
 * agent once, connect anywhere." Streaming the reply back to the platform is
 * the remaining piece (needs the workflow to stream UIMessageChunks + a
 * per-platform adapter); this returns the run id to track.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (!authorize(request)) {
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

  const task = await spawnTask(
    {
      tasks: getTaskPort(body.projectId, body.accountId),
      graphRead: getGraphReadPort(body.projectId, body.accountId),
    },
    body.projectId,
    {
      title: body.text.slice(0, 120),
      workflowKey: "agent.main",
      executorType: "Agent",
      context: {
        channel: platform,
        threadId: body.threadId,
        user: body.user,
        message: body.text,
      },
      idempotencyKey: body.messageId
        ? `chat-${platform}-${body.messageId}`
        : undefined,
    },
  );

  const run = await start(runSsotaAgentWorkflow, [
    {
      projectId: body.projectId,
      taskId: task.id,
      accountId: body.accountId,
    },
  ]);

  return NextResponse.json({ runId: run.runId, taskId: task.id });
}
