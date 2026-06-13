import {
  GraphFlowCanvas,
  type GraphFlowEdge,
  type GraphFlowNode,
} from "./graph-flow-canvas";

export type SchemaRelation = {
  edgeType: string;
  label: string;
  domain: string[];
  range: string[];
  cardinality: string;
};

type NodeSchemaViewProps = {
  nodeType: string;
  label: string;
  family: string;
  archetypeId: string | null;
  contentGuide: string | null;
  propertySchema: Record<string, { valueType?: string; system?: boolean }>;
  relations: SchemaRelation[];
  nodeTypeLabels: Record<string, string>;
};

export function NodeSchemaView({
  nodeType,
  label,
  family,
  archetypeId,
  contentGuide,
  propertySchema,
  relations,
  nodeTypeLabels,
}: NodeSchemaViewProps) {
  const propertyEntries = Object.entries(propertySchema);

  const incomingTypes = new Map<string, string>();
  const outgoingTypes = new Map<string, string>();

  for (const relation of relations) {
    if (relation.range.includes(nodeType)) {
      for (const connectedType of relation.domain) {
        if (connectedType === nodeType) continue;
        if (!incomingTypes.has(connectedType)) {
          incomingTypes.set(
            connectedType,
            nodeTypeLabels[connectedType] ?? connectedType,
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
            nodeTypeLabels[connectedType] ?? connectedType,
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
      position: { x: 360, y: 160 },
      data: {
        kind: "object",
        eyebrow: family,
        label,
        description: contentGuide ?? `${propertyEntries.length} properties`,
        badges: [
          archetypeId ?? "no archetype",
          `${propertyEntries.length} properties`,
        ],
      },
    },
    ...incomingList.map(([type, typeLabel], index) => ({
      id: type,
      type: "graphNode" as const,
      position: { x: 40, y: 80 + index * 140 },
      data: {
        kind: "object" as const,
        eyebrow: type,
        label: typeLabel,
        align: "right" as const,
      },
    })),
    ...outgoingList.map(([type, typeLabel], index) => ({
      id: type,
      type: "graphNode" as const,
      position: { x: 720, y: 80 + index * 140 },
      data: {
        kind: "object" as const,
        eyebrow: type,
        label: typeLabel,
        align: "left" as const,
      },
    })),
  ];

  const edges: GraphFlowEdge[] = [];

  for (const relation of relations) {
    if (relation.range.includes(nodeType)) {
      for (const connectedType of relation.domain) {
        if (connectedType === nodeType) continue;
        edges.push({
          id: `incoming-${connectedType}-${relation.edgeType}`,
          source: connectedType,
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
          target: connectedType,
          label: relation.label,
        });
      }
    }
  }

  return (
    <div className="min-h-0 flex-1 p-4">
      <GraphFlowCanvas nodes={nodes} edges={edges} />
    </div>
  );
}
