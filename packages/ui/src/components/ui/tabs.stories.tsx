import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Console: Story = {
  render: () => (
    <Tabs defaultValue="nodes" className="w-full max-w-md">
      <TabsList>
        <TabsTrigger value="nodes">Nodes</TabsTrigger>
        <TabsTrigger value="edges">Edges</TabsTrigger>
        <TabsTrigger value="actions">Actions</TabsTrigger>
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
