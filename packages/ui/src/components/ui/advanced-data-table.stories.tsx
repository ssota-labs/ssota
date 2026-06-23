import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  AdvancedDataTable,
  type FacetedFilterDef,
} from "@/components/ui/advanced-data-table";

type Row = {
  id: string;
  sku: string;
  item: string;
  type: string;
  price: number;
  inStock: boolean;
};

const columns: ColumnDef<Row, unknown>[] = [
  { id: "sku", accessorKey: "sku", meta: { label: "SKU" }, size: 120 },
  { id: "item", accessorKey: "item", meta: { label: "Item" }, size: 220 },
  {
    id: "type",
    accessorKey: "type",
    meta: { label: "Type" },
    filterFn: (row, id, value: string[]) =>
      !value?.length || value.includes(String(row.getValue(id))),
    cell: ({ row }) => <Badge variant="outline">{row.getValue("type")}</Badge>,
  },
  {
    id: "price",
    accessorKey: "price",
    meta: { label: "Price", align: "right" },
    size: 110,
    cell: ({ row }) => `$${(row.getValue("price") as number).toFixed(2)}`,
  },
  {
    id: "inStock",
    accessorKey: "inStock",
    meta: { label: "In Stock" },
    size: 100,
    cell: ({ row }) => (row.getValue("inStock") ? "Yes" : "No"),
  },
];

const data: Row[] = [
  { id: "1", sku: "TC-001", item: "Tablet Case", type: "Electronics", price: 83.24, inStock: true },
  { id: "2", sku: "SW-002", item: "Smart Watch", type: "Electronics", price: 246.27, inStock: true },
  { id: "3", sku: "WS-003", item: "Wool Sweater", type: "Accessories", price: 168.27, inStock: true },
  { id: "4", sku: "RS-006", item: "Running Shoes", type: "Footwear", price: 208.26, inStock: false },
  { id: "5", sku: "WJ-007", item: "Winter Jacket", type: "Clothing", price: 148.06, inStock: true },
];

const facetedFilters: FacetedFilterDef[] = [
  {
    columnId: "type",
    title: "Type",
    options: ["Electronics", "Accessories", "Footwear", "Clothing"].map((v) => ({
      label: v,
      value: v,
    })),
  },
];

const meta = {
  title: "Components/AdvancedDataTable",
  tags: ["autodocs"],
} satisfies Meta<typeof AdvancedDataTable>;

export default meta;
type Story = StoryObj<typeof AdvancedDataTable<Row>>;

export const Default: Story = {
  render: () => (
    <AdvancedDataTable
      columns={columns}
      data={data}
      getRowId={(r) => r.id}
      facetedFilters={facetedFilters}
      searchPlaceholder="Search items…"
      pageSize={10}
    />
  ),
};
