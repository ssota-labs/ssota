import Link from "next/link";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { PageHeader } from "@/components/studio/page-header";
import { graphPath, projectPath } from "@/lib/console/paths";
import { getActionPorts } from "@/lib/ports";

export default async function ProjectHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const ports = getActionPorts();

  const [nodes, edges, actions, instructions, gates, logs] = await Promise.all([
    ports.catalog.listNodeCatalogEntries(),
    ports.catalog.listEdgeCatalogEntries(),
    ports.catalog.listActionCatalogEntries(),
    ports.catalog.listInstructions({ limit: 100 }),
    ports.gate.listPendingGates(),
    ports.commit.getActionLog({ limit: 8 }),
  ]);

  const cards = [
    {
      title: "Nodes",
      description: "Node tables and structured context envelopes",
      href: graphPath(ctx, "nodes"),
      count: nodes.length,
    },
    {
      title: "Edges",
      description: "Allowed relationships between node tables",
      href: graphPath(ctx, "edges"),
      count: edges.length,
    },
    {
      title: "Actions",
      description: "Typed capabilities for humans and agents",
      href: graphPath(ctx, "actions"),
      count: actions.length,
    },
    {
      title: "Instructions",
      description: "Agent workflow packages",
      href: projectPath(ctx, "instructions"),
      count: instructions.length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Home"
        description="Context graph overview, gates, and recent activity."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block transition-opacity hover:opacity-90"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {card.title}
                  <Badge variant="secondary">{card.count}</Badge>
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Gates</CardTitle>
            <CardDescription>
              Runtime, catalog, and workflow changes awaiting review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                승인 대기 중인 변경이 없습니다.
              </p>
            ) : (
              gates.slice(0, 5).map((gate) => (
                <div key={gate.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{gate.actionType}</div>
                  <div className="text-muted-foreground">{gate.reason}</div>
                </div>
              ))
            )}
            <Button
              render={<Link href={projectPath(ctx, "gates")} />}
              variant="outline"
              size="sm"
              nativeButton={false}
            >
              Review gates
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Graph Changes</CardTitle>
            <CardDescription>Action Log projection for graph activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">최근 액션 로그가 없습니다.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{log.actionType}</div>
                    <div className="text-muted-foreground">{log.executorType}</div>
                  </div>
                  <Badge variant="outline">{log.outcome}</Badge>
                </div>
              ))
            )}
            <Button
              render={<Link href={projectPath(ctx, "log")} />}
              variant="outline"
              size="sm"
              nativeButton={false}
            >
              Open Action Log
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
