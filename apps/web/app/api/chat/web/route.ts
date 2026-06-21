import { after, NextResponse } from "next/server";
import { createUIMessageStreamResponse } from "ai";
import type { UIMessage, UIMessageChunk } from "ai";
import { z } from "zod";
import { start } from "workflow/api";
import { spawnTask } from "@ssota/core";
import { getGraphReadPort, getTaskPort } from "@ssota/agent-runtime";
import { runSsotaAgentWorkflow } from "@/app/workflows/ssota-agent";
import { getChatPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// The AI SDK `useChat` transport posts the full UIMessage[]; `projectId` and
// `threadId` are appended via the transport's custom `body`.
const bodySchema = z.object({
  projectId: z.string().uuid(),
  threadId: z.string().uuid(),
  accountId: z.string().uuid(),
  messages: z.array(z.any()),
});

/** Flatten a UIMessage's text parts into a single string. */
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

  const { projectId, threadId, accountId } = body;
  const messages = body.messages as UIMessage[];
  const chat = getChatPort(projectId, accountId);

  const thread = await chat.getThread(threadId);
  if (!thread || thread.projectId !== projectId) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const newUserText = lastUser ? textOf(lastUser) : "";
  if (!newUserText) {
    return NextResponse.json({ error: "Empty message" }, { status: 422 });
  }

  // Persist the user turn so the conversation rehydrates on reload.
  await chat.appendMessage({
    threadId,
    role: "user",
    parts: lastUser?.parts ?? [{ type: "text", text: newUserText }],
  });

  // Replay the whole client-side conversation into the agent (multi-turn memory).
  const history = messages
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: textOf(m),
    }))
    .filter((m) => m.content.length > 0);

  const task = await spawnTask(
    {
      tasks: getTaskPort(projectId, accountId),
      graphRead: getGraphReadPort(projectId, accountId),
    },
    projectId,
    {
      title: newUserText.slice(0, 120),
      workflowKey: "agent.main",
      executorType: "Agent",
      context: {
        channel: "web",
        threadId,
        chat: { messages: history },
      },
    },
  );

  const run = await start(runSsotaAgentWorkflow, [
    { projectId, taskId: task.id, accountId },
  ]);

  const readable = run.getReadable() as ReadableStream<UIMessageChunk>;
  const [clientStream, persistStream] = readable.tee();

  // Persist the assistant turn after the response streams out (text-delta only).
  after(async () => {
    const text = await collectText(persistStream);
    if (text.trim()) {
      await chat.appendMessage({
        threadId,
        role: "assistant",
        parts: [{ type: "text", text }],
      });
    }
  });

  return createUIMessageStreamResponse({ stream: clientStream });
}

async function collectText(
  stream: ReadableStream<UIMessageChunk>,
): Promise<string> {
  const reader = stream.getReader();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value as { type?: string; delta?: string } | undefined;
      if (chunk?.type === "text-delta" && typeof chunk.delta === "string") {
        text += chunk.delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return text;
}
