"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { DataTable } from "@ssota/ui/components/ui/data-table";
import { DataTableColumnHeader } from "@ssota/ui/components/ui/data-table-column-header";
import { TASK_STATUS_LABELS } from "@/components/tasks/task-status";
import type { TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";

type TasksTableProps = {
  rows: TaskWorkspaceRow[];
  onOpenDetail: (row: TaskWorkspaceRow) => void;
};

export function TasksTable({ rows, onOpenDetail }: TasksTableProps) {
  const columns: ColumnDef<TaskWorkspaceRow>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Task" />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {row.original.id.slice(0, 8)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">
          {TASK_STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "assignee",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assignee" />
      ),
    },
    {
      accessorKey: "workflowKey",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Workflow" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.workflowKey}
        </span>
      ),
    },
    {
      accessorKey: "targetNodeId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Target" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.targetNodeId || "-"}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.updatedAt.slice(0, 10)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Details</span>,
      cell: ({ row }) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenDetail(row.original)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      filterColumn="title"
      filterPlaceholder="Filter tasks…"
      emptyMessage="No runtime tasks match this view yet. Spawn tasks via spawn_task from MCP."
    />
  );
}
