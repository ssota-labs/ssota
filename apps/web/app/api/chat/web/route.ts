import { after, NextResponse } from "next/server";
import { createUIMessageStreamResponse } from "ai";
import type { FileUIPart, UIMessage, UIMessageChunk } from "ai";
import { z } from "zod";
import { start } from "workflow/api";
import { runMainAgentWorkflow } from "@/app/workflows/main-agent";
import { getChatPort } from "@/lib/ports";
import { resolveModelId } from "@/lib/chat/models";
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

type ModelMessage =
  | { role: "assistant"; content: string }
  | {
      role: "user";
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image"; image: string }
          >;
    };

function toModelMessage(m: UIMessage): ModelMessage | null {
  const text = textOf(m);
  if (m.role === "assistant") {
    return text ? { role: "assistant", content: text } : null;
  }
  const images = (m.parts ?? [])
    .filter(
      (p): p is FileUIPart =>
        p.type === "file" && p.mediaType.startsWith("image/"),
    )
    .map((p) => ({ type: "image" as const, image: p.url }));
  if (images.length === 0) return text ? { role: "user", content: text } : null;
  const content: Array<
    { type: "text"; text: string } | { type: "image"; image: string }
  > = [...(text ? [{ type: "text" as const, text }] : []), ...images];
  return { role: "user", content };
}

/**
 * STUB_MODEL cannot fetch private-IP attachment URLs (127.0.0.1 Storage). Strip
 * images from agent history while still persisting full parts in the thread DB.
 */
function toAgentHistory(messages: UIMessage[]): ModelMessage[] {
  const stub = process.env.STUB_MODEL === "1";
  return messages
    .map((m) => {
      const msg = toModelMessage(m);
      if (!msg || !stub || msg.role !== "user" || typeof msg.content === "string") {
        return msg;
      }
      const textParts = msg.content.filter((p) => p.type === "text");
      const text =
        textParts.map((p) => p.text).join(" ").trim() || "[image attached]";
      return { role: "user", content: text };
    })
    .filter((m): m is ModelMessage => m !== null);
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

  const history = toAgentHistory(messages);

  const run = await start(runMainAgentWorkflow, [
    {
      projectId,
      threadId,
      accountId,
      modelId,
      chatContext: { chat: { messages: history } },
    },
  ]);

  const readable = run.getReadable() as ReadableStream<UIMessageChunk>;
  const [clientStream, persistStream] = readable.tee();

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
