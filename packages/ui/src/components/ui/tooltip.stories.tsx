import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline">execute_action</Button>
      <div className="cn-tooltip-content rounded-md border border-border bg-foreground px-3 py-1.5 text-xs text-background shadow-md">
        All writes converge here
      </div>
    </div>
  ),
};

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>
        execute_action
      </TooltipTrigger>
      <TooltipContent>All writes converge here</TooltipContent>
    </Tooltip>
  ),
};
