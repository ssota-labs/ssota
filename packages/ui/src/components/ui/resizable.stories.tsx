import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type ResizableStoryArgs = ComponentProps<typeof ResizablePanelGroup> & {
  leftLabel: string;
  rightLabel: string;
  leftSize: string;
};

const meta = {
  title: "Components/Resizable",
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    leftLabel: { control: "text" },
    rightLabel: { control: "text" },
    leftSize: { control: "text" },
  },
} satisfies Meta<ResizableStoryArgs>;

export default meta;
type Story = StoryObj<ResizableStoryArgs>;

export const Default: Story = {
  args: {
    orientation: "horizontal",
    leftLabel: "Catalog",
    rightLabel: "Graph canvas",
    leftSize: "35%",
  },
  render: (args) => (
    <ResizablePanelGroup
      orientation={args.orientation}
      className="min-h-[200px] max-w-2xl rounded-lg border"
    >
      <ResizablePanel id="catalog" defaultSize={args.leftSize} minSize="20%">
        <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
          {args.leftLabel}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="canvas" defaultSize="65%" minSize="30%">
        <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
          {args.rightLabel}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};
