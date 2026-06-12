import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CardStoryArgs = ComponentProps<typeof Card> & {
  title: string;
  description: string;
  content: string;
};

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    content: { control: "text" },
    className: { control: "text" },
  },
} satisfies Meta<CardStoryArgs>;

export default meta;
type Story = StoryObj<CardStoryArgs>;

export const Default: Story = {
  args: {
    title: "Human Gate",
    description: "승인 대기 중인 액션이 3건 있습니다.",
    content: "Gate queue preview",
    className: "w-[360px]",
  },
  render: (args) => (
    <Card className={args.className}>
      <CardHeader>
        <CardTitle>{args.title}</CardTitle>
        <CardDescription>{args.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{args.content}</p>
      </CardContent>
    </Card>
  ),
};
