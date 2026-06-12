import Link from "next/link";
import { Badge } from "@ssota/ui/components/ui/badge";
import { cn } from "@ssota/ui/lib/utils";
import type { ImpactQueueStatus } from "@ssota/contracts";
import { formatCount } from "@/lib/impact/serialize";

const summaryStatuses: ImpactQueueStatus[] = [
  "pending",
  "running",
  "failed",
  "dead",
];

const statusBadgeVariant: Record<
  ImpactQueueStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  running: "outline",
  failed: "secondary",
  dead: "destructive",
  succeeded: "outline",
  skipped: "outline",
};

type ImpactSummaryChipsProps = {
  baseHref: string;
  activeStatus?: ImpactQueueStatus;
  counts: Record<ImpactQueueStatus, number>;
  labels: Record<ImpactQueueStatus, string> & { all: string };
};

export function ImpactSummaryChips({
  baseHref,
  activeStatus,
  counts,
  labels,
}: ImpactSummaryChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={baseHref}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50",
          !activeStatus && "border-primary bg-muted/50",
        )}
      >
        {labels.all}
      </Link>
      {summaryStatuses.map((status) => (
        <Link
          key={status}
          href={`${baseHref}?status=${status}`}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50",
            activeStatus === status && "border-primary bg-muted/50",
          )}
        >
          <span>{labels[status]}</span>
          <Badge variant={statusBadgeVariant[status]}>
            {formatCount(counts[status])}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
