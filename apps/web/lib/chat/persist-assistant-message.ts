import {
  isReasoningUIPart,
  isTextUIPart,
  readUIMessageStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

/**
 * Keep every assistant UI part for faithful DB rehydration. UI may choose not to
 * render some types (reasoning, sources, step boundaries, etc.).
 */
function isPersistablePart(part: UIMessage["parts"][number]): boolean {
  if (isTextUIPart(part) || isReasoningUIPart(part)) {
    return part.text.trim().length > 0;
  }
  return true;
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
