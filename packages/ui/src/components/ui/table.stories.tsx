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

const meta = {
  title: "Components/Table",
  component: Table,
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

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
