import { redirect } from "next/navigation";
import { getActionPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

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
            <div key={entry.nodeType} className="rounded-lg border bg-white p-4">
              <p className="font-medium">{entry.nodeType}</p>
              <p className="text-sm text-neutral-600">
                {entry.family} · {entry.archetypeId}
              </p>
              {entry.contentGuide && (
                <p className="mt-2 text-sm">{entry.contentGuide}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Action Contracts</h2>
        <div className="space-y-3">
          {actionTypes
            .filter((a) => a !== null)
            .map((entry) => (
              <details key={entry!.actionType} className="rounded-lg border bg-white p-4">
                <summary className="cursor-pointer font-medium">
                  {entry!.actionType}{" "}
                  <span className="text-sm font-normal text-neutral-600">
                    executor={entry!.executor}
                  </span>
                </summary>
                <pre className="mt-3 overflow-auto rounded bg-neutral-50 p-3 text-xs">
                  {JSON.stringify(entry, null, 2)}
                </pre>
              </details>
            ))}
        </div>
      </section>
    </div>
  );
}
