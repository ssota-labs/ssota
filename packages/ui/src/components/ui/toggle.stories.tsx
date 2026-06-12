import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextBIcon, TextItalicIcon } from "@phosphor-icons/react";
import { Toggle } from "@/components/ui/toggle";

const meta = {
  title: "Components/Toggle",
  component: Toggle,
  tags: ["autodocs"],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Formatting: Story = {
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
