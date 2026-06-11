import {
  ExecuteActionClientInputSchema,
  ExecuteActionInputSchema,
  FindInstructionInputSchema,
  GetActionLogInputSchema,
  QueryNodesInputSchema,
  SubmitForApprovalInputSchema,
  TraverseEdgesInputSchema,
  type ExecuteActionClientInput,
  type ExecuteActionInput,
} from "@loopos/contracts";
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
} from "@loopos/core";
import type { ExecutorType } from "@loopos/contracts";
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
): ExecuteActionInput {
  return ExecuteActionInputSchema.parse({
    ...clientInput,
    executorId,
    executorType,
  });
}

export async function executeActionForClient(
  clientInput: ExecuteActionClientInput,
  executorId: string,
  executorType: ExecutorType,
) {
  const ports = getActionPorts();
  const input = toExecuteActionInput(clientInput, executorId, executorType);
  return executeAction(ports, input);
}

export async function previewActionForClient(
  clientInput: ExecuteActionClientInput,
  executorId: string,
  executorType: ExecutorType,
) {
  const ports = getActionPorts();
  const input = toExecuteActionInput(clientInput, executorId, executorType);
  return previewAction(ports, input);
}

export async function listPendingGates() {
  const ports = getActionPorts();
  const gates = await ports.gate.listPendingGates();
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
