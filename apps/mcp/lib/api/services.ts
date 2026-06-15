import {
  ExecuteActionClientInputSchema,
  ExecuteActionInputSchema,
  FindWorkflowInputSchema,
  GetActionLogEntryInputSchema,
  GetActionLogInputSchema,
  GetArchetypeInputSchema,
  GetEdgeTypeInputSchema,
  GetGateInputSchema,
  GetTaskInputSchema,
  GetWorkflowInputSchema,
  GetNodeInputSchema,
  GetNodeTypeInputSchema,
  QueryGatesInputSchema,
  QueryNeighborsInputSchema,
  QueryNodesInputSchema,
  QueryTasksInputSchema,
  TraverseEdgesInputSchema,
  TraverseGraphInputSchema,
  type ExecuteActionClientInput,
  type ExecuteActionInput,
} from "@ssota/contracts";
import {
  executeAction,
  previewAction,
  serializeActionLogRecord,
  serializeActionCatalogEntry,
  serializeArchetype,
  serializeEdge,
  serializeEdgeCatalogEntry,
  serializeGate,
  serializeWorkflow,
  serializeWorkflowPackage,
  serializeNode,
  serializeNodeCatalogEntry,
  serializeTask,
  serializeTaskIndex,
} from "@ssota/core";
import type { ExecutorType } from "@ssota/contracts";
import { queryNeighbors, traverseGraph } from "@/lib/graph-query";
import { getActionPorts } from "@/lib/ports";

export async function listNodeTypes(projectId: string) {
  const ports = getActionPorts(projectId);
  const entries = await ports.catalog.listNodeCatalogEntries();
  return entries.map(serializeNodeCatalogEntry);
}

export async function listEdgeTypes(projectId: string) {
  const ports = getActionPorts(projectId);
  const entries = await ports.catalog.listEdgeCatalogEntries();
  return entries.map(serializeEdgeCatalogEntry);
}

export async function listActionContracts(projectId: string) {
  const ports = getActionPorts(projectId);
  const entries = await ports.catalog.listActionCatalogEntries();
  return entries.map(serializeActionCatalogEntry);
}

export async function getActionContract(projectId: string, actionType: string) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getActionCatalogEntry(actionType);
  return entry ? serializeActionCatalogEntry(entry) : null;
}

export async function getNodeType(projectId: string, nodeType: string) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getNodeCatalogEntry(nodeType);
  return entry ? serializeNodeCatalogEntry(entry) : null;
}

export async function getEdgeType(projectId: string, edgeType: string) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getEdgeCatalogEntry(edgeType);
  return entry ? serializeEdgeCatalogEntry(entry) : null;
}

export async function getArchetype(projectId: string, archetypeId: string) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getArchetype(archetypeId);
  return entry ? serializeArchetype(entry) : null;
}

export async function getNode(projectId: string, nodeId: string) {
  const ports = getActionPorts(projectId);
  const node = await ports.graph.getNode(nodeId);
  return node ? serializeNode(node) : null;
}

export async function getWorkflow(
  projectId: string,
  input: ReturnType<typeof GetWorkflowInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const workflow = input.workflowId
    ? await ports.catalog.getWorkflow(input.workflowId)
    : input.workflowKey
      ? await ports.catalog.getWorkflowByKey(input.workflowKey)
      : null;
  return workflow ? serializeWorkflowPackage(workflow) : null;
}

export async function getGate(projectId: string, gateId: string) {
  const ports = getActionPorts(projectId);
  const gate = await ports.gate.getGate(gateId);
  return gate ? serializeGate(gate) : null;
}

export async function listTasks(projectId: string, limit?: number) {
  const ports = getActionPorts(projectId);
  const tasks = await ports.tasks.listTasks({ limit });
  return tasks.map(serializeTaskIndex);
}

export async function getTask(
  projectId: string,
  input: ReturnType<typeof GetTaskInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const task = await ports.tasks.getTask(input.taskId);
  return task ? serializeTask(task) : null;
}

export async function queryTasks(
  projectId: string,
  input: ReturnType<typeof QueryTasksInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const tasks = await ports.tasks.queryTasks(input);
  return tasks.map(serializeTask);
}

export async function listArchetypes(projectId: string) {
  const ports = getActionPorts(projectId);
  const entries = await ports.catalog.listArchetypes();
  return entries.map(serializeArchetype);
}

