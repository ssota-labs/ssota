import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const meta = {
  title: "Components/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: () => (
    <div className="cn-dropdown-menu-content cn-menu-translucent w-56 rounded-md border border-border bg-popover p-1 shadow-md">
      <div className="cn-dropdown-menu-label px-2 py-1.5 text-sm font-medium">
        homepage-agent
      </div>
      <div className="cn-dropdown-menu-separator -mx-1 my-1 h-px bg-border" />
      <div className="cn-dropdown-menu-item relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none">
        Catalog
      </div>
      <div className="cn-dropdown-menu-item relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none">
        Action log
      </div>
      <div className="cn-dropdown-menu-item relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none">
        Leave project
      </div>
    </div>
  ),
};

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Project menu
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>homepage-agent</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Catalog</DropdownMenuItem>
        <DropdownMenuItem>Action log</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Leave project</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
