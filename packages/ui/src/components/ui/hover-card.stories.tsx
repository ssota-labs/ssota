import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const meta = {
  title: "Components/HoverCard",
  component: HoverCard,
  tags: ["autodocs"],
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NodePreview: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger render={<Button variant="link" />}>
        HomepageProject
      </HoverCardTrigger>
      <HoverCardContent className="w-64">
        <p className="text-sm font-medium">HomepageProject</p>
        <p className="text-xs text-muted-foreground">
          subject_id scoped instance node for the homepage agent catalog.
        </p>
      </HoverCardContent>
    </HoverCard>
  ),
};
