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
