import {
  createEdge,
  createNode,
  getNode,
  queryNodes,
  traverseEdges,
  updateNode,
} from "@ssota/core";
import {
  createEdgeInputSchema,
  createNodeInputSchema,
  getNodeInputSchema,
  listNodesByTypeInputSchema,
  traverseEdgesInputSchema,
  updateNodeInputSchema,
} from "@ssota/contracts/graph";
import { z } from "zod";
import type { WorkerPermissions } from "@ssota/contracts";
import type { WorkerSdkHost } from "@ssota/agent-runtime/workers/worker-sdk-host";
import { getGraphPorts, getTaskPort } from "@/lib/ports";

const TaskQuerySchema = z.object({
  status: z
    .enum([
      "pending",
      "ready",
      "running",
      "blocked",
      "done",
      "cancelled",
      "failed",
    ])
    .optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const TaskUpdateSchema = z.object({
  taskId: z.string().uuid(),
  status: z
    .enum([
      "pending",
      "ready",
      "running",
      "blocked",
      "done",
      "cancelled",
      "failed",
    ])
    .optional(),
  title: z.string().optional(),
});

export function createWorkerSdkHost(input: {
  teamspaceId: string;
  accountId?: string | null;
  organizationId: string;
  permissions: WorkerPermissions;
}): WorkerSdkHost {
  const { teamspaceId, accountId, permissions } = input;

  return {
    async invoke(method, params) {
      const ports = await getGraphPorts(teamspaceId, accountId ?? undefined);
      const graphDeps = {
        catalog: ports.catalog,
        graphRead: ports.graphRead,
        graphWrite: ports.graphWrite,
      };

      const tasks = getTaskPort(teamspaceId, accountId ?? undefined);

      switch (method) {
        case "graph.queryNodes": {
          if (!permissions.graphRead) throw new Error("graphRead not permitted");
          return queryNodes(graphDeps.graphRead, listNodesByTypeInputSchema.parse(params));
        }
        case "graph.getNode": {
          if (!permissions.graphRead) throw new Error("graphRead not permitted");
          return getNode(graphDeps.graphRead, getNodeInputSchema.parse(params));
        }
        case "graph.traverseEdges": {
          if (!permissions.graphRead) throw new Error("graphRead not permitted");
          return traverseEdges(graphDeps.graphRead, traverseEdgesInputSchema.parse(params));
        }
        case "graph.createNode": {
          if (!permissions.graphWrite || !permissions.canMutate) {
            throw new Error("graphWrite not permitted");
          }
          return createNode(graphDeps, createNodeInputSchema.parse(params));
        }
        case "graph.updateNode": {
          if (!permissions.graphWrite || !permissions.canMutate) {
            throw new Error("graphWrite not permitted");
          }
          return updateNode(graphDeps, updateNodeInputSchema.parse(params));
        }
        case "graph.createEdge": {
          if (!permissions.graphWrite || !permissions.canMutate) {
            throw new Error("graphWrite not permitted");
          }
          return createEdge(graphDeps, createEdgeInputSchema.parse(params));
        }
        case "tasks.query": {
          if (!permissions.graphRead) throw new Error("tasks.query not permitted");
          const parsed = TaskQuerySchema.parse(params ?? {});
          return tasks.queryTasks(parsed);
        }
        case "tasks.update": {
          if (!permissions.canMutate) throw new Error("tasks.update not permitted");
          const parsed = TaskUpdateSchema.parse(params);
          return tasks.updateTask(parsed.taskId, {
            ...(parsed.status !== undefined ? { status: parsed.status } : {}),
            ...(parsed.title !== undefined ? { title: parsed.title } : {}),
          });
        }
        case "connectors.call": {
          const toolkit =
            params && typeof params === "object" && "toolkit" in params
              ? String((params as { toolkit: unknown }).toolkit)
              : "";
          if (
            permissions.connectorScopes.length > 0 &&
            !permissions.connectorScopes.includes(toolkit)
          ) {
            throw new Error(`connector scope denied: ${toolkit}`);
          }
          throw new Error(
            "connectors.call is not wired for workers yet — use graph/tasks in sync scripts",
          );
        }
        default:
          throw new Error(`Unknown worker SDK method: ${method}`);
      }
    },
  };
}
