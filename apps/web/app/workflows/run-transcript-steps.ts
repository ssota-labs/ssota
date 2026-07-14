import type { ModelMessage } from "ai";
import { getDb } from "@ssota/agent-runtime";
import {
  createAgentRunPort,
  type TranscriptMessageInput,
} from "@ssota/adapter-postgres";

/** 트랜스크립트에 저장하는 JSON 값의 상한 (초과분은 preview로 truncate). */
const MAX_PART_JSON_CHARS = 16_384;

function capJsonValue(value: unknown): unknown {
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized === "string" && serialized.length > MAX_PART_JSON_CHARS) {
      return { truncated: true, preview: serialized.slice(0, MAX_PART_JSON_CHARS) };
    }
    return value;
  } catch {
    return { truncated: true, preview: String(value).slice(0, MAX_PART_JSON_CHARS) };
  }
}

interface ToolResultInfo {
  output?: unknown;
  errorText?: string;
}

function toolResultInfo(output: unknown): ToolResultInfo {
  if (output && typeof output === "object" && "type" in output) {
    const typed = output as { type: string; value?: unknown };
    if (typed.type === "error-text" || typed.type === "error-json") {
      return {
        errorText:
          typeof typed.value === "string"
            ? typed.value
            : JSON.stringify(typed.value),
      };
    }
    if ("value" in typed) return { output: typed.value };
  }
  return { output };
}

/**
 * 런 종료 후의 ModelMessage 배열을 run-log 뷰어용 UIMessage-part 트랜스크립트로
 * 변환한다. `assistantPartsFromMessages`(main-workflow-agent-steps)와 달리
 * tool-call/-result를 **유지**한다 — chat_messages의 "prose only" 계약과 별개로
 * agent_run_messages에는 전체 실행 내역이 남는다. tool 역할 메시지는 해당
 * tool-call part에 output/errorText로 접어 넣는다 (AI SDK UIMessage 관례).
 */
export function transcriptMessagesFromModelMessages(
  messages: ModelMessage[],
  inputCount: number,
): TranscriptMessageInput[] {
  const produced = messages.slice(inputCount);

  const resultsByToolCallId = new Map<string, ToolResultInfo>();
  for (const message of produced) {
    if (message.role !== "tool" || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type === "tool-result") {
        resultsByToolCallId.set(part.toolCallId, toolResultInfo(part.output));
      }
    }
  }

  const transcript: TranscriptMessageInput[] = [];
  for (const message of produced) {
    if (message.role !== "assistant") continue;
    const parts: unknown[] = [];
    const content = message.content;
    if (typeof content === "string") {
      if (content.trim()) parts.push({ type: "text", text: content });
    } else {
      for (const part of content) {
        if (part.type === "text" && part.text.trim()) {
          parts.push({ type: "text", text: part.text });
        } else if (part.type === "tool-call") {
          const result = resultsByToolCallId.get(part.toolCallId);
          parts.push({
            type: `tool-${part.toolName}`,
            toolCallId: part.toolCallId,
            input: capJsonValue(part.input),
            ...(result
              ? result.errorText !== undefined
                ? { state: "output-error", errorText: result.errorText }
                : { state: "output-available", output: capJsonValue(result.output) }
              : { state: "input-available" }),
          });
        }
      }
    }
    if (parts.length > 0) transcript.push({ role: "assistant", parts });
  }
  return transcript;
}

/**
 * 런의 canonical 트랜스크립트를 저장한다 (dispatch가 남긴 incremental 툴
 * 이벤트 행을 대체). durable step이므로 재시도 시 delete+insert가 반복될 뿐
 * 중복이 생기지 않는다.
 */
export async function persistRunTranscriptStep(
  workflowRunId: string,
  messages: ModelMessage[],
  inputCount: number,
): Promise<void> {
  "use step";
  const transcript = transcriptMessagesFromModelMessages(messages, inputCount);
  await createAgentRunPort(getDb()).replaceRunTranscript(
    workflowRunId,
    transcript,
  );
}
