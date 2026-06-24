import {
  isToolUIPart,
  readUIMessageStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

function isPersistablePart(part: UIMessage["parts"][number]): boolean {
  if (part.type === "step-start") return false;
  if (part.type === "text") {
    const text = (part as { text?: string }).text;
    return typeof text === "string" && text.trim().length > 0;
  }
  if (isToolUIPart(part)) return true;
  return false;
}

/** Reconstruct the final assistant UIMessage parts from a UI message stream. */
export async function collectAssistantMessageParts(
  stream: ReadableStream<UIMessageChunk>,
): Promise<UIMessage["parts"] | null> {
  let final: UIMessage | null = null;

  for await (const message of readUIMessageStream({ stream })) {
    final = message;
  }

  if (!final || final.parts.length === 0) return null;

  const parts = final.parts.filter(isPersistablePart);

  return parts.length > 0 ? parts : null;
}
