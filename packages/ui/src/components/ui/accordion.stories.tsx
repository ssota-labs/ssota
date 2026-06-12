import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type AccordionStoryArgs = ComponentProps<typeof Accordion> & {
  firstTitle: string;
  firstContent: string;
  secondTitle: string;
  secondContent: string;
};

const meta = {
  title: "Components/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  argTypes: {
    firstTitle: { control: "text" },
    firstContent: { control: "text" },
    secondTitle: { control: "text" },
    secondContent: { control: "text" },
  },
} satisfies Meta<AccordionStoryArgs>;

export default meta;
type Story = StoryObj<AccordionStoryArgs>;

export const Default: Story = {
  args: {
    firstTitle: "Node Catalog",
    firstContent: "Registered node types for this project.",
    secondTitle: "Pending Gates",
    secondContent: "Human approval queue for atypical values.",
  },
  render: (args) => (
    <Accordion className="w-full max-w-md">
      <AccordionItem value="catalog">
        <AccordionTrigger>{args.firstTitle}</AccordionTrigger>
        <AccordionContent>{args.firstContent}</AccordionContent>
      </AccordionItem>
      <AccordionItem value="gates">
        <AccordionTrigger>{args.secondTitle}</AccordionTrigger>
        <AccordionContent>{args.secondContent}</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
