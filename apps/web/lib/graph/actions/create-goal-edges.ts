import { createEdge } from "@ssota/core";
import type { EdgeType } from "@ssota/contracts";
import { getGraphDeps } from "@/lib/graph/graph-deps";

async function createGoalEdge(input: {
  teamspaceId: string;
  catalogKey: EdgeType;
  sourceNodeId: string;
  targetNodeId: string;
}) {
  const deps = getGraphDeps(input.teamspaceId);
  return createEdge(deps, {
    teamspaceId: input.teamspaceId,
    catalogKey: input.catalogKey,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
  });
}

export async function createContributesToEdge(input: {
  teamspaceId: string;
  keyResultId: string;
  objectiveId: string;
}) {
  return createGoalEdge({
    teamspaceId: input.teamspaceId,
    catalogKey: "contributes_to",
    sourceNodeId: input.keyResultId,
    targetNodeId: input.objectiveId,
  });
}

export async function createMeasuredByEdge(input: {
  teamspaceId: string;
  keyResultId: string;
  kpiId: string;
}) {
  return createGoalEdge({
    teamspaceId: input.teamspaceId,
    catalogKey: "measured_by",
    sourceNodeId: input.keyResultId,
    targetNodeId: input.kpiId,
  });
}

export async function createTrackedByEdge(input: {
  teamspaceId: string;
  objectiveId: string;
  kpiId: string;
}) {
  return createGoalEdge({
    teamspaceId: input.teamspaceId,
    catalogKey: "tracked_by",
    sourceNodeId: input.objectiveId,
    targetNodeId: input.kpiId,
  });
}

export async function createInformsEdge(input: {
  teamspaceId: string;
  roadmapId: string;
  objectiveId: string;
}) {
  return createGoalEdge({
    teamspaceId: input.teamspaceId,
    catalogKey: "informs",
    sourceNodeId: input.roadmapId,
    targetNodeId: input.objectiveId,
  });
}

export async function createSnapshotFromEdge(input: {
  teamspaceId: string;
  snapshotId: string;
  kpiId: string;
}) {
  return createGoalEdge({
    teamspaceId: input.teamspaceId,
    catalogKey: "snapshotted_from",
    sourceNodeId: input.snapshotId,
    targetNodeId: input.kpiId,
  });
}
