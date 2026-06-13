"use client";

import { useMemo, useState } from "react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import { formatTableCell } from "@/lib/graph/format-table-cell";
import {
  GraphFlowCanvas,
  type GraphFlowEdge,
  type GraphFlowNode,
} from "./graph-flow-canvas";
import {
  NodeRowsDataTable,
  type NodeRowRecord,
  type PropertyColumn,
} from "./node-rows-data-table";

export type InstanceGraphRelation = {
  id: string;
  edgeType: string;
  sourceNodeId: string;
  sourceLabel: string;
  sourceNodeType: string;
  targetNodeId: string;
  targetLabel: string;
  targetNodeType: string;
};

type NodeInstancesViewProps = {
  rows: NodeRowRecord[];
  propertyColumns: PropertyColumn[];
  toolbar?: React.ReactNode;
  relations: InstanceGraphRelation[];
  actions: string[];
};

export function NodeInstancesView({
  rows,
  propertyColumns,
  toolbar,
  relations,
  actions,
}: NodeInstancesViewProps) {
  const [selected, setSelected] = useState<NodeRowRecord | null>(null);

  const selectedRelations = useMemo(() => {
    if (!selected) return [];
    return relations.filter(
      (relation) =>
        relation.sourceNodeId === selected.id || relation.targetNodeId === selected.id,
    );
  }, [relations, selected]);

  const flow = useMemo(() => {
    if (!selected) return { nodes: [] as GraphFlowNode[], edges: [] as GraphFlowEdge[] };

    const nodes = new Map<string, GraphFlowNode>();
    nodes.set(selected.id, {
      id: selected.id,
      type: "graphNode",
      position: { x: 360, y: 160 },
      data: {
        kind: "instance",
        eyebrow: selected.lifecycleStatus,
        label: String(selected.properties.title ?? selected.id.slice(0, 8)),
        description: selected.content ?? "Selected graph instance",
        badges: Object.keys(selected.properties).slice(0, 4),
      },
    });

    const flowEdges: GraphFlowEdge[] = [];
    let incomingIndex = 0;
    let outgoingIndex = 0;

    for (const relation of selectedRelations) {
      const isOutgoing = relation.sourceNodeId === selected.id;
      const neighborId = isOutgoing ? relation.targetNodeId : relation.sourceNodeId;
      const neighborLabel = isOutgoing ? relation.targetLabel : relation.sourceLabel;
      const neighborType = isOutgoing ? relation.targetNodeType : relation.sourceNodeType;
      const index = isOutgoing ? outgoingIndex++ : incomingIndex++;

      nodes.set(neighborId, {
        id: neighborId,
        type: "graphNode",
        position: {
          x: isOutgoing ? 720 : 0,
          y: 80 + index * 140,
        },
        data: {
          kind: "object",
          eyebrow: neighborType,
          label: neighborLabel,
          description: neighborId.slice(0, 8),
        },
      });

      flowEdges.push({
        id: relation.id,
        source: relation.sourceNodeId,
        target: relation.targetNodeId,
        label: relation.edgeType,
      });
    }

    actions.slice(0, 6).forEach((action, index) => {
      const id = `action-${action}`;
      nodes.set(id, {
        id,
        type: "graphNode",
        position: { x: 360 + (index % 3) * 180, y: 420 + Math.floor(index / 3) * 110 },
        data: {
          kind: "action",
          eyebrow: "action",
          label: action,
          description: "Available through executeAction()",
        },
      });
      flowEdges.push({
        id: `${selected.id}-${id}`,
        source: selected.id,
        target: id,
        label: "can run",
      });
    });

    return { nodes: [...nodes.values()], edges: flowEdges };
  }, [actions, selected, selectedRelations]);

  return (
    <>
      <NodeRowsDataTable
        rows={rows}
        propertyColumns={propertyColumns}
        toolbar={toolbar}
        onRowSelect={setSelected}
      />
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="inset-y-0 right-0 h-full w-[85vw] max-w-none border-l lg:w-[72vw]">
          {selected ? (
            <div className="flex h-full min-h-0 flex-col">
              <SheetHeader>
                <SheetTitle>Instance graph</SheetTitle>
                <SheetDescription>
                  Related edges, neighbor nodes, and actions for the selected row.
                </SheetDescription>
              </SheetHeader>
              <div className="grid min-h-0 flex-1 gap-4 px-4 pb-4 lg:grid-cols-[1fr_18rem]">
                <GraphFlowCanvas
                  nodes={flow.nodes}
                  edges={flow.edges}
                  emptyMessage="This instance has no loaded graph relationships yet."
                />
                <aside className="min-h-0 space-y-4 overflow-auto rounded-lg border bg-muted/20 p-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">
                      Selected instance
                    </div>
                    <div className="mt-1 font-mono text-xs">{selected.id}</div>
                    <Badge variant="outline" className="mt-2">
                      {selected.lifecycleStatus}
                    </Badge>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      Properties
                    </div>
                    <dl className="space-y-1 text-xs">
                      {Object.entries(selected.properties).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[6rem_1fr] gap-2">
                          <dt className="truncate text-muted-foreground">{key}</dt>
                          <dd className="truncate">{formatTableCell(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      Available actions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {actions.length ? (
                        actions.map((action) => (
                          <Badge key={action} variant="secondary">
                            {action}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No scoped actions found.
                        </span>
                      )}
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                    Back to table
                  </Button>
                </aside>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
