import Link from "next/link";
import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts, resolveDefaultProjectId } from "@/lib/ports";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";

export default async function WorkflowsPage() {
  const projectId = await resolveDefaultProjectId();
  const ports = getActionPorts(projectId);
  const entries = await ports.catalog.listWorkflows();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="에이전트 워크플로우 카탈로그"
        action={{ label: "새 Workflow", href: "/studio/workflows/new" }}
      />

      {entries.length === 0 ? (
        <EmptyState message="등록된 Workflow가 없습니다." />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link
                    href={`/studio/workflows/${entry.id}/edit`}
                    className="hover:underline"
                  >
                    {entry.spec.title}
                  </Link>
                  <Badge variant="secondary">{entry.lifecycle}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  triggers:{" "}
                  {entry.spec.trigger.events
                    .filter((event) => event.enabled)
                    .map((event) => event.kind)
                    .join(", ") || "manual"}
                </p>
              </CardHeader>
              <CardContent className="pt-0 text-sm">
                {entry.spec.agentNotes ??
                  entry.spec.references.find((ref) => ref.kind === "url")?.url ??
                  "—"}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
