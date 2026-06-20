import { stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";
import { gateway } from "../models.js";
import type {
  AgentRunContext,
  LoopEngine,
  LoopEngineResult,
} from "./types.js";

const callOptionsSchema = z.object({
  context: z.custom<AgentRunContext>(),
});

/**
 * Category-A loop engine backed by the AI SDK `ToolLoopAgent`, run in-process
 * and wrapped by Vercel Workflow for durability (decision: ToolLoopAgent +
 * "use workflow"). The per-run SSOTA scope rides in `experimental_context` so
 * every tool resolves its `projectId`/`accountId` without rebinding.
 */
export function createAiSdkLoopEngine(): LoopEngine {
  return {
    kind: "loop",
    async run({
      instructions,
      messages,
      tools,
      modelId,
      context,
      sandbox,
      maxSteps = 24,
    }): Promise<LoopEngineResult> {
      const agent = new ToolLoopAgent({
        model: gateway(modelId),
        instructions,
        tools,
        stopWhen: stepCountIs(maxSteps),
        callOptionsSchema,
        prepareCall: ({ options, ...settings }) => ({
          ...settings,
          experimental_context: { ssota: options?.context, sandbox },
        }),
      });

      const result = await agent.generate({ messages, options: { context } });
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
  };
}
