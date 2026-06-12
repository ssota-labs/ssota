import type { Meta, StoryObj } from "@storybook/react-vite";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

const meta = {
  title: "Components/Kbd",
  component: Kbd,
  tags: ["autodocs"],
  argTypes: {
    children: { control: "text" },
  },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "⌘" },
};

export const Shortcut: Story = {
  render: () => (
    <p className="text-sm text-muted-foreground">
      Toggle sidebar{" "}
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>B</Kbd>
      </KbdGroup>
    </p>
  ),
};
