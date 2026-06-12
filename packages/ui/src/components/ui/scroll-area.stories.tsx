import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ScrollAreaStoryArgs = {
  itemCount: number;
};

const meta = {
  title: "Components/ScrollArea",
  tags: ["autodocs"],
  argTypes: {
    itemCount: {
      control: { type: "number", min: 3, max: 20, step: 1 },
    },
  },
} satisfies Meta<ScrollAreaStoryArgs>;

export default meta;
type Story = StoryObj<ScrollAreaStoryArgs>;

export const Default: Story = {
  args: {
    itemCount: 12,
  },
  render: (args) => {
    const actions = Array.from(
      { length: args.itemCount },
      (_, index) => `action_${index + 1}`,
    );

    return (
      <ScrollArea className="h-48 w-64 rounded-lg border">
        <div className="p-3">
          {actions.map((action, index) => (
            <div key={action}>
              <p className="py-2 text-sm">{action}</p>
              {index < actions.length - 1 ? <Separator /> : null}
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  },
};
