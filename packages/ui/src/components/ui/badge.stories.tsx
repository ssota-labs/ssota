import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@/components/ui/badge";

const meta = {
  title: "Components/Badge",
  component: Badge,
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Draft", variant: "default" },
};

export const Secondary: Story = {
  args: { children: "Pending", variant: "secondary" },
};

export const Destructive: Story = {
  args: { children: "Rejected", variant: "destructive" },
};

export const Outline: Story = {
  args: { children: "Approved", variant: "outline" },
};
