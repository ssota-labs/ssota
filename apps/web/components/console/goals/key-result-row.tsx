"use client";

import Link from "next/link";
import { Progress } from "@ssota/ui/components/ui/progress";
import type { GoalKeyResultRow } from "@/lib/graph/goals/types";
import { GoalsHealthBadge } from "./goals-health-badge";

type KeyResultRowProps = {
  row: GoalKeyResultRow;
  nodesBasePath: string;
};

export function KeyResultRow({ row, nodesBasePath }: KeyResultRowProps) {
  const progressLabel =
    row.progress !== null ? `${row.progress}%` : "—";

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/20 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`${nodesBasePath}/${row.id}`}
          className="text-sm font-medium hover:underline"
        >
          {row.title}
        </Link>
        <GoalsHealthBadge status={row.status} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground tabular-nums">
        <span>
          {row.baseline ?? "—"} → {row.current ?? "—"} / {row.target ?? "—"}
          {row.unit ? ` ${row.unit}` : ""}
        </span>
        <span>{progressLabel}</span>
      </div>
      {row.progress !== null ? (
        <Progress value={row.progress} className="h-1.5" />
      ) : null}
    </div>
  );
}
