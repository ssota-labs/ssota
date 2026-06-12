import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const meta = {
  title: "Components/ContextMenu",
  component: ContextMenu,
  tags: ["autodocs"],
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-[120px] w-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Right click node
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Traverse edges</ContextMenuItem>
        <ContextMenuItem>View action log</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">Submit for approval</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
