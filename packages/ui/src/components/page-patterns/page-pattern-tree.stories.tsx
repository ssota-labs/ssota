import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { PagePatternTree } from "./page-pattern-tree";

const tree = [
  {
    id: "root",
    label: "Home",
    children: [
      {
        id: "pricing",
        label: "/pricing",
        children: [{ id: "pricing-compare", label: "/pricing/compare" }],
      },
      {
        id: "checkout",
        label: "/checkout",
        children: [
          { id: "checkout-shipping", label: "/checkout/shipping" },
          { id: "checkout-payment", label: "/checkout/payment" },
        ],
      },
      { id: "account", label: "/account" },
    ],
  },
];

const meta = {
  title: "PagePatterns/Tree",
  component: PagePatternTree,
  tags: ["autodocs"],
} satisfies Meta<typeof PagePatternTree>;

export default meta;
type Story = StoryObj<typeof PagePatternTree>;

export const IaMaster: Story = {
  render: function IaMasterStory() {
    const [selectedId, setSelectedId] = useState("checkout-payment");

    return (
      <PagePatternTree
        nodes={tree}
        selectedId={selectedId}
        onSelect={setSelectedId}
        newLabel="+ Page"
        onNew={() => undefined}
        detail={
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">/checkout/payment</h2>
            <p className="text-sm text-muted-foreground">
              Payment step in checkout flow. Master IA page definition.
            </p>
          </div>
        }
      />
    );
  },
};

export const Empty: Story = {
  render: () => (
    <PagePatternTree
      nodes={[]}
      emptyState={
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No pages in the information architecture yet
        </div>
      }
    />
  ),
};
