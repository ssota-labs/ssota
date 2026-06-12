import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type RadioGroupStoryArgs = ComponentProps<typeof RadioGroup> & {
  humanLabel: string;
  agentLabel: string;
};

const meta = {
  title: "Components/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  argTypes: {
    defaultValue: {
      control: "select",
      options: ["human", "agent"],
    },
    humanLabel: { control: "text" },
    agentLabel: { control: "text" },
  },
} satisfies Meta<RadioGroupStoryArgs>;

export default meta;
type Story = StoryObj<RadioGroupStoryArgs>;

export const Default: Story = {
  args: {
    defaultValue: "human",
    humanLabel: "Human executor",
    agentLabel: "Agent executor",
  },
  render: (args) => (
    <RadioGroup defaultValue={args.defaultValue} className="max-w-xs">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="human" id="human" />
        <Label htmlFor="human">{args.humanLabel}</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="agent" id="agent" />
        <Label htmlFor="agent">{args.agentLabel}</Label>
      </div>
    </RadioGroup>
  ),
};
