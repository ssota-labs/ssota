import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

type HoverCardStoryArgs = {
  nodeName: string;
  description: string;
};

const meta = {
  title: "Components/HoverCard",
  tags: ["autodocs"],
  argTypes: {
    nodeName: { control: "text" },
    description: { control: "text" },
  },
} satisfies Meta<HoverCardStoryArgs>;

export default meta;
type Story = StoryObj<HoverCardStoryArgs>;

export const Preview: Story = {
  args: {
    nodeName: "Initiative",
    description: "Teamspace-scoped graph node from the dev-workflow catalog.",
  },
  render: (args) => (
    <div className="flex max-w-md flex-col gap-3">
      <Button variant="link" className="h-auto w-fit p-0">
        {args.nodeName}
      </Button>
      <div className="cn-hover-card-content w-64 rounded-md border border-border bg-popover p-4 shadow-md">
        <p className="text-sm font-medium">{args.nodeName}</p>
        <p className="text-xs text-muted-foreground">{args.description}</p>
      </div>
    </div>
  ),
};

export const NodePreview: Story = {
  args: {
    nodeName: "Initiative",
    description: "Teamspace-scoped graph node from the dev-workflow catalog.",
  },
  render: (args) => (
    <HoverCard>
      <HoverCardTrigger render={<Button variant="link" />}>
        {args.nodeName}
      </HoverCardTrigger>
      <HoverCardContent className="w-64">
        <p className="text-sm font-medium">{args.nodeName}</p>
        <p className="text-xs text-muted-foreground">{args.description}</p>
      </HoverCardContent>
    </HoverCard>
  ),
};
