"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useTransition } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import { GraphListPage, type GraphListRow } from "./graph-list-page";

const columns: ColumnDef<GraphListRow>[] = [
  { accessorKey: "title", header: "Title" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => row.original.status ?? "—",
  },
];

type HypothesesWorkspaceProps = {
  rows: GraphListRow[];
  newLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  createHypothesis: () => Promise<void>;
  createInitiative: (hypothesisId: string, title: string) => Promise<void>;
};

export function HypothesesWorkspace({
  rows,
  newLabel,
  emptyTitle,
  emptyDescription,
  createHypothesis,
  createInitiative,
}: HypothesesWorkspaceProps) {
  const [pendingId, startTransition] = useTransition();

  return (
    <GraphListPage
      columns={columns}
      data={rows}
      newLabel={newLabel}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      onCreate={createHypothesis}
      rowActions={(row) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pendingId}
            onClick={(e) => {
              e.stopPropagation();
              startTransition(async () => {
                await createInitiative(row.id, row.title);
              });
            }}
          >
            Create initiative
          </Button>
        )}
    />
  );
}
