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

const meta = {
  title: "Components/Combobox",
  component: Combobox,
  tags: ["autodocs"],
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const nodeTypes = ["HomepageProject", "DesignBrief", "PageSection"];

export const Default: Story = {
  render: function ComboboxDemo() {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Combobox value={value} onValueChange={setValue}>
        <ComboboxInput
          placeholder="Select node type..."
          className="w-[260px]"
          showClear
        />
        <ComboboxContent>
          <ComboboxEmpty>No node types found.</ComboboxEmpty>
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
