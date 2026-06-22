import { createGateway, type LanguageModel } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";

/**
 * Default model id (AI Gateway "provider/model" form). Routing, observability
 * and fallback are handled by the Gateway, so we depend on no provider SDK.
 */
export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4.6";

/** User message substring that triggers the connection_search E2E stub sequence. */
export const STUB_CONNECTION_SEARCH_TRIGGER = "e2e-connection-search";

const attributionHeaders = {
  "x-title": "SSOTA Agent Runtime",
};

const stubUsage = {
  inputTokens: { total: 1, noCache: 1 },
  outputTokens: { total: 8, text: 8 },
};

function finishChunk(
  reason: "stop" | "tool-calls" = "stop",
): {
  type: "finish";
  finishReason: { unified: typeof reason; raw: undefined };
  usage: typeof stubUsage;
} {
  return {
    type: "finish",
    finishReason: { unified: reason, raw: undefined },
    usage: stubUsage,
  };
}

function textStreamChunks(text: string) {
  return [
    { type: "stream-start" as const, warnings: [] },
    { type: "text-start" as const, id: "0" },
    ...text.split(" ").map((word, i) => ({
      type: "text-delta" as const,
      id: "0",
      delta: i === 0 ? word : ` ${word}`,
    })),
    { type: "text-end" as const, id: "0" },
    finishChunk("stop"),
  ];
}

function toolCallStreamChunks(
  toolCallId: string,
  toolName: string,
  input: Record<string, unknown>,
) {
  return [
    { type: "stream-start" as const, warnings: [] },
    {
      type: "tool-call" as const,
      toolCallId,
      toolName,
      input: JSON.stringify(input),
    },
    finishChunk("tool-calls"),
  ];
}

function promptContainsTrigger(prompt: unknown, trigger: string): boolean {
  if (!Array.isArray(prompt)) return false;
  for (const message of prompt) {
    if (
      typeof message !== "object" ||
      message === null ||
      (message as { role?: string }).role !== "user"
    ) {
      continue;
    }
    const content = (message as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        typeof part === "object" &&
        part !== null &&
        (part as { type?: string }).type === "text" &&
        typeof (part as { text?: string }).text === "string" &&
        (part as { text: string }).text.includes(trigger)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Dev/local stub model (STUB_MODEL=1): streams a canned reply with no API key
 * so the full chat pipeline (route → workflow → stream → UI) is runnable for
 * e2e without an AI Gateway key. Dev-only seam — not used in production.
 *
 * When the user message contains {@link STUB_CONNECTION_SEARCH_TRIGGER}, the
 * stub runs connection_search → linear__search_issues → a short text reply so
 * E2E can exercise progressive disclosure without a real model.
 */
function stubModel(): LanguageModel {
  const defaultReply =
    "Hi — I'm the local stub agent. The chat streaming pipeline works end to end.";
  const connectionReply =
    "Linear search completed via connection_search — stub MCP returned one issue.";

  let connectionStep = 0;

  return new MockLanguageModelV3({
    modelId: "stub/echo",
    doStream: async (options) => {
      const useConnectionFlow =
        process.env.STUB_MODEL_CONNECTIONS === "1" ||
        promptContainsTrigger(options.prompt, STUB_CONNECTION_SEARCH_TRIGGER);

      if (!useConnectionFlow) {
        return {
          stream: simulateReadableStream({
            chunks: textStreamChunks(defaultReply) as never,
            chunkDelayInMs: 15,
          }),
        };
      }

      const step = connectionStep++;
      if (step === 0) {
        return {
          stream: simulateReadableStream({
            chunks: toolCallStreamChunks("stub-conn-search", "connection_search", {
              query: "linear",
            }) as never,
            chunkDelayInMs: 5,
          }),
        };
      }
      if (step === 1) {
        return {
          stream: simulateReadableStream({
            chunks: toolCallStreamChunks(
              "stub-linear-search",
              "linear__search_issues",
              { query: "e2e" },
            ) as never,
            chunkDelayInMs: 5,
          }),
        };
      }
      return {
        stream: simulateReadableStream({
          chunks: textStreamChunks(connectionReply) as never,
          chunkDelayInMs: 15,
        }),
      };
    },
  });
}

/**
 * Resolve a Gateway-backed `LanguageModel` for a "provider/model" id. Auth is
 * via `AI_GATEWAY_API_KEY` / OIDC on Vercel.
 */
export function gateway(modelId: string = DEFAULT_MODEL_ID): LanguageModel {
  if (process.env.STUB_MODEL === "1") return stubModel();
  return createGateway({ headers: attributionHeaders })(modelId);
}
