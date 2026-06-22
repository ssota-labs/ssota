import type { UIMessageChunk } from "@ssota/agent-runtime";
import type { AgentRunHandle, JobRunner } from "./job-runner";
import { runSsotaAgentCore, type RunSsotaAgentInput } from "./ssota-agent-core";

/**
 * OSS default job runner. Runs the agent loop in-process with no durability:
 * if the server crashes mid-run, the run is lost (the finalize safety net only
 * applies while the process is alive). This needs no Vercel Workflow DevKit.
 *
 * The run is started eagerly so streaming callers can read chunks concurrently
 * with the response. Fire-and-forget callers should pass `completion` to
 * `after()` to keep the runtime alive until it settles.
 */
export function createInlineJobRunner(): JobRunner {
  return {
    async start(input: RunSsotaAgentInput): Promise<AgentRunHandle> {
      const runId = crypto.randomUUID();
      const { readable, writable } = new TransformStream<UIMessageChunk>();

      const completion = (async (): Promise<void> => {
        try {
          await runSsotaAgentCore(input, runId, writable);
        } catch (error) {
          console.error(`[inline-job-runner] run ${runId} failed:`, error);
        } finally {
          // The engine releases the writer lock but never closes the stream;
          // close it here so the readable side terminates.
          try {
            await writable.close();
          } catch {
            // already closed / errored — ignore
          }
        }
      })();

      return { runId, getReadable: () => readable, completion };
    },
  };
}
