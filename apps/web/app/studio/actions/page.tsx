import Link from "next/link";
import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts, resolveDefaultProjectId } from "@/lib/ports";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";

export default async function ActionsPage() {
  const projectId = await resolveDefaultProjectId();
  const ports = getActionPorts(projectId);
  const entries = await ports.catalog.listActionCatalogEntries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Action Contracts"
        description="액션 컨트랙트 카탈로그 — 모든 쓰기는 executeAction()으로 수렴"
        action={{ label: "새 Action Contract", href: "/studio/actions/new" }}
      />

      {entries.length === 0 ? (
        <EmptyState message="등록된 Action Contract가 없습니다." />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.actionType}>
              <CardHeader>
                <details>
                  <summary className="cursor-pointer font-medium">
                    {entry.actionType}{" "}
                    <Badge variant="secondary" className="ml-2">
                      executor={entry.executor}
                    </Badge>
                  </summary>
                  <p className="mt-2 text-sm">
                    <Link
                      href={`/studio/actions/${encodeURIComponent(entry.actionType)}/edit`}
                      className="underline"
                    >
                      Edit contract
                    </Link>
                  </p>
                  <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(entry, null, 2)}
                  </pre>
                </details>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
