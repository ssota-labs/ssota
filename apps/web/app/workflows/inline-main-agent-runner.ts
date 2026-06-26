import type { UIMessageChunk } from "@ssota/agent-runtime";
import type { MainAgentRunHandle, MainAgentRunner } from "./main-agent-job-runner";
import {
  runMainAgentCore,
  type RunMainAgentInput,
} from "./main-agent-core";

/**
 * OSS default main-agent runner. Runs the chat agent loop in-process with no
 * durability and no Vercel Workflow DevKit transform.
 */
export function createInlineMainAgentRunner(): MainAgentRunner {
  return {
    async start(input: RunMainAgentInput): Promise<MainAgentRunHandle> {
      const runId = crypto.randomUUID();
      const { readable, writable } = new TransformStream<UIMessageChunk>();

      const completion = (async (): Promise<void> => {
        try {
          await runMainAgentCore(input, runId, writable);
        } catch (error) {
          console.error(`[inline-main-agent-runner] run ${runId} failed:`, error);
        } finally {
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
