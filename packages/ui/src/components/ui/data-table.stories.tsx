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

const meta = {
  title: "Components/DataTable",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

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
