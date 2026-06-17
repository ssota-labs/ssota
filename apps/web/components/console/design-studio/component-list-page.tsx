"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import { DataTable } from "@ssota/ui/components/ui/data-table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ssota/ui/components/ui/empty";
import type { GraphListRow } from "@/components/console/graph-list-page";
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

  const handleCreate = () => {
    startTransition(async () => {
      await onCreate();
      router.refresh();
    });
  };

  return (
    <section
      className="rounded-lg border bg-card"
      data-testid="ui-components-list"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
        <p className="text-sm text-muted-foreground">
          Project UI components for Design Studio
        </p>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleCreate}
        >
          {pending ? "Creating…" : "New component"}
        </Button>
      </header>

      {data.length === 0 ? (
        <div className="space-y-4 p-4 md:p-6">
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No UI components yet</EmptyTitle>
                <EmptyDescription>
                  Create a component to open the Design Studio editor.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={handleCreate}
                >
                  {pending ? "Creating…" : "New component"}
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          filterColumn="title"
          filterPlaceholder="Search..."
          onRowClick={(row) => {
            router.push(`${editorBasePath}/${row.id}`);
          }}
          getRowId={(row) => row.id}
          className="border-0"
          showPagination={data.length > 50}
        />
      )}
    </section>
  );
}
