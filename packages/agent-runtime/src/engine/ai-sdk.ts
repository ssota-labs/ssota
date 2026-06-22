import { stepCountIs, ToolLoopAgent, type UIMessageChunk } from "ai";
import { z } from "zod";
import {
  buildActiveTools,
  syncConnectionRunStateFromSteps,
} from "../connections/activate-tools.js";
import { ConnectionRunState } from "../connections/run-state.js";
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
  const {
    instructions,
    tools,
    modelId,
    sandbox,
    credentials,
    connectionState,
    qualifiedToolNames = [],
    maxSteps = 24,
  } = input;

  const runState = connectionState ?? new ConnectionRunState();

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
        connectionState: runState,
      },
    }),
    prepareStep: ({ steps }) => {
      syncConnectionRunStateFromSteps(runState, steps);
      const sandboxTools = sandbox
        ? ["sandbox_exec", "sandbox_read_file", "sandbox_write_file"]
        : [];
      if (qualifiedToolNames.length === 0) {
        return {};
      }
      return {
        activeTools: buildActiveTools(
          runState,
          qualifiedToolNames,
          sandboxTools,
        ),
      };
    },
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
      try {
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
      } finally {
        await input.connectionSessionManager?.close();
      }
    },

    async stream(input, writable): Promise<LoopEngineResult> {
      const agent = buildAgent(input);
      try {
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
      } finally {
        await input.connectionSessionManager?.close();
      }
    },
  };
}
