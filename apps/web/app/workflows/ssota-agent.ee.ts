import { getWorkflowMetadata, getWritable } from "workflow";
import type { UIMessageChunk, RunAgentForTaskResult } from "@ssota/agent-runtime";
import {
  claimRunning,
  finalizeRun,
  runAgentStepCore,
  type RunSsotaAgentInput,
} from "./ssota-agent-core";

/**
 * ENTERPRISE (.ee) — Durable agent run on the Vercel Workflow DevKit.
 *
 * Licensed under LICENSE_EE.md. This file is the only place that imports the
 * `workflow` package; the OSS build runs the same logic in-process via the
 * inline runner (see `inline-job-runner.ts`). Each phase is wrapped in a
 * `"use step"` boundary so a crash resumes from the last completed step. The
 * shared, WDK-free bodies live in `ssota-agent-core.ts`.
 */
export type { RunSsotaAgentInput };

export async function runSsotaAgentWorkflow(input: RunSsotaAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();

  await claimRunningStep(input, workflowRunId);
  const result = await runAgentStep(input, workflowRunId);
  await finalizeStep(input, workflowRunId, result);

  return result;
}

async function claimRunningStep(
  input: RunSsotaAgentInput,
  workflowRunId: string,
): Promise<void> {
  "use step";
  await claimRunning(input, workflowRunId);
}

async function runAgentStep(
  input: RunSsotaAgentInput,
  workflowRunId: string,
): Promise<RunAgentForTaskResult> {
  "use step";
  // The writable must be obtained inside the step (a WritableStream cannot
  // cross WDK step boundaries — it is not serializable).
  const writable = getWritable<UIMessageChunk>();
  return runAgentStepCore(input, workflowRunId, writable);
}

async function finalizeStep(
  input: RunSsotaAgentInput,
  workflowRunId: string,
  result: RunAgentForTaskResult,
): Promise<void> {
  "use step";
  await finalizeRun(input, workflowRunId, result);
}
