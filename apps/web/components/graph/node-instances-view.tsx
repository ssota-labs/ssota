"use client";

import { useMemo, useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import {
  GraphFlowCanvas,
  type GraphFlowEdge,
  type GraphFlowNode,
} from "./graph-flow-canvas";
import {
  alignNodesByColumnEdge,
  estimateGraphNodeWidth,
} from "@/lib/graph/dagre-layout";
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
};

export function NodeInstancesView({
  rows,
  propertyColumns,
  toolbar,
  relations,
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
    const incomingNodeIds: string[] = [];
    const outgoingNodeIds: string[] = [];

    for (const relation of selectedRelations) {
      const isOutgoing = relation.sourceNodeId === selected.id;
      const neighborId = isOutgoing ? relation.targetNodeId : relation.sourceNodeId;
      const neighborLabel = isOutgoing ? relation.targetLabel : relation.sourceLabel;
      const neighborType = isOutgoing ? relation.targetNodeType : relation.sourceNodeType;
      const index = isOutgoing ? outgoingIndex++ : incomingIndex++;

      const neighborData = {
        kind: "object" as const,
        eyebrow: neighborType,
        label: neighborLabel,
        description: neighborId.slice(0, 8),
      };
      const layoutWidth = estimateGraphNodeWidth(neighborData);

      if (isOutgoing) {
        outgoingNodeIds.push(neighborId);
      } else {
        incomingNodeIds.push(neighborId);
      }

      nodes.set(neighborId, {
        id: neighborId,
        type: "graphNode",
        position: {
          x: isOutgoing ? 720 : 40,
          y: 80 + index * 140,
        },
        data: { ...neighborData, layoutWidth },
      });

      flowEdges.push({
        id: relation.id,
        source: relation.sourceNodeId,
        target: relation.targetNodeId,
        label: relation.edgeType,
      });
    }

    const widthById = Object.fromEntries(
      [...nodes.values()].map((node) => [
        node.id,
        node.data.layoutWidth ?? estimateGraphNodeWidth(node.data),
      ]),
    );

    let positionedNodes = [...nodes.values()];
    positionedNodes = alignNodesByColumnEdge(
      positionedNodes,
      (node) => incomingNodeIds.includes(node.id),
      "right",
      widthById,
    );
    positionedNodes = alignNodesByColumnEdge(
      positionedNodes,
      (node) => outgoingNodeIds.includes(node.id),
      "left",
      widthById,
    );

    return { nodes: positionedNodes, edges: flowEdges };
  }, [selected, selectedRelations]);

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
              <SheetHeader className="shrink-0">
                <SheetTitle>Instance graph</SheetTitle>
                <SheetDescription>
                  Connected neighbor nodes and relations for the selected row.
                </SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
                <GraphFlowCanvas
                  nodes={flow.nodes}
                  edges={flow.edges}
                  emptyMessage="This instance has no loaded graph relationships yet."
                />
              </div>
              <div className="shrink-0 border-t px-4 py-3">
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                  Back to table
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
