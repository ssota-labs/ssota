import { getRun } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import {
  createModelCallToUIChunkTransform,
  type ModelCallStreamPart,
} from "@ai-sdk/workflow";

// Resumable-stream endpoint for WorkflowChatTransport: reconnects to a running
// (or completed) WorkflowAgent run and replays its stream from `startIndex`.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const startIndexParam = new URL(request.url).searchParams.get("startIndex");
  const startIndex = startIndexParam ? Number(startIndexParam) : undefined;

  const run = getRun(runId);
  const readable = run.getReadable(
    startIndex !== undefined && Number.isFinite(startIndex)
      ? { startIndex }
      : undefined,
  ) as ReadableStream<ModelCallStreamPart>;

  return createUIMessageStreamResponse({
    stream: readable.pipeThrough(createModelCallToUIChunkTransform()),
    headers: { "x-workflow-run-id": runId },
  });
}
