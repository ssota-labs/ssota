import type { UIMessageChunk } from "@ssota/agent-runtime";
import { createInlineJobRunner } from "./inline-job-runner";
import type { RunSsotaAgentInput } from "./ssota-agent-core";

export type { RunSsotaAgentInput };

/** Handle to a started agent run, regardless of how it is scheduled. */
export interface AgentRunHandle {
  runId: string;
  /** UI message chunk stream for the run. Streaming callers read it; others ignore it. */
  getReadable(): ReadableStream<UIMessageChunk>;
  /**
   * Settles when the run finishes. Fire-and-forget callers should pass this to
   * `after()` so the serverless runtime stays alive until completion. For the
   * durable workflow runner the run is detached, so this resolves immediately.
   */
  completion: Promise<void>;
}

/**
 * Schedules SSOTA agent runs. The selection of implementation is the open-core
 * boundary:
 *
 *  - `inline`   (default, OSS): runs in-process, no durability. No Vercel
 *               Workflow DevKit required.
 *  - `workflow` (Enterprise):   durable run on the Vercel Workflow DevKit with
 *               crash recovery / retries. Requires the `.ee` runner.
 */
export interface JobRunner {
  start(input: RunSsotaAgentInput): Promise<AgentRunHandle>;
}

let cached: JobRunner | undefined;

/** Resolve the configured job runner (cached). Set `JOB_RUNNER=workflow` for the durable Enterprise runner. */
export async function getJobRunner(): Promise<JobRunner> {
  if (cached) return cached;

  const mode = process.env.JOB_RUNNER ?? "inline";
  if (mode === "workflow") {
    // Lazy import keeps the Enterprise WDK runner (and the `workflow` package)
    // off the code path entirely when running the OSS inline default.
    const mod = await import("./workflow-job-runner.ee");
    cached = mod.createWorkflowJobRunner();
  } else {
    cached = createInlineJobRunner();
  }
  return cached;
}
