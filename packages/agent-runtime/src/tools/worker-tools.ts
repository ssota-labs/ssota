import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  RunWorkerInputSchema,
  readWorkerToolConfig,
  type WorkerIndex,
} from "@ssota/contracts";
import { getWorkerPort } from "../ports.js";
import { getRunContext } from "../tools/context.js";
import { executeWorker } from "../workers/execute-worker.js";

async function listWorkersForAgent(
  teamspaceId: string,
  accountId: string | undefined,
  agentDefinitionId: string | undefined,
): Promise<WorkerIndex[]> {
  const port = getWorkerPort(teamspaceId, accountId);
  if (agentDefinitionId) {
    const linked = await port.listForAgentDefinition(agentDefinitionId);
    return linked.map((w) => ({
      id: w.id,
      key: w.key,
      name: w.name,
      description: w.description,
      kind: w.kind,
      version: w.version,
    }));
  }
  return port.listWorkers("tool");
}

async function getWorkerForAgent(
  teamspaceId: string,
  accountId: string | undefined,
  agentDefinitionId: string | undefined,
  key: string,
) {
  const port = getWorkerPort(teamspaceId, accountId);
  if (agentDefinitionId) {
    const linked = await port.listForAgentDefinition(agentDefinitionId);
    return linked.find((w) => w.key === key) ?? null;
  }
  const worker = await port.getByKey(key);
  return worker?.kind === "tool" ? worker : null;
}

export function createWorkerTools(): ToolSet {
  return {
    list_workers: tool({
      description: "List tool-kind workers available in this project.",
      inputSchema: z.object({}),
      execute: async (_input, { context }) => {
        const ctx = getRunContext(context);
        const items = await listWorkersForAgent(
          ctx.teamspaceId,
          ctx.accountId,
          ctx.agentDefinitionId,
        );
        return { workers: items };
      },
    }),

    describe_worker: tool({
      description: "Describe a worker by key (schemas + kind config).",
      inputSchema: z.object({ key: z.string().min(1) }),
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        const worker = await getWorkerForAgent(
          ctx.teamspaceId,
          ctx.accountId,
          ctx.agentDefinitionId,
          input.key,
        );
        if (!worker) return { found: false };
        const toolConfig =
          worker.kind === "tool" ? readWorkerToolConfig(worker) : null;
        return {
          found: true,
          key: worker.key,
          name: worker.name,
          description: worker.description,
          kind: worker.kind,
          inputSchema: worker.inputSchema,
          outputSchema: worker.outputSchema,
          kindConfig: worker.kindConfig,
          permissions: toolConfig?.permissions,
          version: worker.version,
        };
      },
    }),

    run_worker: tool({
      description:
        "Execute a stored tool-kind worker in an isolated sandbox with a scoped SDK.",
      inputSchema: RunWorkerInputSchema,
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        const worker = await getWorkerForAgent(
          ctx.teamspaceId,
          ctx.accountId,
          ctx.agentDefinitionId,
          input.key,
        );
        if (!worker) {
          return { ok: false, error: `Unknown worker: ${input.key}` };
        }
        if (worker.kind !== "tool") {
          return {
            ok: false,
            error: `Worker ${input.key} is kind=${worker.kind}; only tool workers are runnable by agents`,
          };
        }
        return executeWorker({
          worker,
          input: input.input,
          dryRun: input.dryRun,
          timeoutMs: input.timeoutMs,
          trigger: "agent",
        });
      },
    }),
  };
}

/** @deprecated Use createWorkerTools */
export const createScriptToolTools = createWorkerTools;
