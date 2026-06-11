import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts, resolveDefaultProjectId } from "@/lib/ports";

export default async function ContextGraphPage() {
  const projectId = await resolveDefaultProjectId();
  const ports = getActionPorts(projectId);
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
      title: "Homepage Agent",
      description: "Reference B2B2C vertical catalog (subject_id tenancy)",
      href: "/context-graph/verticals/homepage-agent",
      count: nodes.filter((n) =>
        ["HomepageProject", "DesignBrief", "PageSection"].includes(n.nodeType),
      ).length,
    },
    {
      title: "Nodes",
      description: "Node tables and structured context envelopes",
      href: "/context-graph/nodes",
      count: nodes.length,
    },
    {
      title: "Edges",
      description: "Allowed relationships between node tables",
      href: "/context-graph/edges",
      count: edges.length,
    },
    {
      title: "Actions",
      description: "Typed capabilities for humans and agents",
      href: "/context-graph/actions",
      count: actions.length,
    },
    {
      title: "Instructions",
      description: "Agent workflow and automation packages",
      href: "/context-graph/instructions",
      count: instructions.length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Context Graph"
        description="Supabase-like Studio for node tables, edge tables, actions, and agent workflows."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="block transition-opacity hover:opacity-90">
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
              <p className="text-sm text-muted-foreground">승인 대기 중인 변경이 없습니다.</p>
            ) : (
              gates.slice(0, 5).map((gate) => (
                <div key={gate.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{gate.actionType}</div>
                  <div className="text-muted-foreground">{gate.reason}</div>
                </div>
              ))
            )}
            <Button render={<Link href="/gates" />} variant="outline" size="sm" nativeButton={false}>
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
                <div key={log.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{log.actionType}</div>
                    <div className="text-muted-foreground">{log.executorType}</div>
                  </div>
                  <Badge variant="outline">{log.outcome}</Badge>
                </div>
              ))
            )}
            <Button render={<Link href="/log" />} variant="outline" size="sm" nativeButton={false}>
              Open Action Log
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
