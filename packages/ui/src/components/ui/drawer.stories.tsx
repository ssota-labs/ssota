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

const meta = {
  title: "Components/Drawer",
  component: Drawer,
  tags: ["autodocs"],
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: () => (
    <div className="cn-drawer-content relative mx-auto mt-auto w-full max-w-md rounded-t-xl border border-border bg-card p-4 shadow-lg">
      <div className="cn-drawer-header flex flex-col gap-1.5 text-center sm:text-left">
        <h2 className="cn-drawer-title text-lg font-semibold">Gate #42</h2>
        <p className="cn-drawer-description text-sm text-muted-foreground">
          Atypical lifecycle transition awaiting human approval.
        </p>
      </div>
      <div className="cn-drawer-footer mt-4 flex flex-col gap-2">
        <Button>Approve</Button>
        <Button variant="outline">Close</Button>
      </div>
    </div>
  ),
};

export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline" />}>
        Open gate details
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Gate #42</DrawerTitle>
          <DrawerDescription>
            Atypical lifecycle transition awaiting human approval.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Approve</Button>
          <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};
