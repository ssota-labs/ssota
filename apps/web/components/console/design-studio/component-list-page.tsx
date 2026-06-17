"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { GraphListPage, type GraphListRow } from "@/components/console/graph-list-page";
import type { UiComponentListRow } from "@/lib/graph/loaders/query-ui-components";

const columns: ColumnDef<GraphListRow>[] = [
  { accessorKey: "title", header: "Name" },
  { accessorKey: "status", header: "Status" },
];

type ComponentListPageProps = {
  rows: UiComponentListRow[];
  editorBasePath: string;
  onCreate: () => Promise<void>;
};

export function ComponentListPage({
  rows,
  editorBasePath,
  onCreate,
}: ComponentListPageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const data: GraphListRow[] = rows.map((row) => ({
    id: row.id,
    title: `${row.title} (${row.slug})`,
    status: row.status,
    updatedAt: row.updatedAt,
  }));

  return (
    <GraphListPage
      columns={columns}
      data={data}
      newLabel={pending ? "Creating…" : "New component"}
      emptyTitle="No UI components yet"
      emptyDescription="Create a component to open the Design Studio editor."
      onCreate={onCreate}
      onRowClick={(row) => {
        router.push(`${editorBasePath}/${row.id}`);
      }}
    />
  );
}
