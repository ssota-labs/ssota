import type { ImpactQueueStatus } from "@ssota/contracts";
import type { ImpactQueueItem } from "@ssota/core";

export type SerializedImpactQueueItem = {
  id: string;
  projectId: string;
  sourceActionLogId: string;
  sourceNodeId: string | null;
  targetNodeId: string | null;
  dependencyEdgeId: string | null;
  workflowKey: string;
  workflowId: string | null;
  status: ImpactQueueStatus;
  priority: number;
  runAt: string;
  lockedBy: string | null;
  lockedUntil: string | null;
  attemptCount: number;
  maxAttempts: number;
  idempotencyKey: string;
  lastError: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export function serializeImpactQueueItem(
  item: ImpactQueueItem,
): SerializedImpactQueueItem {
  return {
    id: item.id,
    projectId: item.projectId,
    sourceActionLogId: item.sourceActionLogId,
    sourceNodeId: item.sourceNodeId,
    targetNodeId: item.targetNodeId,
    dependencyEdgeId: item.dependencyEdgeId,
    workflowKey: item.workflowKey,
    workflowId: item.workflowId,
    status: item.status,
    priority: item.priority,
    runAt: item.runAt.toISOString(),
    lockedBy: item.lockedBy,
    lockedUntil: item.lockedUntil?.toISOString() ?? null,
    attemptCount: item.attemptCount,
    maxAttempts: item.maxAttempts,
    idempotencyKey: item.idempotencyKey,
    lastError: item.lastError,
    payload: item.payload,
    result: item.result,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    completedAt: item.completedAt?.toISOString() ?? null,
  };
}

export function formatNodeRef(nodeId: string | null, nodeType?: unknown) {
  if (!nodeId) return "-";
  const prefix = nodeId.slice(0, 8);
  return typeof nodeType === "string" && nodeType.length > 0
    ? `${nodeType} (${prefix}…)`
    : `${prefix}…`;
}

export function formatCount(count: number) {
  return count >= 100 ? "99+" : String(count);
}
