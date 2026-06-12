import type {
  ActionCatalogEntry as WireActionCatalogEntry,
  ActionLogRecord as WireActionLogRecord,
  Archetype as WireArchetype,
  Edge as WireEdge,
  EdgeCatalogEntry as WireEdgeCatalogEntry,
  Gate as WireGate,
  ImpactQueueItem as WireImpactQueueItem,
  Instruction as WireInstruction,
  Node as WireNode,
  NodeCatalogEntry as WireNodeCatalogEntry,
} from "@ssota/contracts";
import type {
  ActionCatalogEntry,
  ActionLogRecord,
  Archetype,
  Edge,
  EdgeCatalogEntry,
  Gate,
  ImpactQueueItem,
  Instruction,
  Node,
  NodeCatalogEntry,
} from "./types.js";

function toIso(date: Date): string {
  return date.toISOString();
}

export function serializeNode(node: Node): WireNode {
  return {
    ...node,
    createdAt: toIso(node.createdAt),
    updatedAt: toIso(node.updatedAt),
  };
}

export function serializeEdge(edge: Edge): WireEdge {
  return {
    ...edge,
    createdAt: toIso(edge.createdAt),
  };
}

export function serializeGate(gate: Gate): WireGate {
  return {
    ...gate,
    createdAt: toIso(gate.createdAt),
  };
}

export function serializeActionLogRecord(
  record: ActionLogRecord,
): WireActionLogRecord {
  return {
    ...record,
    createdAt: toIso(record.createdAt),
  };
}

export function serializeImpactQueueItem(
  item: ImpactQueueItem,
): WireImpactQueueItem {
  return {
    ...item,
    runAt: toIso(item.runAt),
    lockedUntil: item.lockedUntil ? toIso(item.lockedUntil) : null,
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt),
    completedAt: item.completedAt ? toIso(item.completedAt) : null,
  };
}

export function serializeNodeCatalogEntry(
  entry: NodeCatalogEntry,
): WireNodeCatalogEntry {
  return { ...entry };
}

export function serializeEdgeCatalogEntry(
  entry: EdgeCatalogEntry,
): WireEdgeCatalogEntry {
  return { ...entry };
}

export function serializeActionCatalogEntry(
  entry: ActionCatalogEntry,
): WireActionCatalogEntry {
  return { ...entry };
}

export function serializeArchetype(archetype: Archetype): WireArchetype {
  return { ...archetype };
}

export function serializeInstruction(
  instruction: Instruction,
): WireInstruction {
  return { ...instruction };
}
