import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    checked: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { checked: true, disabled: false },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="audit" {...args} />
      <Label htmlFor="audit">Include action log in export</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="locked" disabled />
      <Label htmlFor="locked">Locked by gate</Label>
    </div>
  ),
};
