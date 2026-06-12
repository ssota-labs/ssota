import type { Meta, StoryObj } from "@storybook/react-vite";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

type InputGroupStoryArgs = {
  placeholder: string;
};

const meta = {
  title: "Components/InputGroup",
  tags: ["autodocs"],
  argTypes: {
    placeholder: { control: "text" },
  },
} satisfies Meta<InputGroupStoryArgs>;

export default meta;
type Story = StoryObj<InputGroupStoryArgs>;

export const Default: Story = {
  args: {
    placeholder: "Search action log...",
  },
  render: (args) => (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <MagnifyingGlassIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder={args.placeholder} />
    </InputGroup>
  ),
};
