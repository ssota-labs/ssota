import { createEdge } from "@ssota/core";
import type { EdgeType } from "@ssota/contracts";
import { getGraphDeps } from "@/lib/graph/graph-deps";

async function createGoalEdge(input: {
  projectId: string;
  catalogKey: EdgeType;
  sourceNodeId: string;
  targetNodeId: string;
}) {
  const deps = getGraphDeps(input.projectId);
  return createEdge(deps, {
    projectId: input.projectId,
    catalogKey: input.catalogKey,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
  });
}

export async function createContributesToEdge(input: {
  projectId: string;
  keyResultId: string;
  objectiveId: string;
}) {
  return createGoalEdge({
    projectId: input.projectId,
    catalogKey: "contributes_to",
    sourceNodeId: input.keyResultId,
    targetNodeId: input.objectiveId,
  });
}

export async function createMeasuredByEdge(input: {
  projectId: string;
  keyResultId: string;
  kpiId: string;
}) {
  return createGoalEdge({
    projectId: input.projectId,
    catalogKey: "measured_by",
    sourceNodeId: input.keyResultId,
    targetNodeId: input.kpiId,
  });
}

export async function createTrackedByEdge(input: {
  projectId: string;
  objectiveId: string;
  kpiId: string;
}) {
  return createGoalEdge({
    projectId: input.projectId,
    catalogKey: "tracked_by",
    sourceNodeId: input.objectiveId,
    targetNodeId: input.kpiId,
  });
}

export async function createInformsEdge(input: {
  projectId: string;
  roadmapId: string;
  objectiveId: string;
}) {
  return createGoalEdge({
    projectId: input.projectId,
    catalogKey: "informs",
    sourceNodeId: input.roadmapId,
    targetNodeId: input.objectiveId,
  });
}

export async function createSnapshotFromEdge(input: {
  projectId: string;
  snapshotId: string;
  kpiId: string;
}) {
  return createGoalEdge({
    projectId: input.projectId,
    catalogKey: "snapshotted_from",
    sourceNodeId: input.snapshotId,
    targetNodeId: input.kpiId,
  });
}
