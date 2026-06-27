import { getWorkflowMetadata, getWritable } from "workflow";
import {
  createSandboxSession,
  getDb,
  getTaskPort,
  streamAgent,
  type RunAgentResult,
  type SandboxSession,
  type UIMessageChunk,
} from "@ssota/agent-runtime";
import { createAgentRunPort } from "@ssota/adapter-postgres";

const DEV_CAPABLE_WORKFLOW_KEYS = new Set(["work.implement_feature"]);

export interface RunTaskAgentInput {
  projectId: string;
  taskId: string;
  accountId?: string;
  modelId?: string;
  maxSteps?: number;
}

const TERMINAL_STATUSES = new Set([
  "done",
  "blocked",
  "cancelled",
  "failed",
]);

export async function runTaskAgentWorkflow(input: RunTaskAgentInput) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();

  await claimRunning(input, workflowRunId);
  const result = await runAgentStep(input, workflowRunId);
  await finalizeRun(input, workflowRunId, result);

  return result;
}

async function claimRunning(
  input: RunTaskAgentInput,
  workflowRunId: string,
): Promise<void> {
  "use step";
  const db = getDb();
  await createAgentRunPort(db).start({
    projectId: input.projectId,
    runtimeKind: "task",
    taskId: input.taskId,
    workflowRunId,
    accountId: input.accountId ?? null,
    model: input.modelId ?? null,
  });
  await getTaskPort(input.projectId, input.accountId).updateTask(input.taskId, {
    status: "running",
  });
}

async function runAgentStep(
  input: RunTaskAgentInput,
  workflowRunId: string,
): Promise<RunAgentResult> {
  "use step";

  const task = await getTaskPort(input.projectId, input.accountId).getTask(
    input.taskId,
  );
  let sandbox: SandboxSession | undefined;
  if (
    task?.workflowInstructionKey &&
    DEV_CAPABLE_WORKFLOW_KEYS.has(task.workflowInstructionKey)
  ) {
    try {
      sandbox = await createSandboxSession();
    } catch {
      // sandbox optional
    }
  }

  const writable = getWritable<UIMessageChunk>();

  try {
    return await streamAgent(
      {
        projectId: input.projectId,
        taskId: input.taskId,
        runId: workflowRunId,
        runtimeKind: "task",
        accountId: input.accountId,
        modelId: input.modelId,
        sandbox,
        maxSteps: input.maxSteps,
      },
      writable,
    );
  } finally {
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch {
        // best-effort
      }
    }
  }
}

async function finalizeRun(
  input: RunTaskAgentInput,
  workflowRunId: string,
  result: RunAgentResult,
): Promise<void> {
  "use step";
  const db = getDb();
  const isTerminal = result.finalStatus
    ? TERMINAL_STATUSES.has(result.finalStatus)
    : false;
  if (!isTerminal) {
    await getTaskPort(input.projectId, input.accountId).updateTask(input.taskId, {
      status: "failed",
      result: { reason: "Agent ended without completing the task", ...result },
    });
  }

  const finalTask = await getTaskPort(input.projectId, input.accountId).getTask(
    input.taskId,
  );
  await createAgentRunPort(db).finish(workflowRunId, {
    status: finalTask?.status ?? "failed",
    usage: result.usage ?? {},
  });
}
