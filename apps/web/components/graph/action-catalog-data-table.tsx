"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@ssota/ui/components/ui/badge";
import { DataTable } from "@ssota/ui/components/ui/data-table";
import { DataTableColumnHeader } from "@ssota/ui/components/ui/data-table-column-header";

export type ActionCatalogRow = {
  actionType: string;
  scope: string;
  executor: string;
  effectsCount: number;
  runs: number;
};

const columns: ColumnDef<ActionCatalogRow>[] = [
  {
    accessorKey: "actionType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="action_type" />
    ),
    cell: ({ row }) => <span className="font-medium">{row.original.actionType}</span>,
  },
  {
    accessorKey: "scope",
    header: ({ column }) => <DataTableColumnHeader column={column} title="scope" />,
    cell: ({ row }) => <Badge variant="secondary">{row.original.scope}</Badge>,
  },
  {
    accessorKey: "executor",
    header: ({ column }) => <DataTableColumnHeader column={column} title="executor" />,
  },
  {
    accessorKey: "effectsCount",
    header: "effects",
    cell: ({ row }) => row.original.effectsCount,
  },
  {
    accessorKey: "runs",
    header: ({ column }) => <DataTableColumnHeader column={column} title="runs" />,
  },
];

export function ActionCatalogDataTable({
  data,
  toolbar,
}: {
  data: ActionCatalogRow[];
  toolbar?: React.ReactNode;
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      filterColumn="actionType"
      filterPlaceholder="Filter actions..."
      toolbar={toolbar}
      className="h-full"
    />
  );
}
