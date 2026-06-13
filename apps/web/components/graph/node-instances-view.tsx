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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ssota/ui/components/ui/tabs";
import { InstancePropertiesPanel } from "@/components/graph/instance-properties-panel";
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
import type { PropertyFieldDefinition } from "@/lib/graph/property-field-types";

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
  projectId: string;
  nodeSlug: string;
  rows: NodeRowRecord[];
  propertyColumns: PropertyColumn[];
  propertyFields: PropertyFieldDefinition[];
  toolbar?: React.ReactNode;
  relations: InstanceGraphRelation[];
};

export function NodeInstancesView({
  projectId,
  nodeSlug,
  rows,
  propertyColumns,
  propertyFields,
  toolbar,
  relations,
}: NodeInstancesViewProps) {
  const [editedRows, setEditedRows] = useState<Record<string, NodeRowRecord>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetTab, setSheetTab] = useState<"relations" | "properties">("relations");

  const mergedRows = useMemo(
    () => rows.map((row) => editedRows[row.id] ?? row),
    [editedRows, rows],
  );

  const selected = useMemo(
    () => (selectedId ? mergedRows.find((row) => row.id === selectedId) ?? null : null),
    [mergedRows, selectedId],
  );

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
          x: isOutgoing ? 720 : 40,
          y: 80 + index * 140,
        },
        data: {
          kind: "object",
          eyebrow: neighborType,
          label: neighborLabel,
          description: neighborId.slice(0, 8),
          align: isOutgoing ? "left" : "right",
        },
      });

      flowEdges.push({
        id: relation.id,
        source: relation.sourceNodeId,
        target: relation.targetNodeId,
        label: relation.edgeType,
      });
    }

    return { nodes: [...nodes.values()], edges: flowEdges };
  }, [selected, selectedRelations]);

  function openDetail(row: NodeRowRecord) {
    setSelectedId(row.id);
    setSheetTab("relations");
  }

  function updateRow(row: NodeRowRecord) {
    setEditedRows((current) => ({ ...current, [row.id]: row }));
  }

  function updateSelectedProperties(properties: Record<string, unknown>) {
    if (!selected) return;
    updateRow({ ...selected, properties });
  }

  return (
    <>
      <NodeRowsDataTable
        rows={mergedRows}
        propertyColumns={propertyColumns}
        propertyFields={propertyFields}
        toolbar={toolbar}
        projectId={projectId}
        nodeSlug={nodeSlug}
        onOpenDetail={openDetail}
        onRowChange={updateRow}
      />
      <Sheet
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent className="inset-y-0 right-0 h-full !w-[96vw] !max-w-[1440px] border-l p-0 sm:!max-w-[1440px]">
          {selected ? (
            <div className="flex h-full min-h-0 flex-col">
              <SheetHeader className="shrink-0 border-b px-6 py-4">
                <SheetTitle className="text-base">
                  {String(selected.properties.title ?? selected.id.slice(0, 8))}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {selected.id}
                </SheetDescription>
              </SheetHeader>
              <Tabs
                value={sheetTab}
                onValueChange={(value) =>
                  setSheetTab(value as "relations" | "properties")
                }
                className="flex min-h-0 flex-1 flex-col gap-0"
              >
                <div className="shrink-0 border-b px-6 py-2">
                  <TabsList variant="line">
                    <TabsTrigger value="relations">Relations</TabsTrigger>
                    <TabsTrigger value="properties">Properties</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="relations" className="min-h-0 flex-1 px-6 py-4">
                  <GraphFlowCanvas
                    nodes={flow.nodes}
                    edges={flow.edges}
                    emptyMessage="This instance has no loaded graph relationships yet."
                  />
                </TabsContent>
                <TabsContent value="properties" className="min-h-0 flex-1 px-6 py-4">
                  <InstancePropertiesPanel
                    projectId={projectId}
                    nodeSlug={nodeSlug}
                    nodeId={selected.id}
                    properties={selected.properties}
                    fields={propertyFields}
                    onUpdated={updateSelectedProperties}
                  />
                </TabsContent>
              </Tabs>
              <div className="shrink-0 border-t px-6 py-3">
                <Button type="button" variant="outline" onClick={() => setSelectedId(null)}>
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
