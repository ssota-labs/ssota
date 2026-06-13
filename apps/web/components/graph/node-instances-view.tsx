"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
} from "@ssota/ui/components/ui/sheet";
import { InstanceRowInspector } from "@/components/graph/instance-row-inspector";
import type { GraphFlowEdge, GraphFlowNode } from "./graph-flow-canvas";
import {
  NodeRowsDataTable,
  type NodeRowRecord,
  type PropertyColumn,
} from "./node-rows-data-table";
import type { PropertyFieldDefinition } from "@/lib/graph/property-field-types";
import type { InstanceGraphRelation } from "./node-instances-view.types";

export type { InstanceGraphRelation } from "./node-instances-view.types";

type NodeInstancesViewProps = {
  projectId: string;
  nodeSlug: string;
  nodeTypeLabel: string;
  rows: NodeRowRecord[];
  propertyColumns: PropertyColumn[];
  propertyFields: PropertyFieldDefinition[];
  toolbar?: React.ReactNode;
  relations: InstanceGraphRelation[];
};

export function NodeInstancesView({
  projectId,
  nodeSlug,
  nodeTypeLabel,
  rows,
  propertyColumns,
  propertyFields,
  toolbar,
  relations,
}: NodeInstancesViewProps) {
  const [editedRows, setEditedRows] = useState<Record<string, NodeRowRecord>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const flow = useMemo(() => buildInstanceFlow(selected, selectedRelations), [
    selected,
    selectedRelations,
  ]);

  function openDetail(row: NodeRowRecord) {
    setSelectedId(row.id);
  }

  function updateRow(row: NodeRowRecord) {
    setEditedRows((current) => ({ ...current, [row.id]: row }));
  }

  function updateSelectedProperties(properties: Record<string, unknown>) {
    if (!selected) return;
    updateRow({ ...selected, properties });
  }

  const filterPlaceholder = propertyColumns.length
    ? `Filter by id, ${propertyColumns
        .slice(0, 3)
        .map((column) => column.key)
        .join(", ")}…`
    : "Filter rows…";

  return (
    <>
      <div className="instance-grid-table flex min-h-0 flex-1 flex-col">
        <NodeRowsDataTable
          rows={mergedRows}
          propertyColumns={propertyColumns}
          propertyFields={propertyFields}
          toolbar={toolbar}
          projectId={projectId}
          nodeSlug={nodeSlug}
          selectedRowId={selectedId}
          filterPlaceholder={filterPlaceholder}
          onOpenDetail={openDetail}
          onRowChange={updateRow}
        />
      </div>
      <Sheet
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          side="right"
          className="inset-y-0 right-0 h-full w-full max-w-none border-l p-0 sm:max-w-none"
        >
          {selected ? (
            <InstanceRowInspector
              key={selected.id}
              projectId={projectId}
              nodeSlug={nodeSlug}
              nodeTypeLabel={nodeTypeLabel}
              nodeId={selected.id}
              lifecycleStatus={selected.lifecycleStatus}
              content={selected.content}
              updatedAt={selected.updatedAt}
              properties={selected.properties}
              fields={propertyFields}
              relations={selectedRelations}
              flow={flow}
              onClose={() => setSelectedId(null)}
              onUpdated={updateSelectedProperties}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function buildInstanceFlow(
  selected: NodeRowRecord | null,
  selectedRelations: InstanceGraphRelation[],
) {
  if (!selected) return { nodes: [], edges: [] };

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
}
