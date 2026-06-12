import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { FolderOpenIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type EmptyStoryArgs = ComponentProps<typeof Empty> & {
  title: string;
  description: string;
};

const meta = {
  title: "Components/Empty",
  component: Empty,
  tags: ["autodocs"],
  argTypes: {
    className: { control: "text" },
    title: { control: "text" },
    description: { control: "text" },
  },
} satisfies Meta<EmptyStoryArgs>;

export default meta;
type Story = StoryObj<EmptyStoryArgs>;

export const Default: Story = {
  args: {
    className: "max-w-md border",
    title: "No pending gates",
    description: "All actions committed without human review.",
  },
  render: (args) => (
    <Empty className={args.className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpenIcon />
        </EmptyMedia>
        <EmptyTitle>{args.title}</EmptyTitle>
        <EmptyDescription>{args.description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

export const Showcase: Story = {
  render: () => (
    <Empty className="max-w-md border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpenIcon />
        </EmptyMedia>
        <EmptyTitle>No pending gates</EmptyTitle>
        <EmptyDescription>
          All actions committed without human review.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm">
          View action log
        </Button>
      </EmptyContent>
    </Empty>
  ),
};
