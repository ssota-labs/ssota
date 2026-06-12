import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "@/components/ui/separator";

const meta = {
  title: "Components/Separator",
  component: Separator,
  tags: ["autodocs"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64 space-y-2 text-sm">
      <p>Node catalog</p>
      <Separator />
      <p>Edge catalog</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-2 text-sm">
      <span>Gates</span>
      <Separator orientation="vertical" />
      <span>Log</span>
    </div>
  ),
};
