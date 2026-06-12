import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type CollapsibleStoryArgs = {
  title: string;
  content: string;
  defaultOpen: boolean;
};

const meta = {
  title: "Components/Collapsible",
  component: Collapsible,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    content: { control: "text" },
    defaultOpen: { control: "boolean" },
  },
} satisfies Meta<CollapsibleStoryArgs>;

export default meta;
type Story = StoryObj<CollapsibleStoryArgs>;

export const Default: Story = {
  args: {
    title: "Instruction body",
    content: "Domain recipe steps for the mounted MCP agent.",
    defaultOpen: false,
  },
  render: function CollapsibleDemo(args) {
    const [open, setOpen] = useState(args.defaultOpen);
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="w-[320px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{args.title}</span>
          <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <CaretDownIcon className={open ? "rotate-180" : ""} />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pt-2 text-sm text-muted-foreground">
          {args.content}
        </CollapsibleContent>
      </Collapsible>
    );
  },
};
