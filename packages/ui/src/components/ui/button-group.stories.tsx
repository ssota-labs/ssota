import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

type ButtonGroupStoryArgs = ComponentProps<typeof ButtonGroup> & {
  firstLabel: string;
  secondLabel: string;
  thirdLabel: string;
};

const meta = {
  title: "Components/ButtonGroup",
  component: ButtonGroup,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    firstLabel: { control: "text" },
    secondLabel: { control: "text" },
    thirdLabel: { control: "text" },
  },
} satisfies Meta<ButtonGroupStoryArgs>;

export default meta;
type Story = StoryObj<ButtonGroupStoryArgs>;

export const Default: Story = {
  args: {
    orientation: "horizontal",
    firstLabel: "List",
    secondLabel: "Graph",
    thirdLabel: "Log",
  },
  render: (args) => (
    <ButtonGroup orientation={args.orientation}>
      <Button variant="outline">{args.firstLabel}</Button>
      <Button variant="outline">{args.secondLabel}</Button>
      <Button variant="outline">{args.thirdLabel}</Button>
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
