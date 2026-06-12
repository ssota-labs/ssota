import {
  ExecuteActionClientInputSchema,
  ExecuteActionInputSchema,
  FindInstructionInputSchema,
  GetActionLogEntryInputSchema,
  GetActionLogInputSchema,
  GetArchetypeInputSchema,
  GetEdgeTypeInputSchema,
  GetGateInputSchema,
  GetInstructionInputSchema,
  GetNodeInputSchema,
  GetNodeTypeInputSchema,
  QueryGatesInputSchema,
  QueryNeighborsInputSchema,
  QueryNodesInputSchema,
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
  serializeInstruction,
  serializeNode,
  serializeNodeCatalogEntry,
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

export async function getInstruction(projectId: string, instructionId: string) {
  const ports = getActionPorts(projectId);
  const instruction = await ports.catalog.getInstruction(instructionId);
  return instruction ? serializeInstruction(instruction) : null;
}

export async function getGate(projectId: string, gateId: string) {
  const ports = getActionPorts(projectId);
  const gate = await ports.gate.getGate(gateId);
  return gate ? serializeGate(gate) : null;
}

export async function listArchetypes(projectId: string) {
  const ports = getActionPorts(projectId);
  const entries = await ports.catalog.listArchetypes();
  return entries.map(serializeArchetype);
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

export async function findInstructions(
  projectId: string,
  params: ReturnType<typeof FindInstructionInputSchema.parse>,
) {
  const ports = getActionPorts(projectId);
  const instructions = await ports.catalog.findInstructions(
    params.query,
    params.nodeType,
    params.limit,
  );
  return instructions.map(serializeInstruction);
}

export function toExecuteActionInput(
  clientInput: ExecuteActionClientInput,
  executorId: string,
  executorType: ExecutorType,
  projectId: string,
  subjectId?: string,
): ExecuteActionInput {
  return ExecuteActionInputSchema.parse({
    ...clientInput,
    executorId,
    executorType,
    projectId,
    subjectId,
  });
}

export async function executeActionForClient(
  projectId: string,
  clientInput: ExecuteActionClientInput,
  executorId: string,
  executorType: ExecutorType,
  subjectId?: string,
) {
  const ports = getActionPorts(projectId);
  const input = toExecuteActionInput(
    clientInput,
    executorId,
    executorType,
    projectId,
    subjectId,
  );
  return executeAction(ports, input);
}

export async function previewActionForClient(
  projectId: string,
  clientInput: ExecuteActionClientInput,
  executorId: string,
  executorType: ExecutorType,
  subjectId?: string,
) {
  const ports = getActionPorts(projectId);
  const input = toExecuteActionInput(
    clientInput,
    executorId,
    executorType,
    projectId,
    subjectId,
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
