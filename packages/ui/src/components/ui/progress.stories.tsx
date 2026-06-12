import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";

const meta = {
  title: "Components/Progress",
  component: Progress,
  tags: ["autodocs"],
  argTypes: {
    value: { control: "number" },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 65 },
  render: (args) => (
    <Progress {...args} className="w-full max-w-sm">
      <div className="flex w-full items-center gap-2">
        <ProgressLabel>Migration</ProgressLabel>
        <ProgressValue />
      </div>
    </Progress>
  ),
};
