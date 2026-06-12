import type { Meta, StoryObj } from "@storybook/react-vite";
import { InfoIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const meta = {
  title: "Components/Alert",
  component: Alert,
  tags: ["autodocs"],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert className="max-w-md">
      <InfoIcon />
      <AlertTitle>Action committed</AlertTitle>
      <AlertDescription>
        execute_action recorded a log entry in the same transaction.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="max-w-md">
      <InfoIcon />
      <AlertTitle>Catalog mismatch</AlertTitle>
      <AlertDescription>
        Unknown node type — runtime rejected the write.
      </AlertDescription>
    </Alert>
  ),
};
