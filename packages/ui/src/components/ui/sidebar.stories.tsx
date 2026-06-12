import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type SidebarStoryArgs = {
  groupLabel: string;
  projectName: string;
  activeItem: "nodes" | "edges" | "actions";
};

const meta = {
  title: "Components/Sidebar",
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    groupLabel: { control: "text" },
    projectName: { control: "text" },
    activeItem: {
      control: "select",
      options: ["nodes", "edges", "actions"],
    },
  },
} satisfies Meta<SidebarStoryArgs>;

export default meta;
type Story = StoryObj<SidebarStoryArgs>;

export const Default: Story = {
  args: {
    groupLabel: "Catalog",
    projectName: "homepage-agent",
    activeItem: "nodes",
  },
  render: (args) => (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{args.groupLabel}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={args.activeItem === "nodes"}>
                    Nodes
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={args.activeItem === "edges"}>
                    Edges
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={args.activeItem === "actions"}>
                    Actions
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium">{args.projectName}</span>
        </header>
        <div className="p-6 text-sm text-muted-foreground">Main content area</div>
      </SidebarInset>
    </SidebarProvider>
  ),
};
