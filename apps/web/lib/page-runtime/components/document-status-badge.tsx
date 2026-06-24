import { Badge } from "@ssota/ui/components/ui/badge";
import { cn } from "@ssota/ui/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft:
    "!border-border !bg-muted/80 !text-muted-foreground",
  review:
    "!border-amber-500/50 !bg-amber-500/25 !text-amber-950 dark:!text-amber-100",
  approved:
    "!border-sky-500/50 !bg-sky-500/25 !text-sky-950 dark:!text-sky-100",
  active:
    "!border-emerald-500/50 !bg-emerald-500/25 !text-emerald-950 dark:!text-emerald-100",
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
