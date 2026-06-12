import type { Meta, StoryObj } from "@storybook/react-vite";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const meta = {
  title: "Components/AspectRatio",
  component: AspectRatio,
  tags: ["autodocs"],
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Video: Story = {
  args: { ratio: 16 / 9 },
  render: (args) => (
    <div className="w-[320px]">
      <AspectRatio {...args} className="overflow-hidden rounded-lg bg-muted">
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          16:9 preview
        </div>
      </AspectRatio>
    </div>
  ),
};
