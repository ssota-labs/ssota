import { randomUUID } from "node:crypto";
import type {
  CreateInitiativeBundleInput,
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
import { readLifecycleStatus } from "../domain/graph-types.js";
import { GraphError } from "../domain/graph-errors.js";
import { assertGraphNodeInProject } from "../domain/graph-scope.js";
import type {
  GraphReadPort,
  GraphWritePort,
  ResolvedCreateEdgeInput,
  ResolvedCreateNodeInput,
} from "../ports/graph-read-port.js";

export interface InMemoryGraphStore {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
}

export function createInMemoryGraphStore(): InMemoryGraphStore {
  return { nodes: new Map(), edges: new Map() };
}

function filterNodes(
  store: InMemoryGraphStore,
  params: ListNodesByTypeInput,
): GraphNode[] {
  const rows = [...store.nodes.values()].filter(
    (node) => node.projectId === params.projectId,
  );
  return rows
    .filter(
      (node) =>
        !params.nodeCatalogId || node.nodeCatalogId === params.nodeCatalogId,
    )
    .filter(
      (node) => !params.catalogKey || node.catalogKey === params.catalogKey,
    )
    .filter(
      (node) =>
        !params.lifecycleStatus ||
        readLifecycleStatus(node.properties) === params.lifecycleStatus,
    )
    .slice(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 100));
}

export function createInMemoryGraphReadPort(
  store: InMemoryGraphStore,
): GraphReadPort {
  return {
    async queryNodes(params) {
      return filterNodes(store, params);
    },
    async getNode(params: GetNodeInput) {
      const node = store.nodes.get(params.nodeId) ?? null;
      if (!node || node.projectId !== params.projectId) return null;
      return node;
    },
    async getNodeById(nodeId: string) {
      return store.nodes.get(nodeId) ?? null;
    },
    async traverseEdges(params: TraverseEdgesInput) {
      const edges = [...store.edges.values()].filter(
        (edge) => edge.projectId === params.projectId,
      );
      return edges.filter((edge) => {
        if (
          params.edgeCatalogId &&
          edge.edgeCatalogId !== params.edgeCatalogId
        ) {
          return false;
        }
        if (params.catalogKey && edge.catalogKey !== params.catalogKey) {
          return false;
        }
        if (params.direction === "outgoing") {
          return edge.sourceNodeId === params.nodeId;
        }
        if (params.direction === "incoming") {
          return edge.targetNodeId === params.nodeId;
        }
        return (
          edge.sourceNodeId === params.nodeId ||
          edge.targetNodeId === params.nodeId
        );
      });
    },

    async queryEdges(params) {
      const rows = [...store.edges.values()].filter(
        (edge) => edge.projectId === params.projectId,
      );
      return rows
        .filter(
          (edge) =>
            !params.edgeCatalogId || edge.edgeCatalogId === params.edgeCatalogId,
        )
        .filter(
          (edge) => !params.catalogKey || edge.catalogKey === params.catalogKey,
        )
        .slice(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 100));
    },
  };
}

export function createInMemoryGraphWritePort(
  store: InMemoryGraphStore,
): GraphWritePort {
  return {
    async createNode(input: ResolvedCreateNodeInput) {
      const now = new Date();
      const node: GraphNode = {
        id: randomUUID(),
        projectId: input.projectId,
        nodeCatalogId: input.nodeCatalogId,
        catalogKey: input.catalogKey,
        catalogLabel: input.catalogKey,
        title: input.title,
        properties: input.properties ?? {},
        schemaVersion: input.schemaVersion ?? 1,
        createdAt: now,
        updatedAt: now,
      };
      store.nodes.set(node.id, node);
      return node;
    },

    async updateNode(input: UpdateNodeInput) {
      const existing = store.nodes.get(input.nodeId);
      assertGraphNodeInProject(input.projectId, existing ?? null);
      const updated: GraphNode = {
        ...existing!,
        title: input.title ?? existing!.title,
        properties: input.properties ?? existing!.properties,
        updatedAt: new Date(),
      };
      store.nodes.set(updated.id, updated);
      return updated;
    },

    async createEdge(input: ResolvedCreateEdgeInput) {
      const now = new Date();
      const edge: GraphEdge = {
        id: randomUUID(),
        projectId: input.projectId,
        edgeCatalogId: input.edgeCatalogId,
        catalogKey: input.catalogKey,
        catalogLabel: input.catalogKey,
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.targetNodeId,
        properties: input.properties ?? {},
        createdAt: now,
      };
      store.edges.set(edge.id, edge);
      return edge;
    },

    async deleteEdge(input: DeleteEdgeInput) {
      const edge = store.edges.get(input.edgeId);
      if (!edge || edge.projectId !== input.projectId) {
        throw new GraphError("NOT_FOUND", `Edge '${input.edgeId}' not found`);
      }
      store.edges.delete(input.edgeId);
    },

    async createInitiativeBundle(
      input: CreateInitiativeBundleInput,
    ): Promise<CreateInitiativeBundleResult> {
      const write = createInMemoryGraphWritePort(store);
      const initiative = await write.createNode({
        projectId: input.projectId,
        nodeCatalogId: "00000000-0000-4000-8000-000000000009",
        catalogKey: "initiative",
        title: input.initiativeTitle,
        properties: {
          lifecycleStatus: "Draft",
          ...(input.initiativeProperties ?? {}),
        },
        schemaVersion: 1,
      });
      const release = await write.createNode({
        projectId: input.projectId,
        nodeCatalogId: "00000000-0000-4000-8000-000000000010",
        catalogKey: "release",
        title: input.releaseVersion,
        properties: {
          lifecycleStatus: "Draft",
          ...(input.releaseProperties ?? {}),
        },
        schemaVersion: 1,
      });
      const pairedEdge = await write.createEdge({
        projectId: input.projectId,
        edgeCatalogId: "00000000-0000-4000-9000-000000000003",
        catalogKey: "paired_with",
        sourceNodeId: initiative.id,
        targetNodeId: release.id,
        properties: {},
      });
      return {
        initiativeId: initiative.id,
        releaseId: release.id,
        pairedWithEdgeId: pairedEdge.id,
      };
    },
  };
}
