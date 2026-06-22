import type {
  CreateInitiativeBundleInput,
  DeleteEdgeInput,
  GetNodeInput,
  ListEdgesInput,
  ListNodesByTypeInput,
  TraverseEdgesInput,
  UpdateNodeInput,
} from "@ssota/contracts/graph";
import type {
  CreateInitiativeBundleResult,
  GraphEdge,
  GraphNode,
} from "../domain/graph-types.js";

export interface GraphReadPort {
  queryNodes(params: ListNodesByTypeInput): Promise<GraphNode[]>;
  queryEdges(params: ListEdgesInput): Promise<GraphEdge[]>;
  getNode(params: GetNodeInput): Promise<GraphNode | null>;
  /** Load by id only — for edge validation before project scope checks. */
  getNodeById(nodeId: string): Promise<GraphNode | null>;
  traverseEdges(params: TraverseEdgesInput): Promise<GraphEdge[]>;
}

/** Resolved catalog FK — produced by graph use-cases before adapter write. */
export interface ResolvedCreateNodeInput {
  projectId: string;
  nodeCatalogId: string;
  catalogKey: string;
  title: string;
  properties: Record<string, unknown>;
  schemaVersion: number;
  initiativeId?: string;
  releaseId?: string;
}

export interface ResolvedCreateEdgeInput {
  projectId: string;
  edgeCatalogId: string;
  catalogKey: string;
  sourceNodeId: string;
  targetNodeId: string;
  properties: Record<string, unknown>;
}

export interface GraphWritePort {
  createNode(input: ResolvedCreateNodeInput): Promise<GraphNode>;
  updateNode(input: UpdateNodeInput): Promise<GraphNode>;
  createEdge(input: ResolvedCreateEdgeInput): Promise<GraphEdge>;
  deleteEdge(input: DeleteEdgeInput): Promise<void>;
  createInitiativeBundle(
    input: CreateInitiativeBundleInput,
  ): Promise<CreateInitiativeBundleResult>;
}

export type { GraphNode, GraphEdge, CreateInitiativeBundleResult };
