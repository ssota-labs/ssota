import { getWorkflowMetadata, getWritable } from "workflow";
import type { UIMessage } from "ai";
import type { RunAgentResult, UIMessageChunk } from "@ssota/agent-runtime";
import {
  claimMainRunning,
  finalizeMainRun,
  persistMainAssistantMessage,
  runMainAgentStepCore,
  type RunMainAgentInput,
} from "./main-agent-core";

export type { RunMainAgentInput };

/**
 * ENTERPRISE (.ee) — Durable main (chat) agent run on the Vercel Workflow
 * DevKit. OSS builds use {@link getMainAgentRunner} with the inline runner
 * instead; this workflow is only started when `JOB_RUNNER=workflow`.
 */
export async function runMainAgentWorkflow(input: RunMainAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  await claimRunningStep(input, workflowRunId);
  const { result, parts } = await runAgentStep(input, workflowRunId);
  await persistAssistantStep(input, parts);
  await finalizeStep(workflowRunId, result);
  return result;
}

async function claimRunningStep(
  input: RunMainAgentInput,
  workflowRunId: string,
): Promise<void> {
  "use step";
  await claimMainRunning(input, workflowRunId);
}

async function runAgentStep(
  input: RunMainAgentInput,
  workflowRunId: string,
): Promise<{ result: RunAgentResult; parts: UIMessage["parts"] | null }> {
  "use step";
  const writable = getWritable<UIMessageChunk>();
  return runMainAgentStepCore(input, workflowRunId, writable);
}

async function persistAssistantStep(
  input: RunMainAgentInput,
  parts: UIMessage["parts"] | null,
): Promise<void> {
  "use step";
  await persistMainAssistantMessage(input, parts);
}

async function finalizeStep(
  workflowRunId: string,
  result: RunAgentResult,
): Promise<void> {
  "use step";
  await finalizeMainRun(workflowRunId, result);
}
