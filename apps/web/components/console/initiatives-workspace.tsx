"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { PagePatternList } from "@ssota/ui/components/page-patterns";
import type { GraphListRow } from "./graph-list-page";

const columns: ColumnDef<GraphListRow>[] = [
  { accessorKey: "title", header: "Initiative" },
  {
    accessorKey: "status",
    header: "Release",
    cell: ({ row }) => row.original.status ?? "—",
  },
];

type InitiativesWorkspaceProps = {
  rows: GraphListRow[];
  initiativeBasePath: string;
  createInitiative: (input: {
    title: string;
    releaseVersion: string;
  }) => Promise<void>;
};

export function InitiativesWorkspace({
  rows,
  initiativeBasePath,
  createInitiative,
}: InitiativesWorkspaceProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("0.1.0");
  const [pending, startTransition] = useTransition();

  const handleCreate = () => {
    startTransition(async () => {
      await createInitiative({ title: title || "New initiative", releaseVersion: version });
      setOpen(false);
      setTitle("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-0">
      {open ? (
        <div className="flex flex-wrap items-end gap-2 border-b px-6 py-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="initiative-title">
              Title
            </label>
            <Input
              id="initiative-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Initiative title"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="release-version">
              Release
            </label>
            <Input
              id="release-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="0.1.0"
            />
          </div>
          <Button type="button" size="sm" onClick={handleCreate} disabled={pending}>
            Create
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      ) : null}
      <PagePatternList
        columns={columns}
        data={rows}
        filterColumn="title"
        onNew={open || pending ? undefined : () => setOpen(true)}
        newLabel="New initiative"
        emptyTitle="No initiatives yet"
        emptyDescription="Create an initiative to start initiative planning."
        onRowClick={(row) => router.push(`${initiativeBasePath}/${row.id}`)}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
