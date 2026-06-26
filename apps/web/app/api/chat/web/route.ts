import { NextResponse } from "next/server";
import { createUIMessageStreamResponse } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { after } from "next/server";
import { getMainAgentRunner } from "@/app/workflows/main-agent-job-runner";
import { getChatPort } from "@/lib/ports";
import { resolveModelId } from "@/lib/chat/models";
import { toAgentHistory } from "@/lib/chat/to-agent-history";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  projectId: z.string().uuid(),
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

  const { projectId, threadId } = body;
  let scope;
  try {
    scope = await resolveApiAccountScope(projectId, {
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
  const chat = getChatPort(projectId, accountId);

  const thread = await chat.getThread(threadId);
  if (!thread || thread.projectId !== projectId) {
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

  const runner = await getMainAgentRunner();
  const run = await runner.start({
    projectId,
    threadId,
    accountId,
    modelId,
    chatContext: { chat: { messages: history } },
  });
  after(run.completion);

  const readable = run.getReadable();

  return createUIMessageStreamResponse({ stream: readable });
}
