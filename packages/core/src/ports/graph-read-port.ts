import type {
  CreateEdgeInput,
  CreateInitiativeBundleInput,
  CreateNodeInput,
  DeleteEdgeInput,
  GetNodeInput,
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
  getNode(params: GetNodeInput): Promise<GraphNode | null>;
  /** Load by id only — for edge validation before project scope checks. */
  getNodeById(nodeId: string): Promise<GraphNode | null>;
  traverseEdges(params: TraverseEdgesInput): Promise<GraphEdge[]>;
}

export interface GraphWritePort {
  createNode(input: CreateNodeInput): Promise<GraphNode>;
  updateNode(input: UpdateNodeInput): Promise<GraphNode>;
  createEdge(input: CreateEdgeInput): Promise<GraphEdge>;
  deleteEdge(input: DeleteEdgeInput): Promise<void>;
  createInitiativeBundle(
    input: CreateInitiativeBundleInput,
  ): Promise<CreateInitiativeBundleResult>;
}

export type { GraphNode, GraphEdge, CreateInitiativeBundleResult };
