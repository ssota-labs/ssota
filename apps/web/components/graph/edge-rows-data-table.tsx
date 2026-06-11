"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@ssota/ui/components/ui/data-table";
import { DataTableColumnHeader } from "@ssota/ui/components/ui/data-table-column-header";

export type EdgeRowRecord = {
  id: string;
  source: string;
  target: string;
  properties: string;
  createdAt: string;
};

const columns: ColumnDef<EdgeRowRecord>[] = [
  {
    accessorKey: "source",
    header: ({ column }) => <DataTableColumnHeader column={column} title="source" />,
  },
  {
    accessorKey: "target",
    header: ({ column }) => <DataTableColumnHeader column={column} title="target" />,
  },
  {
    accessorKey: "properties",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="properties" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.properties}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="created" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.createdAt.slice(0, 10)}</span>
    ),
  },
];

export function EdgeRowsDataTable({
  rows,
  toolbar,
  emptyMessage = "아직 생성된 edge row가 없습니다.",
}: {
  rows: EdgeRowRecord[];
  toolbar?: React.ReactNode;
  emptyMessage?: string;
}) {
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
