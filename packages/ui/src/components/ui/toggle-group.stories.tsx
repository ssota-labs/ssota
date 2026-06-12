import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import {
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
} from "@phosphor-icons/react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

type ToggleGroupStoryArgs = ComponentProps<typeof ToggleGroup> & {
  defaultSelection: "left" | "center" | "right";
};

const meta = {
  title: "Components/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
  argTypes: {
    defaultSelection: {
      control: "select",
      options: ["left", "center", "right"],
    },
  },
} satisfies Meta<ToggleGroupStoryArgs>;

export default meta;
type Story = StoryObj<ToggleGroupStoryArgs>;

export const Default: Story = {
  args: {
    defaultSelection: "left",
  },
  render: (args) => (
    <ToggleGroup defaultValue={[args.defaultSelection]}>
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
