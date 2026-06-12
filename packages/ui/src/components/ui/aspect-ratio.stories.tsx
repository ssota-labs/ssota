import type { Meta, StoryObj } from "@storybook/react-vite";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const meta = {
  title: "Components/AspectRatio",
  component: AspectRatio,
  tags: ["autodocs"],
  argTypes: {
    ratio: {
      control: { type: "number", min: 0.1, max: 4, step: 0.1 },
    },
  },
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { ratio: 16 / 9 },
  render: (args) => (
    <div className="w-[320px]">
      <AspectRatio {...args} className="overflow-hidden rounded-lg bg-muted">
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {args.ratio === 1 ? "1:1" : args.ratio === 16 / 9 ? "16:9" : `${args.ratio}`}{" "}
          preview
        </div>
      </AspectRatio>
    </div>
  ),
};
