import {
  tool,
  type LanguageModelUsage,
  type ModelMessage,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { gateway } from "../models.js";
import { SUBAGENT_MODEL_ID, SUBAGENT_STEP_LIMIT } from "../subagents/constants.js";
import {
  SUBAGENT_REGISTRY,
  SUBAGENT_TYPES,
  buildSubagentSummaryLines,
} from "../subagents/registry.js";
import { sumUsage } from "../subagents/usage.js";
import { getRunContext } from "./context.js";

const summaryLines = buildSubagentSummaryLines();

const pendingSchema = z.object({ name: z.string(), input: z.unknown() });

const delegateOutputSchema = z.object({
  pending: pendingSchema.optional(),
  toolCallCount: z.number().int().nonnegative().optional(),
  startedAt: z.number().int().nonnegative().optional(),
  modelId: z.string().optional(),
  final: z.custom<ModelMessage[]>().optional(),
  usage: z.custom<LanguageModelUsage>().optional(),
});

export function createDelegateTools(): ToolSet {
  return {
    delegate: tool({
      description: `Launch a specialized subagent to handle a focused task autonomously, then return only its summary.

AVAILABLE SUBAGENTS:
${summaryLines}

WHEN TO USE:
- Read-heavy or focused work whose intermediate steps would clutter this conversation (e.g. exploring the workspace before setup).
- Work that matches one of the subagent descriptions above.

WHEN NOT TO USE (do it yourself):
- A single read/lookup you can do directly.
- Anything needing back-and-forth — subagents cannot ask questions.

BEHAVIOR:
- The subagent runs autonomously up to ${SUBAGENT_STEP_LIMIT} steps and returns ONLY a concise summary; its internal tool calls are isolated from you.
- Be explicit: include all context (ids, keys, goals) in instructions, since it cannot ask follow-ups.`,
      inputSchema: z.object({
        subagentType: z
          .enum(SUBAGENT_TYPES)
          .describe(`Which subagent to launch:\n${summaryLines}`),
        task: z.string().describe("Short task description (shown to the user)."),
        instructions: z
          .string()
          .describe(
            "Detailed, self-contained instructions: goal, what to look for, and any ids/keys to use.",
          ),
      }),
      outputSchema: delegateOutputSchema,
      execute: async function* (
        { subagentType, task, instructions },
        { experimental_context, abortSignal },
      ) {
        const ctx = getRunContext(experimental_context);
        const model = gateway(SUBAGENT_MODEL_ID);
        const subagent = SUBAGENT_REGISTRY[subagentType].agent;

        const result = await subagent.stream({
          prompt:
            "Complete this task and provide a Summary and Answer of what you found.",
          options: { task, instructions, context: ctx, model },
          abortSignal,
        });

        const startedAt = Date.now();
        let toolCallCount = 0;
        let pending: { name: string; input: unknown } | undefined;
        let usage: LanguageModelUsage | undefined;

        yield { toolCallCount, startedAt, modelId: SUBAGENT_MODEL_ID };

        for await (const part of result.fullStream) {
          if (part.type === "tool-call") {
            toolCallCount += 1;
            pending = { name: part.toolName, input: part.input };
            yield { pending, toolCallCount, usage, startedAt, modelId: SUBAGENT_MODEL_ID };
          }
          if (part.type === "finish-step") {
            usage = sumUsage(usage, part.usage);
            yield { pending, toolCallCount, usage, startedAt, modelId: SUBAGENT_MODEL_ID };
          }
        }

        const response = await result.response;
        const finalUsage = usage ?? (await result.usage);
        yield {
          final: response.messages,
          toolCallCount,
          usage: finalUsage,
          startedAt,
          modelId: SUBAGENT_MODEL_ID,
        };
      },
      // The parent agent sees ONLY the subagent's final summary text.
      toModelOutput: ({ output }) => {
        const messages = output.final;
        if (!messages) return { type: "text", value: "Subagent finished." };
        let lastText = "";
        for (const message of messages) {
          if (message.role !== "assistant") continue;
          const content = message.content;
          if (typeof content === "string") {
            lastText = content;
            continue;
          }
          for (const part of content) {
            if (part.type === "text" && typeof part.text === "string") {
              lastText = part.text;
            }
          }
        }
        return { type: "text", value: lastText || "Subagent finished." };
      },
    }),
  };
}
