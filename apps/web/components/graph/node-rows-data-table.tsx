"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@ssota/ui/components/ui/badge";
import { DataTable } from "@ssota/ui/components/ui/data-table";
import { DataTableColumnHeader } from "@ssota/ui/components/ui/data-table-column-header";
import { EditableTableCell } from "@/components/graph/editable-table-cell";
import type { PropertyFieldDefinition } from "@/lib/graph/property-field-types";
import { cn } from "@ssota/ui/lib/utils";

export type NodeRowRecord = {
  id: string;
  lifecycleStatus: string;
  properties: Record<string, unknown>;
  content: string | null;
  updatedAt: string;
};

export type PropertyColumn = {
  key: string;
  label: string;
  valueType: string;
};

type CellAddress = {
  rowId: string;
  columnId: string;
};

type NodeRowsDataTableProps = {
  rows: NodeRowRecord[];
  propertyColumns: PropertyColumn[];
  propertyFields: PropertyFieldDefinition[];
  toolbar?: React.ReactNode;
  onOpenDetail?: (row: NodeRowRecord) => void;
  projectId?: string;
  nodeSlug?: string;
  onRowChange?: (row: NodeRowRecord) => void;
  emptyMessage?: string;
};

export function NodeRowsDataTable({
  rows,
  propertyColumns,
  propertyFields,
  toolbar,
  onOpenDetail,
  projectId,
  nodeSlug,
  onRowChange,
  emptyMessage = "아직 생성된 node row가 없습니다.",
}: NodeRowsDataTableProps) {
  const [activeCell, setActiveCell] = useState<CellAddress | null>(null);
  const [editingCell, setEditingCell] = useState<CellAddress | null>(null);

  const fieldByKey = useMemo(
    () => new Map(propertyFields.map((field) => [field.key, field])),
    [propertyFields],
  );

  const patchRow = useCallback(
    (rowId: string, patch: Partial<NodeRowRecord>) => {
      const current = rows.find((row) => row.id === rowId);
      if (!current) return;
      onRowChange?.({ ...current, ...patch });
    },
    [onRowChange, rows],
  );

  const columns: ColumnDef<NodeRowRecord>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="id" />,
      cell: ({ row }) => (
        <button
          type="button"
          className="supabase-grid-cell flex h-8 w-full items-center px-2 text-left font-mono text-xs text-primary hover:underline"
          onClick={() => onOpenDetail?.(row.original)}
        >
          {row.original.id.slice(0, 8)}
        </button>
      ),
    },
    {
      accessorKey: "lifecycleStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="lifecycle" />
      ),
      cell: ({ row }) => (
        <div className="supabase-grid-cell flex h-8 items-center px-2">
          <Badge variant="outline" className="text-[10px]">
            {row.original.lifecycleStatus}
          </Badge>
        </div>
      ),
    },
    ...propertyColumns.map(
      (property): ColumnDef<NodeRowRecord> => ({
        id: property.key,
        accessorFn: (row) => row.properties[property.key],
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={property.label}
            subtitle={property.valueType}
          />
        ),
        cell: ({ row }) => {
          const field = fieldByKey.get(property.key) ?? {
            key: property.key,
            label: property.label,
            valueType: property.valueType,
          };
          const canEdit = Boolean(projectId && nodeSlug);
          const isActive =
            activeCell?.rowId === row.original.id &&
            activeCell.columnId === property.key;
          const isEditing =
            editingCell?.rowId === row.original.id &&
            editingCell.columnId === property.key;

          if (!canEdit) {
            return (
              <div className="supabase-grid-cell flex h-8 items-center px-2 text-xs">
                {String(row.original.properties[property.key] ?? "-")}
              </div>
            );
          }

          return (
            <EditableTableCell
              projectId={projectId!}
              nodeSlug={nodeSlug!}
              nodeId={row.original.id}
              field={field}
              value={row.original.properties[property.key]}
              isActive={isActive}
              isEditing={isEditing}
              onSelect={() => {
                setActiveCell({ rowId: row.original.id, columnId: property.key });
                setEditingCell(null);
              }}
              onEdit={() => {
                setActiveCell({ rowId: row.original.id, columnId: property.key });
                setEditingCell({ rowId: row.original.id, columnId: property.key });
              }}
              onCancelEdit={() => setEditingCell(null)}
              onUpdated={(nextValue) => {
                const nextProperties = {
                  ...row.original.properties,
                  [property.key]: nextValue,
                };
                patchRow(row.original.id, { properties: nextProperties });
              }}
            />
          );
        },
      }),
    ),
    {
      accessorKey: "content",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="content" />
      ),
      cell: ({ row }) => (
        <div className="supabase-grid-cell flex h-8 max-w-xs items-center px-2 text-xs text-muted-foreground">
          <span className="truncate">{row.original.content ?? "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="updated" />
      ),
      cell: ({ row }) => (
        <div className="supabase-grid-cell flex h-8 items-center px-2 text-xs text-muted-foreground">
          {row.original.updatedAt.slice(0, 10)}
        </div>
      ),
    },
  ];

  return (
    <div
      className={cn("supabase-grid-table flex min-h-0 flex-1 flex-col")}
      onClick={() => {
        setActiveCell(null);
        setEditingCell(null);
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        filterColumn="id"
        filterPlaceholder="Filter rows..."
        toolbar={toolbar}
        emptyMessage={emptyMessage}
        className="h-full"
      />
    </div>
  );
}
