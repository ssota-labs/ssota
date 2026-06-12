import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DialogStoryArgs = {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  triggerLabel: string;
};

const meta = {
  title: "Components/Dialog",
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    cancelLabel: { control: "text" },
    confirmLabel: { control: "text" },
    triggerLabel: { control: "text" },
  },
} satisfies Meta<DialogStoryArgs>;

export default meta;
type Story = StoryObj<DialogStoryArgs>;

export const Preview: Story = {
  args: {
    title: "게이트 승인",
    description: "이 액션을 승인하면 Draft에서 Active로 승격됩니다.",
    cancelLabel: "취소",
    confirmLabel: "승인",
    triggerLabel: "Approve Gate",
  },
  render: (args) => (
    <div className="cn-dialog-content relative mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
      <div className="cn-dialog-header flex flex-col gap-2">
        <h2 className="cn-dialog-title cn-font-heading text-lg font-semibold">
          {args.title}
        </h2>
        <p className="cn-dialog-description text-sm text-muted-foreground">
          {args.description}
        </p>
      </div>
      <div className="cn-dialog-footer mt-6 flex justify-end gap-2">
        <Button variant="outline">{args.cancelLabel}</Button>
        <Button>{args.confirmLabel}</Button>
      </div>
    </div>
  ),
};

export const GateApproval: Story = {
  args: {
    title: "게이트 승인",
    description: "이 액션을 승인하면 Draft에서 Active로 승격됩니다.",
    cancelLabel: "취소",
    confirmLabel: "승인",
    triggerLabel: "Approve Gate",
  },
  render: (args) => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        {args.triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{args.title}</DialogTitle>
          <DialogDescription>{args.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">{args.cancelLabel}</Button>
          <Button>{args.confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
