import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";

export default async function PropertiesPage() {
  const ports = getActionPorts();
  const entries = await ports.catalog.listPropertyCatalogEntries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="속성 카탈로그"
        action={{ label: "새 Property", href: "/studio/properties/new" }}
      />

      {entries.length === 0 ? (
        <EmptyState message="등록된 Property가 없습니다." />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.propertyKey}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {entry.propertyKey}
                  <Badge variant="secondary">{entry.valueType}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  owning actions: {entry.owningActions.join(", ") || "—"}
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
