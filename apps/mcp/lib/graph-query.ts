import type { ActionPorts, Edge, Node } from "@ssota/core";
import type { QueryNeighborsInput, TraverseGraphInput } from "@ssota/contracts";

export interface NeighborQueryResult {
  nodeId: string;
  edges: Edge[];
  nodes: Node[];
}

export interface GraphTraversalResult {
  startNodeId: string;
  maxHops: number;
  edges: Edge[];
  nodes: Node[];
}

export async function queryNeighbors(
  ports: ActionPorts,
  params: QueryNeighborsInput,
): Promise<NeighborQueryResult> {
  const edges = await ports.graph.traverseEdges({
    nodeId: params.nodeId,
    direction: params.direction,
    edgeType: params.edgeType,
  });

  const neighborIds = new Set<string>();
  for (const edge of edges) {
    if (params.direction === "outgoing" || params.direction === "both") {
      if (edge.sourceNodeId === params.nodeId) {
        neighborIds.add(edge.targetNodeId);
      }
    }
    if (params.direction === "incoming" || params.direction === "both") {
      if (edge.targetNodeId === params.nodeId) {
        neighborIds.add(edge.sourceNodeId);
      }
    }
  }

  const nodes = (
    await Promise.all([...neighborIds].map((id) => ports.graph.getNode(id)))
  ).filter((node: Node | null): node is Node => node !== null);

  return { nodeId: params.nodeId, edges, nodes };
}

export async function traverseGraph(
  ports: ActionPorts,
  params: TraverseGraphInput,
): Promise<GraphTraversalResult> {
  const visitedNodeIds = new Set<string>([params.startNodeId]);
  const collectedEdges = new Map<string, Edge>();
  const collectedNodes = new Map<string, Node>();

  const startNode = await ports.graph.getNode(params.startNodeId);
  if (startNode) {
    collectedNodes.set(startNode.id, startNode);
  }

  let frontier = [params.startNodeId];

  for (let hop = 0; hop < params.maxHops; hop++) {
    if (frontier.length === 0) break;
    if (collectedNodes.size >= params.limit) break;

    const nextFrontier: string[] = [];

    for (const nodeId of frontier) {
      const edges = await ports.graph.traverseEdges({
        nodeId,
        direction: params.direction,
      });

      for (const edge of edges) {
        if (params.edgeTypes && !params.edgeTypes.includes(edge.edgeType)) {
          continue;
        }

        collectedEdges.set(edge.id, edge);

        const neighborIds: string[] = [];
        if (params.direction === "outgoing" || params.direction === "both") {
          if (edge.sourceNodeId === nodeId) {
            neighborIds.push(edge.targetNodeId);
          }
        }
        if (params.direction === "incoming" || params.direction === "both") {
          if (edge.targetNodeId === nodeId) {
            neighborIds.push(edge.sourceNodeId);
          }
        }

        for (const neighborId of neighborIds) {
          if (visitedNodeIds.has(neighborId)) continue;
          if (collectedNodes.size >= params.limit) break;

          const neighbor = await ports.graph.getNode(neighborId);
          if (!neighbor) continue;
          if (params.nodeTypes && !params.nodeTypes.includes(neighbor.nodeType)) {
            continue;
          }

          visitedNodeIds.add(neighborId);
          collectedNodes.set(neighborId, neighbor);
          nextFrontier.push(neighborId);
        }
      }
    }

    frontier = nextFrontier;
  }

  return {
    startNodeId: params.startNodeId,
    maxHops: params.maxHops,
    edges: [...collectedEdges.values()],
    nodes: [...collectedNodes.values()],
  };
}
