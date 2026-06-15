import type { Meta, StoryObj } from "@storybook/react-vite";

import { PagePatternHub } from "./page-pattern-hub";

const meta = {
  title: "PagePatterns/Hub",
  component: PagePatternHub,
  tags: ["autodocs"],
} satisfies Meta<typeof PagePatternHub>;

export default meta;
type Story = StoryObj<typeof PagePatternHub>;

export const Overview: Story = {
  render: () => (
    <PagePatternHub
      stats={[
        { id: "tasks", label: "Open tasks", value: 12, badge: "Active" },
        { id: "initiatives", label: "Initiatives", value: 3 },
        { id: "activity", label: "Recent updates", value: 8, description: "Last 7 days" },
        { id: "gates", label: "Pending review", value: 0 },
      ]}
      graphSlot={
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground">
          Mini workflow graph placeholder
        </div>
      }
      quickLinks={[
        { id: "tasks", label: "Tasks", description: "Team work queue" },
        { id: "workflow", label: "Workflow Map", description: "Full graph view" },
        { id: "initiatives", label: "Initiatives", description: "Product delivery" },
      ]}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <PagePatternHub
      emptyState={
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No overview data yet
        </div>
      }
    />
  ),
};
