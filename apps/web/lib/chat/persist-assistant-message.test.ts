import { describe, expect, it } from "vitest";
import type { UIMessageChunk } from "ai";
import { collectAssistantMessageParts } from "./persist-assistant-message";

function chunkStream(chunks: UIMessageChunk[]): ReadableStream<UIMessageChunk> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

describe("collectAssistantMessageParts", () => {
  it("preserves separate text and tool parts instead of flattening text", async () => {
    const parts = await collectAssistantMessageParts(
      chunkStream([
        { type: "start", messageId: "msg-1" },
        { type: "start-step" },
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: "노션 MCP 다시 검색해볼게요!" },
        { type: "text-end", id: "text-1" },
        {
          type: "tool-input-start",
          toolCallId: "tool-1",
          toolName: "connection_search",
        },
        {
          type: "tool-input-available",
          toolCallId: "tool-1",
          toolName: "connection_search",
          input: { query: "notion" },
        },
        {
          type: "tool-output-available",
          toolCallId: "tool-1",
          output: { tools: [{ qualifiedName: "notion__search" }] },
        },
        { type: "text-start", id: "text-2" },
        {
          type: "text-delta",
          id: "text-2",
          delta: "### ✅ Notion 연결 정상 확인!",
        },
        { type: "text-end", id: "text-2" },
        { type: "finish-step" },
        { type: "finish", finishReason: "stop" },
      ]),
    );

    expect(parts).not.toBeNull();
    expect(parts).toHaveLength(3);
    expect(parts!.map((p) => p.type)).toEqual([
      "text",
      "tool-connection_search",
      "text",
    ]);
  });
});
