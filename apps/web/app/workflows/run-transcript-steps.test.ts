import { describe, expect, it } from "vitest";
import type { ModelMessage } from "ai";
import { transcriptMessagesFromModelMessages } from "./run-transcript-steps";

describe("transcriptMessagesFromModelMessages", () => {
  it("keeps text + tool parts and folds tool results into the call part", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "태스크 진행해줘" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "확인하겠습니다." },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "get_task",
            input: { taskId: "t1" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "get_task",
            output: { type: "json", value: { id: "t1", status: "ready" } },
          },
        ],
      },
      { role: "assistant", content: "완료했습니다." },
    ];

    const transcript = transcriptMessagesFromModelMessages(messages, 1);
    expect(transcript).toHaveLength(2);
    expect(transcript[0]!.parts).toEqual([
      { type: "text", text: "확인하겠습니다." },
      {
        type: "tool-get_task",
        toolCallId: "call-1",
        input: { taskId: "t1" },
        state: "output-available",
        output: { id: "t1", status: "ready" },
      },
    ]);
    expect(transcript[1]!.parts).toEqual([
      { type: "text", text: "완료했습니다." },
    ]);
  });

  it("marks error tool results as output-error", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-err",
            toolName: "create_node",
            input: {},
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-err",
            toolName: "create_node",
            output: { type: "error-text", value: "VALIDATION_FAILED" },
          },
        ],
      },
    ];

    const transcript = transcriptMessagesFromModelMessages(messages, 0);
    expect(transcript).toHaveLength(1);
    expect(transcript[0]!.parts[0]).toMatchObject({
      type: "tool-create_node",
      state: "output-error",
      errorText: "VALIDATION_FAILED",
    });
  });

  it("marks unresolved tool calls as input-available (crashed before result)", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-2",
            toolName: "sandbox_shell",
            input: { command: "pnpm test" },
          },
        ],
      },
    ];

    const transcript = transcriptMessagesFromModelMessages(messages, 0);
    expect(transcript[0]!.parts[0]).toMatchObject({
      type: "tool-sandbox_shell",
      state: "input-available",
    });
  });

  it("skips input messages and drops empty assistant prose", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "   " },
    ];
    expect(transcriptMessagesFromModelMessages(messages, 1)).toHaveLength(0);
  });
});
