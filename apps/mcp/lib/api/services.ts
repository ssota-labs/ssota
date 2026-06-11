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
  GetPropertyInputSchema,
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
  serializePropertyCatalogEntry,
} from "@ssota/core";
import type { ExecutorType } from "@ssota/contracts";
import { queryNeighbors, traverseGraph } from "@/lib/graph-query";
import { getActionPorts } from "@/lib/ports";

export async function listNodeTypes() {
  const ports = getActionPorts();
  const entries = await ports.catalog.listNodeCatalogEntries();
  return entries.map(serializeNodeCatalogEntry);
}

export async function listEdgeTypes() {
  const ports = getActionPorts();
  const entries = await ports.catalog.listEdgeCatalogEntries();
  return entries.map(serializeEdgeCatalogEntry);
}

export async function listProperties() {
  const ports = getActionPorts();
  const entries = await ports.catalog.listPropertyCatalogEntries();
  return entries.map(serializePropertyCatalogEntry);
}

export async function listActionContracts() {
  const ports = getActionPorts();
  const entries = await ports.catalog.listActionCatalogEntries();
  return entries.map(serializeActionCatalogEntry);
}

export async function getActionContract(actionType: string) {
  const ports = getActionPorts();
  const entry = await ports.catalog.getActionCatalogEntry(actionType);
  return entry ? serializeActionCatalogEntry(entry) : null;
}

export async function getNodeType(nodeType: string) {
  const ports = getActionPorts();
  const entry = await ports.catalog.getNodeCatalogEntry(nodeType);
  return entry ? serializeNodeCatalogEntry(entry) : null;
}

export async function getEdgeType(edgeType: string) {
  const ports = getActionPorts();
  const entry = await ports.catalog.getEdgeCatalogEntry(edgeType);
  return entry ? serializeEdgeCatalogEntry(entry) : null;
}

export async function getProperty(propertyKey: string) {
  const ports = getActionPorts();
  const entry = await ports.catalog.getPropertyCatalogEntry(propertyKey);
  return entry ? serializePropertyCatalogEntry(entry) : null;
}

export async function getArchetype(archetypeId: string) {
  const ports = getActionPorts();
  const entry = await ports.catalog.getArchetype(archetypeId);
  return entry ? serializeArchetype(entry) : null;
}

export async function getNode(nodeId: string) {
  const ports = getActionPorts();
  const node = await ports.graph.getNode(nodeId);
  return node ? serializeNode(node) : null;
}

export async function getInstruction(instructionId: string) {
  const ports = getActionPorts();
  const instruction = await ports.catalog.getInstruction(instructionId);
  return instruction ? serializeInstruction(instruction) : null;
}

export async function getGate(gateId: string) {
  const ports = getActionPorts();
  const gate = await ports.gate.getGate(gateId);
  return gate ? serializeGate(gate) : null;
}

export async function listArchetypes() {
  const ports = getActionPorts();
  const entries = await ports.catalog.listArchetypes();
  return entries.map(serializeArchetype);
}

export async function queryNodes(
  params: ReturnType<typeof QueryNodesInputSchema.parse>,
) {
  const ports = getActionPorts();
  const nodes = await ports.graph.queryNodes(params);
  return nodes.map(serializeNode);
}

export async function traverseEdges(
  params: ReturnType<typeof TraverseEdgesInputSchema.parse>,
) {
  const ports = getActionPorts();
  const edges = await ports.graph.traverseEdges(params);
  return edges.map(serializeEdge);
}

export async function queryNeighborsService(
  params: ReturnType<typeof QueryNeighborsInputSchema.parse>,
) {
  const ports = getActionPorts();
  const result = await queryNeighbors(ports, params);
  return {
    ...result,
    edges: result.edges.map(serializeEdge),
    nodes: result.nodes.map(serializeNode),
  };
}

export async function traverseGraphService(
  params: ReturnType<typeof TraverseGraphInputSchema.parse>,
) {
  const ports = getActionPorts();
  const result = await traverseGraph(ports, params);
  return {
    ...result,
    edges: result.edges.map(serializeEdge),
    nodes: result.nodes.map(serializeNode),
  };
}

export async function findInstructions(
  params: ReturnType<typeof FindInstructionInputSchema.parse>,
) {
  const ports = getActionPorts();
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
  subjectId?: string,
): ExecuteActionInput {
  return ExecuteActionInputSchema.parse({
    ...clientInput,
    executorId,
    executorType,
    subjectId,
  });
}

export async function executeActionForClient(
  clientInput: ExecuteActionClientInput,
  executorId: string,
  executorType: ExecutorType,
  subjectId?: string,
) {
  const ports = getActionPorts();
  const input = toExecuteActionInput(
    clientInput,
    executorId,
    executorType,
    subjectId,
  );
  return executeAction(ports, input);
}

export async function previewActionForClient(
  clientInput: ExecuteActionClientInput,
  executorId: string,
  executorType: ExecutorType,
  subjectId?: string,
) {
  const ports = getActionPorts();
  const input = toExecuteActionInput(
    clientInput,
    executorId,
    executorType,
    subjectId,
  );
  return previewAction(ports, input);
}

export async function listPendingGates() {
  const ports = getActionPorts();
  const gates = await ports.gate.listPendingGates();
  return gates.map(serializeGate);
}

export async function queryGates(
  params: ReturnType<typeof QueryGatesInputSchema.parse>,
) {
  const ports = getActionPorts();
  const gates = await ports.gate.queryGates(params);
  return gates.map(serializeGate);
}

export async function submitForApproval(gateId: string, note?: string) {
  const ports = getActionPorts();
  const gate = await ports.gate.getGate(gateId);
  return {
    message: "Gate submitted for human review",
    gate: gate ? serializeGate(gate) : null,
    note,
  };
}

export async function getActionLog(
  params: ReturnType<typeof GetActionLogInputSchema.parse>,
) {
  const ports = getActionPorts();
  const log = await ports.commit.getActionLog(params);
  return log.map(serializeActionLogRecord);
}

export async function getActionLogEntry(
  params: ReturnType<typeof GetActionLogEntryInputSchema.parse>,
) {
  const ports = getActionPorts();
  const entry = params.logId
    ? await ports.commit.getActionLogEntry(params.logId)
    : await ports.commit.findByIdempotencyKey(params.idempotencyKey!);
  return entry ? serializeActionLogRecord(entry) : null;
}
