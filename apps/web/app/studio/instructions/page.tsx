import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";
import { Badge } from "@loopos/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";

export default async function InstructionsPage() {
  const ports = getActionPorts();
  const entries = await ports.catalog.listInstructions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instructions"
        description="에이전트 지침 카탈로그"
        action={{ label: "새 Instruction", href: "/studio/instructions/new" }}
      />

      {entries.length === 0 ? (
        <EmptyState message="등록된 Instruction이 없습니다." />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {entry.title}
                  <Badge variant="secondary">{entry.lifecycle}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  triggers: {entry.triggerPatterns.join(", ")}
                </p>
              </CardHeader>
              <CardContent className="pt-0 text-sm">{entry.body}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
