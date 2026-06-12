import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const meta = {
  title: "Components/Accordion",
  component: Accordion,
  tags: ["autodocs"],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Accordion className="w-full max-w-md">
      <AccordionItem value="catalog">
        <AccordionTrigger>Node Catalog</AccordionTrigger>
        <AccordionContent>
          Registered node types for this project.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="gates">
        <AccordionTrigger>Pending Gates</AccordionTrigger>
        <AccordionContent>
          Human approval queue for atypical values.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
