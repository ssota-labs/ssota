import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const meta = {
  title: "Components/Resizable",
  component: ResizablePanelGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-[200px] max-w-2xl rounded-lg border"
    >
      <ResizablePanel defaultSize={35} minSize={20}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
          Catalog
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={65} minSize={30}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
          Graph canvas
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};
