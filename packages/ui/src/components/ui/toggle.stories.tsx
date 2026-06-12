import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextBIcon, TextItalicIcon } from "@phosphor-icons/react";
import { Toggle } from "@/components/ui/toggle";

const meta = {
  title: "Components/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  argTypes: {
    defaultPressed: { control: "boolean" },
    variant: {
      control: "select",
      options: ["default", "outline"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg"],
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultPressed: false, variant: "default", size: "default" },
  render: (args) => (
    <Toggle aria-label="Bold" {...args}>
      <TextBIcon />
    </Toggle>
  ),
};

export const Showcase: Story = {
  render: () => (
    <div className="flex gap-2">
      <Toggle aria-label="Bold" defaultPressed>
        <TextBIcon />
      </Toggle>
      <Toggle aria-label="Italic">
        <TextItalicIcon />
      </Toggle>
    </div>
  ),
};
