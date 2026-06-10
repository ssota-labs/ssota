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

export default async function EdgeTypesPage() {
  const ports = getActionPorts();
  const entries = await ports.catalog.listEdgeCatalogEntries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edge Types"
        description="그래프 엣지 타입 카탈로그"
        action={{ label: "새 Edge Type", href: "/studio/edge-types/new" }}
      />

      {entries.length === 0 ? (
        <EmptyState message="등록된 Edge Type이 없습니다." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {entries.map((entry) => (
            <Card key={entry.edgeType}>
              <CardHeader>
                <CardTitle className="text-base">{entry.edgeType}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {entry.cardinality} · {entry.representation}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-sm">
                <div>
                  <span className="font-medium">domain: </span>
                  {entry.domain.map((d) => (
                    <Badge key={d} variant="outline" className="mr-1">
                      {d}
                    </Badge>
                  ))}
                </div>
                <div>
                  <span className="font-medium">range: </span>
                  {entry.range.map((r) => (
                    <Badge key={r} variant="outline" className="mr-1">
                      {r}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