export async function listProperties(projectId: string) {
  const ports = getActionPorts(projectId);
  const nodeTypes = await ports.catalog.listNodeCatalogEntries();
  const byKey = new Map<
    string,
    {
      propertyKey: string;
      valueType: string;
      constraints: Record<string, unknown>;
      required: boolean;
      default?: unknown;
      system: boolean;
      options?: string[];
      nodeTypes: string[];
    }
  >();

  for (const entry of nodeTypes) {
    for (const [propertyKey, field] of Object.entries(entry.propertySchema)) {
      const existing = byKey.get(propertyKey);
      if (existing) {
        if (!existing.nodeTypes.includes(entry.nodeType)) {
          existing.nodeTypes.push(entry.nodeType);
        }
        continue;
      }
      byKey.set(propertyKey, {
        propertyKey,
        valueType: field.valueType,
        constraints: field.constraints ?? {},
        required: field.required ?? false,
        default: field.default,
        system: field.system ?? false,
        options: field.options,
        nodeTypes: [entry.nodeType],
      });
    }
  }

  return [...byKey.values()].sort((a, b) =>
    a.propertyKey.localeCompare(b.propertyKey),
  );
}

export async function getProperty(projectId: string, propertyKey: string) {
  const properties = await listProperties(projectId);
  return properties.find((entry) => entry.propertyKey === propertyKey) ?? null;
}

export async function queryNodes(
  projectId: string,
  params: ReturnType<typeof QueryNodesInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const nodes = await ports.graph.queryNodes(params);
  return nodes.map(serializeNode);
}

export async function traverseEdges(
  projectId: string,
  params: ReturnType<typeof TraverseEdgesInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const edges = await ports.graph.traverseEdges(params);
  return edges.map(serializeEdge);
}

export async function queryNeighborsService(
  projectId: string,
  params: ReturnType<typeof QueryNeighborsInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const result = await queryNeighbors(ports, params);
  return {
    ...result,
    edges: result.edges.map(serializeEdge),
    nodes: result.nodes.map(serializeNode),
  };
}

export async function traverseGraphService(
  projectId: string,
  params: ReturnType<typeof TraverseGraphInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const result = await traverseGraph(ports, params);
  return {
    ...result,
    edges: result.edges.map(serializeEdge),
    nodes: result.nodes.map(serializeNode),
  };
}

export async function findWorkflows(
  projectId: string,
  params: ReturnType<typeof FindWorkflowInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const workflows = await ports.catalog.findWorkflows(
    params.query,
    params.nodeType,
    params.limit,
  );
  return workflows.map(serializeWorkflow);
}

export function toExecuteActionInput(
  clientInput: ExecuteActionClientInput,
  executorId: string,
  executorType: ExecutorType,
  projectId: string,
): ExecuteActionInput {
  return ExecuteActionInputSchema.parse({
    ...clientInput,
    executorId,
    executorType,
    projectId,
  });
}

export async function executeActionForClient(
  projectId: string,
  clientInput: ExecuteActionClientInput,
  executorId: string,
  executorType: ExecutorType,
) {
  const ports = getActionPorts(projectId);
  const input = toExecuteActionInput(
    clientInput,
    executorId,
    executorType,
    projectId,
  );
  return executeAction(ports, input);
}

export async function previewActionForClient(
  projectId: string,
  clientInput: ExecuteActionClientInput,
  executorId: string,
  executorType: ExecutorType,
) {
  const ports = getActionPorts(projectId);
  const input = toExecuteActionInput(
    clientInput,
    executorId,
    executorType,
    projectId,
  );
  return previewAction(ports, input);
}

export async function listPendingGates(projectId: string) {
  const ports = getActionPorts(projectId);
  const gates = await ports.gate.listPendingGates();
  return gates.map(serializeGate);
}

export async function queryGates(
  projectId: string,
  params: ReturnType<typeof QueryGatesInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const gates = await ports.gate.queryGates(params);
  return gates.map(serializeGate);
}

export async function submitForApproval(
  projectId: string,
  gateId: string,
  note?: string,
) {
  const ports = getActionPorts(projectId);
  const gate = await ports.gate.getGate(gateId);
  return {
    message: "Gate submitted for human review",
    gate: gate ? serializeGate(gate) : null,
    note,
  };
}

export async function getActionLog(
  projectId: string,
  params: ReturnType<typeof GetActionLogInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const log = await ports.commit.getActionLog(params);
  return log.map(serializeActionLogRecord);
}

export async function getActionLogEntry(
  projectId: string,
  params: ReturnType<typeof GetActionLogEntryInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const entry = params.logId
    ? await ports.commit.getActionLogEntry(params.logId)
    : await ports.commit.findByIdempotencyKey(params.idempotencyKey!);
  return entry ? serializeActionLogRecord(entry) : null;
}
