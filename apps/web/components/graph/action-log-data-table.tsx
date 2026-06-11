"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@ssota/ui/components/ui/data-table";
import { DataTableColumnHeader } from "@ssota/ui/components/ui/data-table-column-header";
import { OutcomeBadge } from "@/components/outcome-badge";

export type ActionLogRow = {
  id: string;
  createdAt: string;
  actionType: string;
  scope: string;
  instruction: string;
  outcome: string;
  executorType: string;
};

export function ActionLogDataTable({
  rows,
  toolbar,
  filterColumn = "actionType",
  emptyMessage = "아직 기록된 action run이 없습니다.",
}: {
  rows: ActionLogRow[];
  toolbar?: React.ReactNode;
  filterColumn?: string;
  emptyMessage?: string;
}) {
  const columns: ColumnDef<ActionLogRow>[] = [
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="time" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.createdAt}</span>
      ),
    },
    {
      accessorKey: "actionType",
      header: ({ column }) => <DataTableColumnHeader column={column} title="action" />,
      cell: ({ row }) => <span className="font-medium">{row.original.actionType}</span>,
    },
    {
      accessorKey: "scope",
      header: ({ column }) => <DataTableColumnHeader column={column} title="scope" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.scope}</span>
      ),
    },
    {
      accessorKey: "instruction",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="instruction" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.instruction}</span>
      ),
    },
    {
      accessorKey: "outcome",
      header: ({ column }) => <DataTableColumnHeader column={column} title="outcome" />,
      cell: ({ row }) => <OutcomeBadge outcome={row.original.outcome} />,
    },
    {
      accessorKey: "executorType",
      header: ({ column }) => <DataTableColumnHeader column={column} title="executor" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.executorType}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      filterColumn={filterColumn}
      filterPlaceholder="Filter log..."
      toolbar={toolbar}
      emptyMessage={emptyMessage}
      className="h-full"
    />
  );
}
