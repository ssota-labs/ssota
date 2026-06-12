import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type ChartStoryArgs = {
  height: number;
  seriesLabel: string;
};

const data = [
  { action: "create", count: 12 },
  { action: "update", count: 8 },
  { action: "approve", count: 5 },
];

const meta = {
  title: "Components/Chart",
  tags: ["autodocs"],
  argTypes: {
    height: {
      control: { type: "number", min: 160, max: 400, step: 20 },
    },
    seriesLabel: { control: "text" },
  },
} satisfies Meta<ChartStoryArgs>;

export default meta;
type Story = StoryObj<ChartStoryArgs>;

export const Default: Story = {
  args: {
    height: 240,
    seriesLabel: "Commits",
  },
  render: (args) => (
    <ChartContainer
      config={{
        count: { label: args.seriesLabel, color: "var(--chart-1)" },
      }}
      className="w-full max-w-md"
      style={{ height: args.height }}
    >
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="action" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
};
