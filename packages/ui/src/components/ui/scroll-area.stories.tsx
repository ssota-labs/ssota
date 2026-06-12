import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const meta = {
  title: "Components/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const actions = Array.from({ length: 12 }, (_, i) => `action_${i + 1}`);

export const ActionList: Story = {
  render: () => (
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
  ),
};
