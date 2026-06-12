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

export const Preview: Story = {
  render: () => (
    <div className="cn-context-menu-content cn-menu-translucent w-56 rounded-md border border-border bg-popover p-1 shadow-md">
      <div className="cn-context-menu-item relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none">
        Traverse edges
      </div>
      <div className="cn-context-menu-item relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none">
        View action log
      </div>
      <div className="cn-context-menu-separator -mx-1 my-1 h-px bg-border" />
      <div className="cn-context-menu-item relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none">
        Submit for approval
      </div>
    </div>
  ),
};

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
