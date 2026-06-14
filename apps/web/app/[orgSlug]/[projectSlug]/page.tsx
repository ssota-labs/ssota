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
import { ImpactStatusBadge } from "@/components/impact/impact-status-badge";
import { PageHeader } from "@/components/studio/page-header";
import {
  getCachedActionCatalog,
  getCachedEdgeCatalog,
  getCachedNodeCatalog,
} from "@/lib/console/cached-catalog";
import { graphPath, projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getTranslations } from "@/lib/i18n/server";
import { getActionPorts } from "@/lib/ports";

type StartStep = {
  title: string;
  description: string;
  href: string;
  cta: string;
  completed: boolean;
};

export default async function ProjectHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { t } = await getTranslations();
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);

  const [nodes, edges, actions, instructions, gates, logs, pendingImpacts] =
    await Promise.all([
      getCachedNodeCatalog(project.id),
      getCachedEdgeCatalog(project.id),
      getCachedActionCatalog(project.id),
      ports.catalog.listInstructions({ limit: 100 }),
      ports.gate.listPendingGates(),
      ports.commit.getActionLog({ limit: 8 }),
      ports.impactQueue.queryImpactQueue({ status: "pending", limit: 5 }),
    ]);

  const taskTableHref = projectPath(ctx, "tasks");
  const hasWorkflow = instructions.length > 0;
  const hasGraphShape = nodes.length > 0 && actions.length > 0;
  const hasRunHistory = logs.length > 0;
  const startSteps: StartStep[] = [
    {
      title: "Connect an agent",
      description:
        "Copy this project's MCP details and mount SSOTA where your agent works.",
      href: projectPath(ctx, "developer/setup"),
      cta: "Open setup",
      completed: false,
    },
    {
      title: "Pick a workflow",
      description:
        "Review the steward instructions that decide which actions an agent may run.",
      href: projectPath(ctx, "workflows"),
      cta: "View workflows",
      completed: hasWorkflow,
    },
    {
      title: "Create a first Task",
      description:
        "Use Task rows as the shared work queue for humans and automation.",
      href: taskTableHref,
      cta: "Open Tasks",
      completed: hasGraphShape,
    },
    {
      title: "Review a Gate",
      description:
        "Approve or reject graph changes before they affect the project state.",
      href: projectPath(ctx, "gates"),
      cta: "Open reviews",
      completed: gates.length === 0 && hasRunHistory,
    },
    {
      title: "Inspect the audit trail",
      description:
        "Confirm every accepted, gated, or rejected graph action in Runs.",
      href: projectPath(ctx, "log"),
      cta: "Open runs",
      completed: hasRunHistory,
    },
  ];

  const cards = [
    {
      title: "Workflow Lens",
      description: "Product development phases over the same graph",
      href: projectPath(ctx, "workflow"),
      count: nodes.length,
    },
    {
      title: "Graph",
      description: `${nodes.length} object types · ${edges.length} relations · ${actions.length} actions`,
      href: graphPath(ctx, "nodes"),
      count: nodes.length,
    },
    {
      title: "Workflows",
      description: "Agent instructions with flow canvas and run history",
      href: projectPath(ctx, "workflows"),
      count: instructions.length,
    },
    {
      title: "Reviews",
      description: "Human decisions requested by agentic runs",
      href: projectPath(ctx, "gates"),
      count: gates.length,
    },
    {
      title: "Runs",
      description: "Execution timeline for graph actions",
      href: projectPath(ctx, "log"),
      count: logs.length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer Start"
        description="Connect an agent, choose a workflow, create a Task, review the Gate, and inspect the audit trail."
      />

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Ship the first SSOTA-on-SSOTA loop</CardTitle>
              <CardDescription>
                Follow the same path an automated steward will use: workflow,
                Task, Gate, audit, and Notion output.
              </CardDescription>
            </div>
            <Button
              render={<Link href={projectPath(ctx, "workflows")} />}
              nativeButton={false}
            >
              Choose workflow
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-5">
          {startSteps.map((step, index) => (
            <Link
              key={step.title}
              href={step.href}
              className="group rounded-lg border bg-background p-3 transition-colors hover:bg-muted/40"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <Badge variant={step.completed ? "default" : "secondary"}>
                  {step.completed ? "Done" : `Step ${index + 1}`}
                </Badge>
                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                  {step.cta}
                </span>
              </div>
              <div className="font-medium">{step.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs review</CardTitle>
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
              Open reviews
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("home.pendingImpacts")}</CardTitle>
            <CardDescription>{t("home.pendingImpactsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingImpacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("home.pendingImpactsEmpty")}
              </p>
            ) : (
              pendingImpacts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.workflowKey}</div>
                    <div className="truncate text-muted-foreground">
                      {item.sourceNodeId?.slice(0, 8) ?? "-"} →{" "}
                      {item.targetNodeId?.slice(0, 8) ?? "-"}
                    </div>
                  </div>
                  <ImpactStatusBadge status={item.status} />
                </div>
              ))
            )}
            <Button
              render={<Link href={projectPath(ctx, "impact")} />}
              variant="outline"
              size="sm"
              nativeButton={false}
            >
              {t("home.viewImpactQueue")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent runs</CardTitle>
            <CardDescription>Run projection for graph activity.</CardDescription>
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
              Open runs
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Advanced Graph Admin</h2>
          <p className="text-sm text-muted-foreground">
            Inspect catalog tables and low-level runtime projections after the
            first loop is working.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
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
      </section>
    </div>
  );
}
