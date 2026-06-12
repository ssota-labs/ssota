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

const meta = {
  title: "Components/Popover",
  component: Popover,
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filter: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        Filter log
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>Action filter</PopoverTitle>
          <PopoverDescription>
            Narrow the audit log by action name.
          </PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-2 pt-2">
          <Label htmlFor="action-filter">Action</Label>
          <Input id="action-filter" placeholder="approve_gate" />
        </div>
      </PopoverContent>
    </Popover>
  ),
};
