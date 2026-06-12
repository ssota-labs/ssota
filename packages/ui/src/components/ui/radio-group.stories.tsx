import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const meta = {
  title: "Components/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Executor: Story = {
  render: () => (
    <RadioGroup defaultValue="human" className="max-w-xs">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="human" id="human" />
        <Label htmlFor="human">Human executor</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="agent" id="agent" />
        <Label htmlFor="agent">Agent executor</Label>
      </div>
    </RadioGroup>
  ),
};
