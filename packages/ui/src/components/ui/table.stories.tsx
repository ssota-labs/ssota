import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type TableStoryArgs = {
  rowCount: number;
};

const outcomes = ["committed", "gate_pending", "rejected"] as const;
const actions = ["approve_gate", "create_node", "update_node", "execute_action"];

const meta = {
  title: "Components/Table",
  tags: ["autodocs"],
  argTypes: {
    rowCount: {
      control: { type: "number", min: 1, max: 6, step: 1 },
    },
  },
} satisfies Meta<TableStoryArgs>;

export default meta;
type Story = StoryObj<TableStoryArgs>;

export const Default: Story = {
  args: {
    rowCount: 2,
  },
  render: (args) => {
    const rows = Array.from({ length: args.rowCount }, (_, index) => ({
      action: actions[index % actions.length],
      actor: index % 2 === 0 ? "smoke@ssota.test" : "agent",
      outcome: outcomes[index % outcomes.length],
    }));

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Outcome</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.action}-${row.actor}`}>
              <TableCell>{row.action}</TableCell>
              <TableCell>{row.actor}</TableCell>
              <TableCell>
                <Badge
                  variant={row.outcome === "committed" ? "outline" : "secondary"}
                >
                  {row.outcome}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },
};

export const ActionLog: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Outcome</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>approve_gate</TableCell>
          <TableCell>smoke@ssota.test</TableCell>
          <TableCell>
            <Badge variant="outline">committed</Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>create_node</TableCell>
          <TableCell>agent</TableCell>
          <TableCell>
            <Badge variant="secondary">gate_pending</Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
