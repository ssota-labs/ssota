"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { PagePatternList } from "@ssota/ui/components/page-patterns";
import { Button } from "@ssota/ui/components/ui/button";
import { GraphListPage, type GraphListRow } from "./graph-list-page";

type GoalsTab = "objective" | "key_result" | "kpi";

const tabColumns: Record<GoalsTab, ColumnDef<GraphListRow>[]> = {
  objective: [
    { accessorKey: "title", header: "Objective" },
    { accessorKey: "status", header: "Period" },
  ],
  key_result: [
    { accessorKey: "title", header: "Key result" },
    { accessorKey: "status", header: "Target" },
  ],
  kpi: [
    { accessorKey: "title", header: "KPI" },
    { accessorKey: "status", header: "Target" },
  ],
};

type ExecutiveGoalsWorkspaceProps = {
  objectives: GraphListRow[];
  keyResults: GraphListRow[];
  kpis: GraphListRow[];
  newLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  onCreate: (tab: GoalsTab) => Promise<void>;
};

const tabs: { id: GoalsTab; label: string }[] = [
  { id: "objective", label: "Objectives" },
  { id: "key_result", label: "Key results" },
  { id: "kpi", label: "KPIs" },
];

export function ExecutiveGoalsWorkspace({
  objectives,
  keyResults,
  kpis,
  newLabel,
  emptyTitle,
  emptyDescription,
  onCreate,
}: ExecutiveGoalsWorkspaceProps) {
  const [tab, setTab] = useState<GoalsTab>("objective");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const dataByTab: Record<GoalsTab, GraphListRow[]> = {
    objective: objectives,
    key_result: keyResults,
    kpi: kpis,
  };

  const data = dataByTab[tab];

  return (
    <PagePatternList
      columns={tabColumns[tab]}
      data={data}
      filterColumn="title"
      filters={
        <div className="flex gap-1">
          {tabs.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={tab === item.id ? "secondary" : "ghost"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      }
      onNew={
        pending
          ? undefined
          : () => {
              startTransition(async () => {
                await onCreate(tab);
                router.refresh();
              });
            }
      }
      newLabel={newLabel}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      getRowId={(row) => row.id}
    />
  );
}
