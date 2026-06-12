import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
} from "@phosphor-icons/react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

const meta = {
  title: "Components/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <ToggleGroup defaultValue={["left"]}>
      <ToggleGroupItem value="left" aria-label="Align left">
        <TextAlignLeftIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Align center">
        <TextAlignCenterIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Align right">
        <TextAlignRightIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};
