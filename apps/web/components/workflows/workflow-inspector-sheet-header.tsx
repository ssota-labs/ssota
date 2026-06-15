import { Badge } from "@ssota/ui/components/ui/badge";

export function WorkflowInspectorSheetHeader({
  title,
  kind,
  description,
}: {
  title: string;
  kind: string;
  description: string;
}) {
  return (
    <div className="border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
        <Badge variant="secondary">{kind}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
