import { getWritable } from "workflow";
import type { ModelMessage } from "ai";
import {
  buildMainWorkflowAgent,
  type AgentRunContext,
  type ModelCallStreamPart,
} from "@ssota/agent-runtime/workflow";
import { dispatchMainTool } from "./main-workflow-agent-dispatch";

export interface RunMainWorkflowAgentInput {
  ssota: AgentRunContext;
  messages: ModelMessage[];
  instructions?: string;
  modelId?: string;
  maxSteps?: number;
}

/**
 * WorkflowAgent-backed main (chat) agent. The agent loop and each tool call run
 * as durable steps; output streams as ModelCallStreamPart to the run's default
 * stream. This module imports only workflow-safe code — the Node-dependent tool
 * work lives in the `dispatchMainTool` `"use step"`.
 */
export async function runMainWorkflowAgent(input: RunMainWorkflowAgentInput) {
  "use workflow";

  const agent = buildMainWorkflowAgent({
    ssota: input.ssota,
    dispatch: dispatchMainTool,
    instructions: input.instructions,
    modelId: input.modelId,
    maxSteps: input.maxSteps,
  });

  const result = await agent.stream({
    messages: input.messages,
    writable: getWritable<ModelCallStreamPart>(),
  });

  return { messageCount: result.messages.length, stepCount: result.steps.length };
}
