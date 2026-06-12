import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

const nodeTypes = ["HomepageProject", "DesignBrief", "PageSection"];

type ComboboxStoryArgs = {
  placeholder: string;
  emptyMessage: string;
};

const meta = {
  title: "Components/Combobox",
  tags: ["autodocs"],
  argTypes: {
    placeholder: { control: "text" },
    emptyMessage: { control: "text" },
  },
} satisfies Meta<ComboboxStoryArgs>;

export default meta;
type Story = StoryObj<ComboboxStoryArgs>;

export const Default: Story = {
  args: {
    placeholder: "Select node type...",
    emptyMessage: "No node types found.",
  },
  render: function ComboboxDemo(args) {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Combobox value={value} onValueChange={setValue} items={nodeTypes}>
        <ComboboxInput
          placeholder={args.placeholder}
          className="w-[260px]"
          showClear
        />
        <ComboboxContent>
          <ComboboxEmpty>{args.emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {nodeTypes.map((type) => (
              <ComboboxItem key={type} value={type}>
                {type}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
  },
};
