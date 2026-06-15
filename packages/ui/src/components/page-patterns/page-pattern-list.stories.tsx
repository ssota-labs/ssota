import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { PagePatternList } from "./page-pattern-list";

type HypothesisRow = {
  id: string;
  title: string;
  status: string;
  confidence: string;
};

const columns: ColumnDef<HypothesisRow>[] = [
  { accessorKey: "title", header: "Hypothesis" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("status")}</Badge>,
  },
  { accessorKey: "confidence", header: "Confidence" },
];

const data: HypothesisRow[] = [
  {
    id: "1",
    title: "Users abandon checkout when shipping is unclear",
    status: "validated",
    confidence: "high",
  },
  {
    id: "2",
    title: "Mobile users prefer one-tap payment",
    status: "testing",
    confidence: "medium",
  },
  {
    id: "3",
    title: "Discount codes increase conversion",
    status: "draft",
    confidence: "low",
  },
];

const meta = {
  title: "PagePatterns/List",
  component: PagePatternList,
  tags: ["autodocs"],
} satisfies Meta<typeof PagePatternList>;

export default meta;
type Story = StoryObj<typeof PagePatternList>;

export const Hypotheses: Story = {
  render: () => (
    <PagePatternList
      columns={columns}
      data={data}
      filterColumn="title"
      filterPlaceholder="Search hypotheses..."
      newLabel="+ Hypothesis"
      onNew={() => undefined}
      getRowId={(row) => row.id}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <PagePatternList
      columns={columns}
      data={[]}
      filterColumn="title"
      newLabel="+ New"
      onNew={() => undefined}
      emptyTitle="No market research yet"
      emptyDescription="Add the first market research document."
    />
  ),
};
