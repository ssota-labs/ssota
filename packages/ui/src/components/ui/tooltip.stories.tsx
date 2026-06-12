import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TooltipStoryArgs = {
  triggerLabel: string;
  content: string;
};

const meta = {
  title: "Components/Tooltip",
  tags: ["autodocs"],
  argTypes: {
    triggerLabel: { control: "text" },
    content: { control: "text" },
  },
} satisfies Meta<TooltipStoryArgs>;

export default meta;
type Story = StoryObj<TooltipStoryArgs>;

export const Preview: Story = {
  args: {
    triggerLabel: "execute_action",
    content: "All writes converge here",
  },
  render: (args) => (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline">{args.triggerLabel}</Button>
      <div className="cn-tooltip-content rounded-md border border-border bg-foreground px-3 py-1.5 text-xs text-background shadow-md">
        {args.content}
      </div>
    </div>
  ),
};

export const Default: Story = {
  args: {
    triggerLabel: "execute_action",
    content: "All writes converge here",
  },
  render: (args) => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>
        {args.triggerLabel}
      </TooltipTrigger>
      <TooltipContent>{args.content}</TooltipContent>
    </Tooltip>
  ),
};
