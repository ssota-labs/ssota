import { start } from "workflow/api";
import type { UIMessageChunk } from "@ssota/agent-runtime";
import type { AgentRunHandle, JobRunner, RunSsotaAgentInput } from "./job-runner";
import { runSsotaAgentWorkflow } from "./ssota-agent.ee";

/**
 * ENTERPRISE (.ee) — Durable job runner backed by the Vercel Workflow DevKit.
 *
 * Licensed under LICENSE_EE.md. Selected by `JOB_RUNNER=workflow`. The run
 * executes server-side and survives crashes/retries; the readable streams
 * chunks back from the durable run.
 */
export function createWorkflowJobRunner(): JobRunner {
  return {
    async start(input: RunSsotaAgentInput): Promise<AgentRunHandle> {
      const run = await start(runSsotaAgentWorkflow, [input]);
      return {
        runId: run.runId,
        getReadable: () =>
          run.getReadable() as ReadableStream<UIMessageChunk>,
        // Durable runs execute server-side, detached from this request.
        completion: Promise.resolve(),
      };
    },
  };
}
