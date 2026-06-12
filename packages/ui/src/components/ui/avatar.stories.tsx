import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

type AvatarStoryArgs = {
  imageSrc: string;
  alt: string;
  fallback: string;
};

const meta = {
  title: "Components/Avatar",
  tags: ["autodocs"],
  argTypes: {
    imageSrc: { control: "text" },
    alt: { control: "text" },
    fallback: { control: "text" },
  },
} satisfies Meta<AvatarStoryArgs>;

export default meta;
type Story = StoryObj<AvatarStoryArgs>;

export const Default: Story = {
  args: {
    imageSrc: "https://github.com/shadcn.png",
    alt: "Operator",
    fallback: "SM",
  },
  render: (args) => (
    <Avatar>
      <AvatarImage src={args.imageSrc} alt={args.alt} />
      <AvatarFallback>{args.fallback}</AvatarFallback>
    </Avatar>
  ),
};

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>AG</AvatarFallback>
    </Avatar>
  ),
};
