"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@loopos/ui/components/ui/badge";
import { DataTable } from "@loopos/ui/components/ui/data-table";
import { DataTableColumnHeader } from "@loopos/ui/components/ui/data-table-column-header";

export type NodeCatalogRow = {
  slug: string;
  label: string;
  family: string;
  archetypeId: string;
  propertyCount: number;
  actionCount: number;
  lifecycle: string;
  href: string;
};

const columns: ColumnDef<NodeCatalogRow>[] = [
  {
    accessorKey: "label",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <Link href={row.original.href} className="font-medium hover:underline">
        {row.original.label}
      </Link>
    ),
  },
  {
    accessorKey: "family",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Family" />,
  },
  {
    accessorKey: "archetypeId",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Archetype" />,
  },
  {
    accessorKey: "propertyCount",
    header: "Properties",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.propertyCount}</Badge>
    ),
  },
  {
    accessorKey: "actionCount",
    header: "Actions",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.original.actionCount || "all"}
      </Badge>
    ),
  },
  {
    accessorKey: "lifecycle",
    header: "Lifecycle",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.lifecycle}</span>
    ),
  },
];

export function NodeCatalogDataTable({
  data,
  toolbar,
}: {
  data: NodeCatalogRow[];
  toolbar?: React.ReactNode;
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      filterColumn="label"
      filterPlaceholder="Filter node tables..."
      toolbar={toolbar}
      className="h-full"
    />
  );
}
