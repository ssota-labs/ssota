import { Badge } from "@ssota/ui/components/ui/badge";
import type { ImpactQueueStatus } from "@ssota/contracts";

const statusVariant: Record<
  ImpactQueueStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  running: "outline",
  succeeded: "outline",
  failed: "secondary",
  dead: "destructive",
  skipped: "outline",
};

export function ImpactStatusBadge({ status }: { status: ImpactQueueStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}
