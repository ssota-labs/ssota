import type {
  ActionCatalogEntry as WireActionCatalogEntry,
  ActionLogRecord as WireActionLogRecord,
  Archetype as WireArchetype,
  Edge as WireEdge,
  EdgeCatalogEntry as WireEdgeCatalogEntry,
  Gate as WireGate,
  ImpactQueueItem as WireImpactQueueItem,
  Node as WireNode,
  NodeCatalogEntry as WireNodeCatalogEntry,
  Task as WireTask,
  TaskDetail as WireTaskDetail,
  TaskIndex as WireTaskIndex,
  WorkflowWire,
} from "@ssota/contracts";
import { workflowRowToWire } from "@ssota/contracts";
import { buildWorkflowPackage } from "../workflow/render-workflow-package.js";
import { computeIsRunnable } from "./task-dependency.js";
import type {
  ActionCatalogEntry,
  ActionLogRecord,
  Archetype,
  Edge,
  EdgeCatalogEntry,
  Gate,
  ImpactQueueItem,
  Workflow,
  Node,
  NodeCatalogEntry,
  Task,
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

export function serializeTask(task: Task): WireTask {
  return {
    ...task,
    completedAt: task.completedAt ? toIso(task.completedAt) : null,
    createdAt: toIso(task.createdAt),
    updatedAt: toIso(task.updatedAt),
  };
}

export function serializeTaskIndex(task: Task): WireTaskIndex {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    workflowKey: task.workflowKey,
    assignee: task.assignee,
    executorType: task.executorType,
    targetNodeId: task.targetNodeId,
    updatedAt: toIso(task.updatedAt),
  };
}

export function serializeTaskDetail(
  task: Task,
  blockers: Task[],
): WireTaskDetail {
  return {
    ...serializeTask(task),
    blockedBy: blockers.map(serializeTaskIndex),
    isRunnable: computeIsRunnable(task, blockers),
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

export function serializeWorkflow(workflow: Workflow): WorkflowWire {
  return workflowRowToWire({
    id: workflow.id,
    slug: workflow.slug,
    workflowKey: workflow.workflowKey,
    lifecycle: workflow.lifecycle,
    scope: workflow.scope,
    spec: workflow.spec,
    createdAt: toIso(workflow.createdAt),
    updatedAt: toIso(workflow.updatedAt),
  });
}

export function serializeWorkflowPackage(
  workflow: Workflow,
): WorkflowWire & {
  renderedText: string;
} {
  const wire = serializeWorkflow(workflow);
  const pkg = buildWorkflowPackage(workflow);
  return {
    ...wire,
    renderedText: pkg.renderedText,
  };
}
