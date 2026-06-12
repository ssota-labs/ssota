import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";

type MenubarStoryArgs = {
  fileLabel: string;
  viewLabel: string;
  exportLabel: string;
  graphLabel: string;
};

const meta = {
  title: "Components/Menubar",
  tags: ["autodocs"],
  argTypes: {
    fileLabel: { control: "text" },
    viewLabel: { control: "text" },
    exportLabel: { control: "text" },
    graphLabel: { control: "text" },
  },
} satisfies Meta<MenubarStoryArgs>;

export default meta;
type Story = StoryObj<MenubarStoryArgs>;

export const Preview: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <div className="cn-menubar flex h-9 items-center rounded-md border border-border bg-background p-1 shadow-sm">
        <span className="cn-menubar-trigger rounded-sm px-2 py-1 text-sm">File</span>
        <span className="cn-menubar-trigger rounded-sm px-2 py-1 text-sm">View</span>
      </div>
      <div className="cn-menubar-content cn-menu-translucent w-48 rounded-md border border-border bg-popover p-1 shadow-md">
        <div className="cn-menubar-item rounded-sm px-2 py-1.5 text-sm">Export catalog</div>
        <div className="cn-menubar-item rounded-sm px-2 py-1.5 text-sm">Import seed</div>
        <div className="cn-menubar-separator -mx-1 my-1 h-px bg-border" />
        <div className="cn-menubar-item rounded-sm px-2 py-1.5 text-sm text-destructive">
          Reset project
        </div>
      </div>
    </div>
  ),
};

export const Default: Story = {
  args: {
    fileLabel: "File",
    viewLabel: "View",
    exportLabel: "Export catalog",
    graphLabel: "Graph",
  },
  render: (args) => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>{args.fileLabel}</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>{args.exportLabel}</MenubarItem>
          <MenubarItem>Import seed</MenubarItem>
          <MenubarSeparator />
          <MenubarItem variant="destructive">Reset project</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>{args.viewLabel}</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>{args.graphLabel}</MenubarItem>
          <MenubarItem>Action log</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};
