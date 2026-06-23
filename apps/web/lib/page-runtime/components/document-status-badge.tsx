import { Badge } from "@ssota/ui/components/ui/badge";
import { cn } from "@ssota/ui/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-border bg-muted/60 text-muted-foreground",
  review: "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-100",
  approved: "border-sky-500/40 bg-sky-500/15 text-sky-900 dark:text-sky-100",
  active: "border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
};

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveStatusBadgeClass(status: string): string {
  return STATUS_STYLES[normalizeStatus(status)] ?? STATUS_STYLES.draft!;
}

export function DocumentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  if (!status) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium capitalize",
        resolveStatusBadgeClass(status),
        className,
      )}
    >
      {status}
    </Badge>
  );
}
