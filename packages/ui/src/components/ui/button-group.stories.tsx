import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

const meta = {
  title: "Components/ButtonGroup",
  component: ButtonGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">List</Button>
      <Button variant="outline">Graph</Button>
      <Button variant="outline">Log</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">Nodes</Button>
      <Button variant="outline">Edges</Button>
      <Button variant="outline">Actions</Button>
    </ButtonGroup>
  ),
};
