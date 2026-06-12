import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { InfoIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AlertStoryArgs = ComponentProps<typeof Alert> & {
  title: string;
  description: string;
};

const meta = {
  title: "Components/Alert",
  component: Alert,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive"],
    },
    title: { control: "text" },
    description: { control: "text" },
  },
} satisfies Meta<AlertStoryArgs>;

export default meta;
type Story = StoryObj<AlertStoryArgs>;

export const Default: Story = {
  args: {
    variant: "default",
    title: "Action committed",
    description:
      "execute_action recorded a log entry in the same transaction.",
  },
  render: (args) => (
    <Alert variant={args.variant} className="max-w-md">
      <InfoIcon />
      <AlertTitle>{args.title}</AlertTitle>
      <AlertDescription>{args.description}</AlertDescription>
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
