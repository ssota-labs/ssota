import { start } from "workflow/api";
import type { UIMessageChunk } from "@ssota/agent-runtime";
import type {
  MainAgentRunHandle,
  MainAgentRunner,
} from "./main-agent-job-runner";
import { runMainAgentWorkflow } from "./main-agent";
import type { RunMainAgentInput } from "./main-agent-core";

/**
 * ENTERPRISE (.ee) — Durable main-agent runner backed by the Vercel Workflow
 * DevKit. Licensed under LICENSE_EE.md. Selected by `JOB_RUNNER=workflow`.
 */
export function createWorkflowMainAgentRunner(): MainAgentRunner {
  return {
    async start(input: RunMainAgentInput): Promise<MainAgentRunHandle> {
      const run = await start(runMainAgentWorkflow, [input]);
      return {
        runId: run.runId,
        getReadable: () => run.getReadable() as ReadableStream<UIMessageChunk>,
        completion: Promise.resolve(),
      };
    },
  };
}
