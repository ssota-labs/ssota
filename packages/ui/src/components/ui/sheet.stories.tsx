import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const meta = {
  title: "Components/Sheet",
  component: Sheet,
  tags: ["autodocs"],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Right: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Open inspector
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Node inspector</SheetTitle>
          <SheetDescription>
            Read-only properties for the selected graph node.
          </SheetDescription>
        </SheetHeader>
        <p className="px-4 text-sm text-muted-foreground">subject_id: usr_acme_42</p>
      </SheetContent>
    </Sheet>
  ),
};
