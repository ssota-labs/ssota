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
