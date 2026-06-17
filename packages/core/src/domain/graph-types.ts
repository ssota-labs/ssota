import type { LifecycleStatus } from "@ssota/contracts";

export interface GraphNode {
  id: string;
  projectId: string;
  nodeType: string;
  title: string;
  properties: Record<string, unknown>;
  content: string | null;
  lifecycleStatus: LifecycleStatus;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphEdge {
  id: string;
  projectId: string;
  edgeType: string;
  sourceNodeId: string;
  targetNodeId: string;
  properties: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateInitiativeBundleResult {
  initiativeId: string;
  releaseId: string;
  pairedWithEdgeId: string;
}
