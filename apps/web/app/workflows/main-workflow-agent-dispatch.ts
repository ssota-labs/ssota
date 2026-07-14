import {
  getDb,
  runMainAgentToolStep,
  type AgentRunContext,
} from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-postgres";

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

/**
 * 툴콜 1건을 run 트랜스크립트에 incremental 기록한다 (crash-visible — 런이
 * 중간에 죽어도 그때까지의 툴콜은 로그에 남는다). finalize의
 * replaceRunTranscript가 canonical 전체 트랜스크립트로 대체한다. 기록 실패가
 * 툴 실행을 실패시키지 않도록 best-effort.
 */
async function recordToolEvent(
  workflowRunId: string,
  toolName: string,
  toolCallId: string,
  input: unknown,
  result: { output: unknown } | { errorText: string },
): Promise<void> {
  try {
    await createAgentRunPort(getDb()).appendToolEvent({
      workflowRunId,
      toolCallId,
      parts: [
        {
          type: `tool-${toolName}`,
          toolCallId,
          input: capJsonValue(input),
          ...("output" in result
            ? { state: "output-available", output: capJsonValue(result.output) }
            : { state: "output-error", errorText: result.errorText }),
        },
      ],
    });
  } catch {
    // best-effort telemetry — 툴 결과 자체는 durable step 반환값으로 보존된다.
  }
}

/**
 * Durable `"use step"` that executes one real SSOTA / Composio / sandbox tool.
 */
export async function dispatchMainTool(
  toolName: string,
  input: unknown,
  context: { ssota: AgentRunContext },
  toolCallId?: string,
): Promise<unknown> {
  "use step";
  try {
    const output = await runMainAgentToolStep(toolName, input, context.ssota);
    if (toolCallId) {
      await recordToolEvent(context.ssota.runId, toolName, toolCallId, input, {
        output,
      });
    }
    return output;
  } catch (error) {
    if (toolCallId) {
      await recordToolEvent(context.ssota.runId, toolName, toolCallId, input, {
        errorText: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}
