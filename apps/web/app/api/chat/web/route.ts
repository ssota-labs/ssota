import { NextResponse } from "next/server";
import { createUIMessageStreamResponse } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { start } from "workflow/api";
import {
  createModelCallToUIChunkTransform,
  type ModelCallStreamPart,
} from "@ai-sdk/workflow";
import { runMainWorkflowAgent } from "@/app/workflows/main-workflow-agent";
import { getChatPort } from "@/lib/ports";
import { resolveModelId } from "@/lib/chat/models";
import { toAgentHistory } from "@/lib/chat/to-agent-history";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  teamspaceId: z.string().uuid(),
  threadId: z.string().uuid(),
  accountId: z.string().uuid(),
  modelId: z.string().optional(),
  messages: z.array(z.any()),
});

function textOf(message: UIMessage): string {
  const parts = (message.parts ?? []) as Array<{ type?: string; text?: string }>;
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("")
    .trim();
}

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
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

  const { teamspaceId, threadId } = body;
  let scope;
  try {
    scope = await resolveApiAccountScope(teamspaceId, {
      referer: request.headers.get("referer"),
      requestedAccountId: body.accountId,
    });
  } catch (error) {
    const response = apiScopeErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const accountId = scope.accountId;
  const modelId = resolveModelId(body.modelId);
  const messages = body.messages as UIMessage[];
  const chat = getChatPort(teamspaceId, accountId);

  const thread = await chat.getThread(threadId);
  if (!thread || thread.teamspaceId !== teamspaceId) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.accountId && thread.accountId !== accountId) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const newUserText = lastUser ? textOf(lastUser) : "";
  if (!newUserText) {
    return NextResponse.json({ error: "Empty message" }, { status: 422 });
  }

  await chat.appendMessage({
    threadId,
    role: "user",
    parts: lastUser?.parts ?? [{ type: "text", text: newUserText }],
  });

  const history = await toAgentHistory(messages);

  // Durable WorkflowAgent run on the WDK — detached server-side (no completion
  // to await). Output streams as ModelCallStreamPart; transform to UI chunks.
  // profileId = the signed-in user (the Composio acting entity for connectors).
  const run = await start(runMainWorkflowAgent, [
    {
      teamspaceId,
      threadId,
      accountId,
      profileId: user.id,
      modelId,
      chatContext: { chat: { messages: history } },
    },
  ]);

  const readable = run.getReadable() as ReadableStream<ModelCallStreamPart>;
  return createUIMessageStreamResponse({
    stream: readable.pipeThrough(createModelCallToUIChunkTransform()),
    headers: { "x-workflow-run-id": run.runId },
  });
}
