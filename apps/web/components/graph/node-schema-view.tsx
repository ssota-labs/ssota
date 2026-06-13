import { Badge } from "@ssota/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@ssota/ui/components/ui/card";
import { AddActionSheet, AddInstructionSheet, AddPropertySheet } from "./node-table-actions";
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

export type SchemaAction = {
  actionType: string;
  label: string;
  executor: string;
  effectsCount: number;
};

type NodeSchemaViewProps = {
  projectId: string;
  nodeType: string;
  label: string;
  family: string;
  archetypeId: string | null;
  lifecycle: string;
  contentGuide: string | null;
  propertySchema: Record<string, { valueType?: string; system?: boolean }>;
  relations: SchemaRelation[];
  actions: SchemaAction[];
};

export function NodeSchemaView({
  projectId,
  nodeType,
  label,
  family,
  archetypeId,
  lifecycle,
  contentGuide,
  propertySchema,
  relations,
  actions,
}: NodeSchemaViewProps) {
  const propertyEntries = Object.entries(propertySchema);
  const incoming = relations.filter((relation) => relation.range.includes(nodeType));
  const outgoing = relations.filter((relation) => relation.domain.includes(nodeType));
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
    ...incoming.map((relation, index) => ({
      id: `incoming-${relation.edgeType}`,
      type: "graphNode" as const,
      position: { x: 0, y: 80 + index * 140 },
      data: {
        kind: "relation" as const,
        eyebrow: "incoming",
        label: relation.label,
        description: `${relation.domain.join(", ")} → ${relation.range.join(", ")}`,
        badges: [relation.cardinality],
      },
    })),
    ...outgoing.map((relation, index) => ({
      id: `outgoing-${relation.edgeType}`,
      type: "graphNode" as const,
      position: { x: 720, y: 80 + index * 140 },
      data: {
        kind: "relation" as const,
        eyebrow: "outgoing",
        label: relation.label,
        description: `${relation.domain.join(", ")} → ${relation.range.join(", ")}`,
        badges: [relation.cardinality],
      },
    })),
    ...actions.slice(0, 6).map((action, index) => ({
      id: `action-${action.actionType}`,
      type: "graphNode" as const,
      position: { x: 240 + (index % 3) * 220, y: 440 + Math.floor(index / 3) * 120 },
      data: {
        kind: "action" as const,
        eyebrow: action.executor,
        label: action.label,
        description: `${action.effectsCount} effects`,
      },
    })),
  ];

  const edges: GraphFlowEdge[] = [
    ...incoming.map((relation) => ({
      id: `incoming-edge-${relation.edgeType}`,
      source: `incoming-${relation.edgeType}`,
      target: nodeType,
      label: relation.edgeType,
    })),
    ...outgoing.map((relation) => ({
      id: `outgoing-edge-${relation.edgeType}`,
      source: nodeType,
      target: `outgoing-${relation.edgeType}`,
      label: relation.edgeType,
    })),
    ...actions.slice(0, 6).map((action) => ({
      id: `action-edge-${action.actionType}`,
      source: nodeType,
      target: `action-${action.actionType}`,
      label: "can run",
    })),
  ];

  return (
    <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1fr_20rem]">
      <GraphFlowCanvas nodes={nodes} edges={edges} />
      <aside className="min-h-0 space-y-4 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Schema actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <AddPropertySheet nodeType={nodeType} projectId={projectId} />
            <AddActionSheet nodeType={nodeType} projectId={projectId} />
            <AddInstructionSheet nodeType={nodeType} projectId={projectId} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Properties</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {propertyEntries.length ? (
              propertyEntries.map(([key, field]) => (
                <Badge key={key} variant={field.system ? "default" : "secondary"}>
                  {key}
                  {field.valueType ? ` · ${field.valueType}` : ""}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                No properties defined.
              </span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {lifecycle || "No transitions configured."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actions.length ? (
              actions.map((action) => (
                <div key={action.actionType} className="rounded-md border p-2 text-sm">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.actionType} · {action.executor}
                  </div>
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                No scoped actions found.
              </span>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
