import { start } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import {
  createModelCallToUIChunkTransform,
  type ModelCallStreamPart,
} from "@ai-sdk/workflow";
import { runMainWorkflowAgent } from "@/app/workflows/main-workflow-agent";

// Entry point for the WorkflowAgent-backed main agent. Makes the workflow
// reachable so the WDK directive scanner discovers it.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    projectId: string;
    threadId: string;
    accountId?: string;
    modelId?: string;
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const run = await start(runMainWorkflowAgent, [
    {
      projectId: body.projectId,
      threadId: body.threadId,
      accountId: body.accountId,
      modelId: body.modelId,
      messages: body.messages ?? [{ role: "user", content: "hello" }],
    },
  ]);

  const readable = run.getReadable() as ReadableStream<ModelCallStreamPart>;
  return createUIMessageStreamResponse({
    stream: readable.pipeThrough(createModelCallToUIChunkTransform()),
    headers: { "x-workflow-run-id": run.runId },
  });
}
