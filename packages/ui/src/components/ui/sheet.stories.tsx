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

type SheetStoryArgs = {
  title: string;
  description: string;
  detail: string;
  triggerLabel: string;
};

const meta = {
  title: "Components/Sheet",
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    detail: { control: "text" },
    triggerLabel: { control: "text" },
  },
} satisfies Meta<SheetStoryArgs>;

export default meta;
type Story = StoryObj<SheetStoryArgs>;

export const Preview: Story = {
  args: {
    title: "Node inspector",
    description: "Read-only properties for the selected graph node.",
    detail: "subject_id: usr_acme_42",
    triggerLabel: "Open inspector",
  },
  render: (args) => (
    <div className="cn-sheet-content relative ml-auto flex h-full w-full max-w-sm flex-col border border-border bg-card p-6 shadow-lg">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold">{args.title}</h2>
        <p className="text-sm text-muted-foreground">{args.description}</p>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{args.detail}</p>
    </div>
  ),
};

export const Right: Story = {
  args: {
    title: "Node inspector",
    description: "Read-only properties for the selected graph node.",
    detail: "subject_id: usr_acme_42",
    triggerLabel: "Open inspector",
  },
  render: (args) => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        {args.triggerLabel}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{args.title}</SheetTitle>
          <SheetDescription>{args.description}</SheetDescription>
        </SheetHeader>
        <p className="px-4 text-sm text-muted-foreground">{args.detail}</p>
      </SheetContent>
    </Sheet>
  ),
};
