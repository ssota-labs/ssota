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

export default async function ArchetypesPage() {
  const ports = getActionPorts();
  const entries = await ports.catalog.listArchetypes();

  return (
    <div className="space-y-6">
      <PageHeader title="Archetypes" description="노드 아키타입 카탈로그" />

      {entries.length === 0 ? (
        <EmptyState message="등록된 Archetype이 없습니다." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {entry.name}
                  <Badge variant="secondary">{entry.family}</Badge>
                </CardTitle>
                <p className="font-mono text-xs text-muted-foreground">
                  {entry.id}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">
                  {JSON.stringify(entry.typicalValues, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
