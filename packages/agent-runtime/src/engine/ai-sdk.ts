import { stepCountIs, ToolLoopAgent, type UIMessageChunk } from "ai";
import { z } from "zod";
import { gateway } from "../models.js";
import type {
  AgentRunContext,
  LoopEngine,
  LoopEngineResult,
  LoopEngineRunInput,
} from "./types.js";

const callOptionsSchema = z.object({
  context: z.custom<AgentRunContext>(),
});

function buildAgent(input: LoopEngineRunInput) {
  const { instructions, tools, modelId, sandbox, credentials, maxSteps = 24 } =
    input;
  return new ToolLoopAgent({
    model: gateway(modelId),
    instructions,
    tools,
    stopWhen: stepCountIs(maxSteps),
    callOptionsSchema,
    prepareCall: ({ options, ...settings }) => ({
      ...settings,
      experimental_context: {
        ssota: options?.context,
        sandbox,
        credentials,
      },
    }),
  });
}

/**
 * Category-A loop engine backed by the AI SDK `ToolLoopAgent`, run in-process
 * and wrapped by Vercel Workflow for durability (decision: ToolLoopAgent +
 * "use workflow"). The per-run SSOTA scope rides in `experimental_context` so
 * every tool resolves its `projectId`/`accountId` without rebinding.
 */
export function createAiSdkLoopEngine(): LoopEngine {
  return {
    kind: "loop",

    async run(input): Promise<LoopEngineResult> {
      const agent = buildAgent(input);
      const result = await agent.generate({
        messages: input.messages,
        options: { context: input.context },
      });
      const usage = result.totalUsage;
      return {
        text: result.text,
        finishReason: result.finishReason,
        responseMessages: result.response.messages,
        usage: {
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
          totalTokens: usage?.totalTokens,
        },
      };
    },

    async stream(input, writable): Promise<LoopEngineResult> {
      const agent = buildAgent(input);
      const result = await agent.stream({
        messages: input.messages,
        options: { context: input.context },
      });

      const writer = (writable as WritableStream<UIMessageChunk>).getWriter();
      try {
        for await (const chunk of result.toUIMessageStream()) {
          await writer.write(chunk);
        }
      } finally {
        writer.releaseLock();
      }

      const [text, finishReason, response, usage] = await Promise.all([
        result.text,
        result.finishReason,
        result.response,
        result.totalUsage,
      ]);
      return {
        text,
        finishReason,
        responseMessages: response.messages,
        usage: {
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
          totalTokens: usage?.totalTokens,
        },
      };
    },
  };
}
