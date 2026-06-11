"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@ssota/ui/components/ui/badge";
import { DataTable } from "@ssota/ui/components/ui/data-table";
import { DataTableColumnHeader } from "@ssota/ui/components/ui/data-table-column-header";

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

function formatCell(value: unknown) {
  if (value === undefined || value === null) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function NodeRowsDataTable({
  rows,
  propertyColumns,
  toolbar,
  emptyMessage = "아직 생성된 node row가 없습니다.",
}: {
  rows: NodeRowRecord[];
  propertyColumns: PropertyColumn[];
  toolbar?: React.ReactNode;
  emptyMessage?: string;
}) {
  const columns: ColumnDef<NodeRowRecord>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="id" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.id.slice(0, 8)}</span>
      ),
    },
    {
      accessorKey: "lifecycleStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="lifecycle" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.lifecycleStatus}</Badge>
      ),
    },
    ...propertyColumns.map(
      (property): ColumnDef<NodeRowRecord> => ({
        id: property.key,
        accessorFn: (row) => formatCell(row.properties[property.key]),
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={property.label}
            subtitle={property.valueType}
          />
        ),
        cell: ({ row }) => formatCell(row.original.properties[property.key]),
      }),
    ),
    {
      accessorKey: "content",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="content" />
      ),
      cell: ({ row }) => (
        <span className="max-w-xs truncate text-muted-foreground">
          {row.original.content ?? "-"}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="updated" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.updatedAt.slice(0, 10)}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      filterColumn="id"
      filterPlaceholder="Filter rows..."
      toolbar={toolbar}
      emptyMessage={emptyMessage}
      className="h-full"
    />
  );
}
