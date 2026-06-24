import {
  convertToModelMessages,
  type ModelMessage,
  type UIMessage,
} from "ai";

function stripImagesForStub(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((message) => {
    if (message.role !== "user") return message;
    if (typeof message.content === "string") return message;
    const textParts = message.content.filter((part) => part.type === "text");
    const text =
      textParts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(" ")
        .trim() || "[image attached]";
    return { role: "user", content: text };
  });
}

/**
 * Convert persisted chat UI messages into model messages for the agent runtime.
 * Preserves tool calls/results so connection_search hits survive across turns.
 */
export async function toAgentHistory(
  messages: UIMessage[],
): Promise<ModelMessage[]> {
  const modelMessages = await convertToModelMessages(
    messages.map(({ id: _id, ...rest }) => rest),
    { ignoreIncompleteToolCalls: true },
  );

  if (process.env.STUB_MODEL === "1") {
    return stripImagesForStub(modelMessages);
  }

  return modelMessages;
}
