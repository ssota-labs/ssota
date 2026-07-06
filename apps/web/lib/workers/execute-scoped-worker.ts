import type { Worker } from "@ssota/contracts";
import {
  executeWorker,
  type WorkerExecuteTrigger,
} from "@ssota/agent-runtime/workers/execute-worker";
import { buildWorkerExecutionScope } from "./build-worker-execution-scope";
import { revokeWorkerExecutionSession } from "./worker-execution-sessions";

export async function executeScopedWorker(input: {
  worker: Worker;
  accountId?: string | null;
  trigger: WorkerExecuteTrigger;
  input?: Record<string, unknown>;
  dryRun?: boolean;
  timeoutMs?: number;
}) {
  const { scope, token } = await buildWorkerExecutionScope({
    worker: input.worker,
    accountId: input.accountId,
    dryRun: input.dryRun ?? false,
  });

  try {
    return await executeWorker({
      worker: input.worker,
      input: input.input,
      dryRun: input.dryRun,
      timeoutMs: input.timeoutMs,
      trigger: input.trigger,
      scope,
      sdkBridgeToken: token,
    });
  } finally {
    revokeWorkerExecutionSession(token);
  }
}
