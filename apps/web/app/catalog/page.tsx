import { redirect } from "next/navigation";
import { getActionPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { Badge } from "@loopos/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";

export default async function CatalogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ports = getActionPorts();
  const nodeTypes = await ports.catalog.listNodeCatalogEntries();

  const actionTypes = await Promise.all(
    ["create_note", "create_document", "promote_document", "approve_gate"].map(
      (t) => ports.catalog.getActionCatalogEntry(t),
    ),
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Catalog Browser</h1>

      <section>
        <h2 className="mb-3 text-lg font-medium">Node Types</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {nodeTypes.map((entry) => (
            <Card key={entry.nodeType}>
              <CardHeader>
                <CardTitle className="text-base">{entry.nodeType}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {entry.family} · {entry.archetypeId}
                </p>
              </CardHeader>
              {entry.contentGuide && (
                <CardContent className="pt-0 text-sm">{entry.contentGuide}</CardContent>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Action Contracts</h2>
        <div className="space-y-3">
          {actionTypes
            .filter((a) => a !== null)
            .map((entry) => (
              <Card key={entry!.actionType}>
                <CardHeader>
                  <details>
                    <summary className="cursor-pointer font-medium">
                      {entry!.actionType}{" "}
                      <Badge variant="secondary" className="ml-2">
                        executor={entry!.executor}
                      </Badge>
                    </summary>
                    <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(entry, null, 2)}
                    </pre>
                  </details>
                </CardHeader>
              </Card>
            ))}
        </div>
      </section>
    </div>
  );
}
