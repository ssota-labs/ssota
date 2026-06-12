import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type DrawerStoryArgs = {
  title: string;
  description: string;
  approveLabel: string;
  closeLabel: string;
  triggerLabel: string;
};

const meta = {
  title: "Components/Drawer",
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    approveLabel: { control: "text" },
    closeLabel: { control: "text" },
    triggerLabel: { control: "text" },
  },
} satisfies Meta<DrawerStoryArgs>;

export default meta;
type Story = StoryObj<DrawerStoryArgs>;

export const Preview: Story = {
  args: {
    title: "Gate #42",
    description: "Atypical lifecycle transition awaiting human approval.",
    approveLabel: "Approve",
    closeLabel: "Close",
    triggerLabel: "Open gate details",
  },
  render: (args) => (
    <div className="cn-drawer-content relative mx-auto mt-auto w-full max-w-md rounded-t-xl border border-border bg-card p-4 shadow-lg">
      <div className="cn-drawer-header flex flex-col gap-1.5 text-center sm:text-left">
        <h2 className="cn-drawer-title text-lg font-semibold">{args.title}</h2>
        <p className="cn-drawer-description text-sm text-muted-foreground">
          {args.description}
        </p>
      </div>
      <div className="cn-drawer-footer mt-4 flex flex-col gap-2">
        <Button>{args.approveLabel}</Button>
        <Button variant="outline">{args.closeLabel}</Button>
      </div>
    </div>
  ),
};

export const Default: Story = {
  args: {
    title: "Gate #42",
    description: "Atypical lifecycle transition awaiting human approval.",
    approveLabel: "Approve",
    closeLabel: "Close",
    triggerLabel: "Open gate details",
  },
  render: (args) => (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline" />}>
        {args.triggerLabel}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{args.title}</DrawerTitle>
          <DrawerDescription>{args.description}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>{args.approveLabel}</Button>
          <DrawerClose render={<Button variant="outline" />}>
            {args.closeLabel}
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};
