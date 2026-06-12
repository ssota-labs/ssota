import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";

type Row = {
  id: string;
  action: string;
  actor: string;
  outcome: string;
};

const columns: ColumnDef<Row>[] = [
  { accessorKey: "action", header: "Action" },
  { accessorKey: "actor", header: "Actor" },
  {
    accessorKey: "outcome",
    header: "Outcome",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("outcome")}</Badge>
    ),
  },
];

const data: Row[] = [
  { id: "1", action: "approve_gate", actor: "smoke@ssota.test", outcome: "committed" },
  { id: "2", action: "create_node", actor: "agent", outcome: "gate_pending" },
  { id: "3", action: "update_node", actor: "agent", outcome: "committed" },
];

type DataTableStoryArgs = {
  filterPlaceholder: string;
  pageSize: number;
};

const meta = {
  title: "Components/DataTable",
  tags: ["autodocs"],
  argTypes: {
    filterPlaceholder: { control: "text" },
    pageSize: {
      control: { type: "number", min: 5, max: 20, step: 5 },
    },
  },
} satisfies Meta<DataTableStoryArgs>;

export default meta;
type Story = StoryObj<DataTableStoryArgs>;

export const Default: Story = {
  args: {
    filterPlaceholder: "Filter actions...",
    pageSize: 10,
  },
  render: (args) => (
    <DataTable
      columns={columns}
      data={data}
      filterColumn="action"
      filterPlaceholder={args.filterPlaceholder}
      className="max-w-2xl"
      pageSize={args.pageSize}
    />
  ),
};

export const ActionLog: Story = {
  render: () => (
    <DataTable
      columns={columns}
      data={data}
      filterColumn="action"
      filterPlaceholder="Filter actions..."
      className="max-w-2xl"
      pageSize={10}
    />
  ),
};
