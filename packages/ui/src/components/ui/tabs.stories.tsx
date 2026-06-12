import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type TabsStoryArgs = ComponentProps<typeof Tabs> & {
  nodesLabel: string;
  edgesLabel: string;
  actionsLabel: string;
};

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  argTypes: {
    defaultValue: {
      control: "select",
      options: ["nodes", "edges", "actions"],
    },
    nodesLabel: { control: "text" },
    edgesLabel: { control: "text" },
    actionsLabel: { control: "text" },
  },
} satisfies Meta<TabsStoryArgs>;

export default meta;
type Story = StoryObj<TabsStoryArgs>;

export const Default: Story = {
  args: {
    defaultValue: "nodes",
    nodesLabel: "Nodes",
    edgesLabel: "Edges",
    actionsLabel: "Actions",
  },
  render: (args) => (
    <Tabs defaultValue={args.defaultValue} className="w-full max-w-md">
      <TabsList>
        <TabsTrigger value="nodes">{args.nodesLabel}</TabsTrigger>
        <TabsTrigger value="edges">{args.edgesLabel}</TabsTrigger>
        <TabsTrigger value="actions">{args.actionsLabel}</TabsTrigger>
      </TabsList>
      <TabsContent value="nodes" className="text-sm text-muted-foreground">
        Node catalog entries for this project.
      </TabsContent>
      <TabsContent value="edges" className="text-sm text-muted-foreground">
        Edge catalog entries for this project.
      </TabsContent>
      <TabsContent value="actions" className="text-sm text-muted-foreground">
        Action catalog contracts.
      </TabsContent>
    </Tabs>
  ),
};
