import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const meta = {
  title: "Components/Switch",
  component: Switch,
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
    defaultChecked: { control: "boolean" },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { disabled: false, defaultChecked: true },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Switch id="human-gate" {...args} />
      <Label htmlFor="human-gate">Require human gate</Label>
    </div>
  ),
};
