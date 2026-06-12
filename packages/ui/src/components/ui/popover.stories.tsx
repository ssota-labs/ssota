import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

type PopoverStoryArgs = {
  title: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  triggerLabel: string;
};

const meta = {
  title: "Components/Popover",
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    fieldLabel: { control: "text" },
    placeholder: { control: "text" },
    triggerLabel: { control: "text" },
  },
} satisfies Meta<PopoverStoryArgs>;

export default meta;
type Story = StoryObj<PopoverStoryArgs>;

export const Preview: Story = {
  args: {
    title: "Action filter",
    description: "Narrow the audit log by action name.",
    fieldLabel: "Action",
    placeholder: "approve_gate",
    triggerLabel: "Filter log",
  },
  render: (args) => (
    <div className="cn-popover-content cn-menu-translucent w-72 rounded-md border border-border bg-popover p-4 shadow-md">
      <div className="flex flex-col gap-1">
        <p className="font-medium">{args.title}</p>
        <p className="text-sm text-muted-foreground">{args.description}</p>
      </div>
      <div className="grid gap-2 pt-3">
        <Label htmlFor="action-filter-preview">{args.fieldLabel}</Label>
        <Input id="action-filter-preview" placeholder={args.placeholder} />
      </div>
    </div>
  ),
};

export const Filter: Story = {
  args: {
    title: "Action filter",
    description: "Narrow the audit log by action name.",
    fieldLabel: "Action",
    placeholder: "approve_gate",
    triggerLabel: "Filter log",
  },
  render: (args) => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        {args.triggerLabel}
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>{args.title}</PopoverTitle>
          <PopoverDescription>{args.description}</PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-2 pt-2">
          <Label htmlFor="action-filter">{args.fieldLabel}</Label>
          <Input id="action-filter" placeholder={args.placeholder} />
        </div>
      </PopoverContent>
    </Popover>
  ),
};
