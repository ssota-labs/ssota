import Link from "next/link";
import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";

export default async function NodeTypesPage() {
  const ports = getActionPorts();
  const entries = await ports.catalog.listNodeCatalogEntries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Node Types"
        description="런타임 노드 타입 카탈로그"
        action={{ label: "새 Node Type", href: "/studio/node-types/new" }}
      />

      {entries.length === 0 ? (
        <EmptyState message="등록된 Node Type이 없습니다." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {entries.map((entry) => (
            <Card key={entry.nodeType}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link
                    href={`/studio/node-types/${encodeURIComponent(entry.nodeType)}/edit`}
                    className="hover:underline"
                  >
                    {entry.nodeType}
                  </Link>
                  <Badge variant="secondary">{entry.family}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  archetype: {entry.archetypeId}
                </p>
              </CardHeader>
              {entry.contentGuide && (
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {entry.contentGuide}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        변경은{" "}
        <Link href="/studio/node-types/new" className="underline">
          define_node_type
        </Link>{" "}
        메타 액션으로만 가능합니다.
      </p>
    </div>
  );
}
