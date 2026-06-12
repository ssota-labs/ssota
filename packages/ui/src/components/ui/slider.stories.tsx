import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const meta = {
  title: "Components/Slider",
  component: Slider,
  tags: ["autodocs"],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-3">
      <Label>Gate confidence threshold</Label>
      <Slider defaultValue={[70]} max={100} step={1} />
    </div>
  ),
};
