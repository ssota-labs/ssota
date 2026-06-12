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

type DropdownMenuStoryArgs = {
  projectName: string;
  catalogLabel: string;
  logLabel: string;
  destructiveLabel: string;
  triggerLabel: string;
};

const meta = {
  title: "Components/DropdownMenu",
  tags: ["autodocs"],
  argTypes: {
    projectName: { control: "text" },
    catalogLabel: { control: "text" },
    logLabel: { control: "text" },
    destructiveLabel: { control: "text" },
    triggerLabel: { control: "text" },
  },
} satisfies Meta<DropdownMenuStoryArgs>;

export default meta;
type Story = StoryObj<DropdownMenuStoryArgs>;

export const Preview: Story = {
  args: {
    projectName: "homepage-agent",
    catalogLabel: "Catalog",
    logLabel: "Action log",
    destructiveLabel: "Leave project",
    triggerLabel: "Project menu",
  },
  render: (args) => (
    <div className="cn-dropdown-menu-content cn-menu-translucent w-56 rounded-md border border-border bg-popover p-1 shadow-md">
      <div className="cn-dropdown-menu-label px-2 py-1.5 text-sm font-medium">
        {args.projectName}
      </div>
      <div className="cn-dropdown-menu-separator -mx-1 my-1 h-px bg-border" />
      <div className="cn-dropdown-menu-item relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none">
        {args.catalogLabel}
      </div>
      <div className="cn-dropdown-menu-item relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none">
        {args.logLabel}
      </div>
      <div className="cn-dropdown-menu-item relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none">
        {args.destructiveLabel}
      </div>
    </div>
  ),
};

export const Default: Story = {
  args: {
    projectName: "homepage-agent",
    catalogLabel: "Catalog",
    logLabel: "Action log",
    destructiveLabel: "Leave project",
    triggerLabel: "Project menu",
  },
  render: (args) => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {args.triggerLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{args.projectName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>{args.catalogLabel}</DropdownMenuItem>
        <DropdownMenuItem>{args.logLabel}</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">
          {args.destructiveLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
