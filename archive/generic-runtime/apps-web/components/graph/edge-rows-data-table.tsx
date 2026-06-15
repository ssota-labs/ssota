"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@ssota/ui/components/ui/data-table";
import { DataTableColumnHeader } from "@ssota/ui/components/ui/data-table-column-header";
import { formatTableCell } from "@/lib/graph/format-table-cell";
import type { PropertyColumn } from "@/components/graph/node-rows-data-table";

export type EdgeRowRecord = {
  id: string;
  source: string;
  target: string;
  properties: Record<string, unknown>;
  createdAt: string;
};

export function EdgeRowsDataTable({
  rows,
  propertyColumns,
  toolbar,
  emptyMessage = "아직 생성된 edge row가 없습니다.",
}: {
  rows: EdgeRowRecord[];
  propertyColumns: PropertyColumn[];
  toolbar?: React.ReactNode;
  emptyMessage?: string;
}) {
  const columns: ColumnDef<EdgeRowRecord>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="id" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.id.slice(0, 8)}</span>
      ),
    },
    {
      accessorKey: "source",
      header: ({ column }) => <DataTableColumnHeader column={column} title="source" />,
    },
    {
      accessorKey: "target",
      header: ({ column }) => <DataTableColumnHeader column={column} title="target" />,
    },
    ...propertyColumns.map(
      (property): ColumnDef<EdgeRowRecord> => ({
        id: property.key,
        accessorFn: (row) => formatTableCell(row.properties[property.key]),
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={property.label}
            subtitle={property.valueType}
          />
        ),
        cell: ({ row }) => formatTableCell(row.original.properties[property.key]),
      }),
    ),
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="created" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.createdAt.slice(0, 10)}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      filterColumn="source"
      filterPlaceholder="Filter edges..."
      toolbar={toolbar}
      emptyMessage={emptyMessage}
      className="h-full"
    />
  );
}
