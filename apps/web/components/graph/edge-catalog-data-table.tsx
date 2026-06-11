"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@ssota/ui/components/ui/data-table";
import { DataTableColumnHeader } from "@ssota/ui/components/ui/data-table-column-header";

export type EdgeCatalogRow = {
  label: string;
  domain: string;
  range: string;
  cardinality: string;
  representation: string;
  href: string;
};

const columns: ColumnDef<EdgeCatalogRow>[] = [
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
    accessorKey: "domain",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
  },
  {
    accessorKey: "range",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Target" />,
  },
  {
    accessorKey: "cardinality",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cardinality" />
    ),
  },
  {
    accessorKey: "representation",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Representation" />
    ),
  },
];

export function EdgeCatalogDataTable({
  data,
  toolbar,
}: {
  data: EdgeCatalogRow[];
  toolbar?: React.ReactNode;
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      filterColumn="label"
      filterPlaceholder="Filter edge tables..."
      toolbar={toolbar}
      className="h-full"
    />
  );
}
