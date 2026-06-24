import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { toAgentHistory } from "./to-agent-history";

describe("toAgentHistory", () => {
  it("preserves connection_search tool calls and results for later turns", async () => {
    const messages: UIMessage[] = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "슬랙에 메시지 보내줘" }],
      },
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          { type: "text", text: "슬랙 도구를 찾아볼게요." },
          {
            type: "tool-connection_search",
            toolCallId: "tool-1",
            state: "output-available",
            input: { query: "slack send message", connection: "slack" },
            output: {
              connections: [{ connection: "slack", connected: true }],
              matched: [
                {
                  qualifiedName: "slack__slack_send_message",
                  connection: "slack",
                  tool: "slack_send_message",
                  argsSchema: {
                    required: ["channel_id", "text"],
                    properties: {
                      channel_id: "Channel or DM ID",
                      text: "Message text",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      {
        id: "user-2",
        role: "user",
        parts: [{ type: "text", text: "default 채널로 보내줘" }],
      },
    ];

    const history = await toAgentHistory(messages);

    const assistantWithToolCall = history.find(
      (message) =>
        message.role === "assistant" &&
        Array.isArray(message.content) &&
        message.content.some(
          (part) =>
            part.type === "tool-call" &&
            part.toolName === "connection_search",
        ),
    );
    expect(assistantWithToolCall).toBeDefined();

    const toolResult = history.find(
      (message) =>
        message.role === "tool" &&
        Array.isArray(message.content) &&
        message.content.some(
          (part) =>
            part.type === "tool-result" &&
            part.toolName === "connection_search",
        ),
    );
    expect(toolResult).toBeDefined();
  });

  it("still strips images for STUB_MODEL", async () => {
    const prev = process.env.STUB_MODEL;
    process.env.STUB_MODEL = "1";

    try {
      const history = await toAgentHistory([
        {
          id: "user-1",
          role: "user",
          parts: [
            { type: "text", text: "look" },
            {
              type: "file",
              url: "http://127.0.0.1/image.png",
              mediaType: "image/png",
            },
          ],
        },
      ]);

      expect(history).toEqual([{ role: "user", content: "look" }]);
    } finally {
      if (prev === undefined) delete process.env.STUB_MODEL;
      else process.env.STUB_MODEL = prev;
    }
  });
});
