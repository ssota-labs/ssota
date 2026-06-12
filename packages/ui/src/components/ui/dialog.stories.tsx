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

const meta = {
  title: "Components/Dialog",
  component: Dialog,
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: () => (
    <div className="cn-dialog-content relative mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
      <div className="cn-dialog-header flex flex-col gap-2">
        <h2 className="cn-dialog-title cn-font-heading text-lg font-semibold">
          게이트 승인
        </h2>
        <p className="cn-dialog-description text-sm text-muted-foreground">
          이 액션을 승인하면 Draft에서 Active로 승격됩니다.
        </p>
      </div>
      <div className="cn-dialog-footer mt-6 flex justify-end gap-2">
        <Button variant="outline">취소</Button>
        <Button>승인</Button>
      </div>
    </div>
  ),
};

export const GateApproval: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Approve Gate</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>게이트 승인</DialogTitle>
          <DialogDescription>
            이 액션을 승인하면 Draft에서 Active로 승격됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">취소</Button>
          <Button>승인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
