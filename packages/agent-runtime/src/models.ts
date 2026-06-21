import { createGateway, type LanguageModel } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";

/**
 * Default model id (AI Gateway "provider/model" form). Routing, observability
 * and fallback are handled by the Gateway, so we depend on no provider SDK.
 */
export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4.6";

const attributionHeaders = {
  "x-title": "SSOTA Agent Runtime",
};

/**
 * Dev/local stub model (STUB_MODEL=1): streams a canned reply with no API key
 * so the full chat pipeline (route → workflow → stream → UI) is runnable for
 * e2e without an AI Gateway key. Dev-only seam — not used in production.
 */
function stubModel(): LanguageModel {
  const reply =
    "Hi — I'm the local stub agent. The chat streaming pipeline works end to end.";
  // Runtime-valid v3 stream parts; cast past the strict part typing (dev stub).
  const chunks = [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "0" },
    ...reply.split(" ").map((word, i) => ({
      type: "text-delta",
      id: "0",
      delta: i === 0 ? word : ` ${word}`,
    })),
    { type: "text-end", id: "0" },
    {
      type: "finish",
      finishReason: "stop",
      usage: {
        inputTokens: { total: 1 },
        outputTokens: { total: 16 },
        totalTokens: 17,
      },
    },
  ];

  return new MockLanguageModelV3({
    modelId: "stub/echo",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doStream: async () => ({
      stream: simulateReadableStream({ chunks: chunks as never, chunkDelayInMs: 15 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
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
