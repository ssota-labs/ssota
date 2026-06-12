import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type AlertDialogStoryArgs = {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  triggerLabel: string;
};

const meta = {
  title: "Components/AlertDialog",
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    cancelLabel: { control: "text" },
    confirmLabel: { control: "text" },
    triggerLabel: { control: "text" },
  },
} satisfies Meta<AlertDialogStoryArgs>;

export default meta;
type Story = StoryObj<AlertDialogStoryArgs>;

export const Preview: Story = {
  args: {
    title: "Reject this gate?",
    description:
      "The draft will stay blocked until a new approval action is submitted.",
    cancelLabel: "Cancel",
    confirmLabel: "Reject",
    triggerLabel: "Reject gate",
  },
  render: (args) => (
    <div className="cn-alert-dialog-content relative mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h2 className="text-lg font-semibold">{args.title}</h2>
        <p className="text-sm text-muted-foreground">{args.description}</p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline">{args.cancelLabel}</Button>
        <Button variant="destructive">{args.confirmLabel}</Button>
      </div>
    </div>
  ),
};

export const Default: Story = {
  args: {
    title: "Reject this gate?",
    description:
      "The draft will stay blocked until a new approval action is submitted.",
    cancelLabel: "Cancel",
    confirmLabel: "Reject",
    triggerLabel: "Reject gate",
  },
  render: (args) => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        {args.triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{args.title}</AlertDialogTitle>
          <AlertDialogDescription>{args.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{args.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction>{args.confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
