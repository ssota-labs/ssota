import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const meta = {
  title: "Components/Chart",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const data = [
  { action: "create", count: 12 },
  { action: "update", count: 8 },
  { action: "approve", count: 5 },
];

const config = {
  count: { label: "Commits", color: "var(--chart-1)" },
} satisfies ChartConfig;

export const ActionVolume: Story = {
  render: () => (
    <ChartContainer config={config} className="h-[240px] w-full max-w-md">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="action" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
};
