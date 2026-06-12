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

export const Preview: Story = {
  render: () => (
    <div className="cn-sheet-content relative ml-auto flex h-full w-full max-w-sm flex-col border border-border bg-card p-6 shadow-lg">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold">Node inspector</h2>
        <p className="text-sm text-muted-foreground">
          Read-only properties for the selected graph node.
        </p>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">subject_id: usr_acme_42</p>
    </div>
  ),
};

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
