"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PagePatternList } from "@ssota/ui/components/page-patterns";

export type GraphListRow = {
  id: string;
  title: string;
  status?: string;
  updatedAt?: string;
};

type GraphListPageProps = {
  columns: ColumnDef<GraphListRow>[];
  data: GraphListRow[];
  filterColumn?: string;
  newLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  onCreate: () => Promise<void>;
  onRowClick?: (row: GraphListRow) => void;
  rowActions?: (row: GraphListRow) => React.ReactNode;
};

export function GraphListPage({
  columns,
  data,
  filterColumn = "title",
  newLabel,
  emptyTitle,
  emptyDescription,
  onCreate,
  onRowClick,
  rowActions,
}: GraphListPageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleNew = () => {
    startTransition(async () => {
      await onCreate();
      router.refresh();
    });
  };

  const cols =
    rowActions != null
      ? [
          ...columns,
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: GraphListRow } }) =>
              rowActions(row.original),
          } as ColumnDef<GraphListRow>,
        ]
      : columns;

  return (
    <PagePatternList
      columns={cols}
      data={data}
      filterColumn={filterColumn}
      onNew={pending ? undefined : handleNew}
      newLabel={newLabel}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      onRowClick={onRowClick}
      getRowId={(row) => row.id}
    />
  );
}
