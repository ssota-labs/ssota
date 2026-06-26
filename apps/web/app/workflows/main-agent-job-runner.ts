import type { UIMessageChunk } from "@ssota/agent-runtime";
import { createInlineMainAgentRunner } from "./inline-main-agent-runner";
import type { RunMainAgentInput } from "./main-agent-core";

export type { RunMainAgentInput };

/** Handle to a started main (chat) agent run. */
export interface MainAgentRunHandle {
  runId: string;
  getReadable(): ReadableStream<UIMessageChunk>;
  /**
   * Settles when the run finishes. Pass to `after()` for fire-and-forget callers
   * so the serverless runtime stays alive until completion.
   */
  completion: Promise<void>;
}

/**
 * Schedules main (chat) agent runs. Mirrors {@link JobRunner} for the chat path:
 * - `inline` (default, OSS): in-process, no WDK transform required.
 * - `workflow` (Enterprise): durable run via Vercel Workflow DevKit.
 */
export interface MainAgentRunner {
  start(input: RunMainAgentInput): Promise<MainAgentRunHandle>;
}

let cached: MainAgentRunner | undefined;

/** Resolve the configured main-agent runner (cached). */
export async function getMainAgentRunner(): Promise<MainAgentRunner> {
  if (cached) return cached;

  const mode = process.env.JOB_RUNNER ?? "inline";
  if (mode === "workflow") {
    const mod = await import("./workflow-main-agent-runner.ee");
    cached = mod.createWorkflowMainAgentRunner();
  } else {
    cached = createInlineMainAgentRunner();
  }
  return cached;
}
