import {
  GraphFlowCanvas,
  type GraphFlowEdge,
  type GraphFlowNode,
  type GraphFlowNodeData,
} from "./graph-flow-canvas";
import { layoutGraphWithDagre } from "@/lib/graph/dagre-layout";

export type SchemaRelation = {
  edgeType: string;
  label: string;
  domain: string[];
  range: string[];
  cardinality: string;
};

export type SchemaNodeTypeMeta = {
  label: string;
  family: string;
  archetypeId: string | null;
  contentGuide: string | null;
  propertyCount: number;
};

type NodeSchemaViewProps = {
  nodeType: string;
  label: string;
  family: string;
  archetypeId: string | null;
  contentGuide: string | null;
  propertySchema: Record<string, { valueType?: string; system?: boolean }>;
  relations: SchemaRelation[];
  nodeTypeCatalog: Record<string, SchemaNodeTypeMeta>;
};

function objectNodeData(meta: SchemaNodeTypeMeta): GraphFlowNodeData {
  return {
    kind: "object",
    eyebrow: meta.family,
    label: meta.label,
    description: meta.contentGuide ?? `${meta.propertyCount} properties`,
    badges: [
      meta.archetypeId ?? "no archetype",
      `${meta.propertyCount} properties`,
    ],
  };
}

function incomingNodeId(type: string) {
  return `incoming:${type}`;
}

function outgoingNodeId(type: string) {
  return `outgoing:${type}`;
}

export function NodeSchemaView({
  nodeType,
  label,
  family,
  archetypeId,
  contentGuide,
  propertySchema,
  relations,
  nodeTypeCatalog,
}: NodeSchemaViewProps) {
  const propertyEntries = Object.entries(propertySchema);

  const centerMeta: SchemaNodeTypeMeta = {
    label,
    family,
    archetypeId,
    contentGuide,
    propertyCount: propertyEntries.length,
  };

  const incomingTypes = new Map<string, SchemaNodeTypeMeta>();
  const outgoingTypes = new Map<string, SchemaNodeTypeMeta>();

  for (const relation of relations) {
    if (relation.range.includes(nodeType)) {
      for (const connectedType of relation.domain) {
        if (connectedType === nodeType) continue;
        if (!incomingTypes.has(connectedType)) {
          incomingTypes.set(
            connectedType,
            nodeTypeCatalog[connectedType] ?? fallbackMeta(connectedType),
          );
        }
      }
    }
    if (relation.domain.includes(nodeType)) {
      for (const connectedType of relation.range) {
        if (connectedType === nodeType) continue;
        if (!outgoingTypes.has(connectedType)) {
          outgoingTypes.set(
            connectedType,
            nodeTypeCatalog[connectedType] ?? fallbackMeta(connectedType),
          );
        }
      }
    }
  }

  const incomingList = [...incomingTypes.entries()];
  const outgoingList = [...outgoingTypes.entries()];

  const nodes: GraphFlowNode[] = [
    {
      id: nodeType,
      type: "graphNode",
      position: { x: 0, y: 0 },
      data: objectNodeData(centerMeta),
    },
    ...incomingList.map(([type, meta]) => ({
      id: incomingNodeId(type),
      type: "graphNode" as const,
      position: { x: 0, y: 0 },
      data: {
        ...objectNodeData(meta),
        align: "right" as const,
      },
    })),
    ...outgoingList.map(([type, meta]) => ({
      id: outgoingNodeId(type),
      type: "graphNode" as const,
      position: { x: 0, y: 0 },
      data: objectNodeData(meta),
    })),
  ];

  const edges: GraphFlowEdge[] = [];

  for (const relation of relations) {
    if (relation.range.includes(nodeType)) {
      for (const connectedType of relation.domain) {
        if (connectedType === nodeType) continue;
        edges.push({
          id: `incoming-${connectedType}-${relation.edgeType}`,
          source: incomingNodeId(connectedType),
          target: nodeType,
          label: relation.label,
        });
      }
    }
    if (relation.domain.includes(nodeType)) {
      for (const connectedType of relation.range) {
        if (connectedType === nodeType) continue;
        edges.push({
          id: `outgoing-${connectedType}-${relation.edgeType}`,
          source: nodeType,
          target: outgoingNodeId(connectedType),
          label: relation.label,
        });
      }
    }
  }

  const { nodes: layoutedNodes, edges: layoutedEdges } = layoutGraphWithDagre(
    nodes,
    edges,
    "LR",
  );

  return (
    <div className="min-h-0 flex-1 p-4">
      <GraphFlowCanvas
        nodes={layoutedNodes as GraphFlowNode[]}
        edges={layoutedEdges}
        fitViewPadding={0.25}
      />
    </div>
  );
}

function fallbackMeta(nodeType: string): SchemaNodeTypeMeta {
  return {
    label: nodeType,
    family: nodeType,
    archetypeId: null,
    contentGuide: null,
    propertyCount: 0,
  };
}
