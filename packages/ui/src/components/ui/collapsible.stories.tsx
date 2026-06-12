import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const meta = {
  title: "Components/Collapsible",
  component: Collapsible,
  tags: ["autodocs"],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function CollapsibleDemo() {
    const [open, setOpen] = useState(false);
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="w-[320px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Instruction body</span>
          <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <CaretDownIcon className={open ? "rotate-180" : ""} />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pt-2 text-sm text-muted-foreground">
          Domain recipe steps for the mounted MCP agent.
        </CollapsibleContent>
      </Collapsible>
    );
  },
};
