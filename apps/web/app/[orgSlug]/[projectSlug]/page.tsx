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
import {
  getCachedActionCatalog,
  getCachedEdgeCatalog,
  getCachedNodeCatalog,
} from "@/lib/console/cached-catalog";
import { graphPath, projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
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
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);

  const [nodes, edges, actions, instructions, gates, logs] = await Promise.all([
    getCachedNodeCatalog(project.id),
    getCachedEdgeCatalog(project.id),
    getCachedActionCatalog(project.id),
    ports.catalog.listInstructions({ limit: 100 }),
    ports.gate.listPendingGates(),
    ports.commit.getActionLog({ limit: 8 }),
  ]);

  const workflowHref = projectPath(ctx, "workflow");
  const reviewsHref = `${workflowHref}?tab=reviews`;
  const runsHref = `${workflowHref}?tab=runs`;
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
        "Define structured trigger, context, steps, and output contracts for agents.",
      href: workflowHref,
      cta: "View workflows",
      completed: hasWorkflow,
    },
    {
      title: "Create a first Task",
      description:
        "Use Task rows as the shared work queue for humans and automation.",
      href: projectPath(ctx, "tasks"),
      cta: "Open Tasks",
      completed: hasGraphShape,
    },
    {
      title: "Review a Gate",
      description:
        "Approve or reject graph changes before they affect project state.",
      href: reviewsHref,
      cta: "Open reviews",
      completed: gates.length === 0 && hasRunHistory,
    },
    {
      title: "Inspect the audit trail",
      description:
        "Confirm every accepted, gated, or rejected graph action per workflow.",
      href: runsHref,
      cta: "Open runs",
      completed: hasRunHistory,
    },
  ];

  const cards = [
    {
      title: "Workflows",
      description: "Structured workflow builder and agent instruction renderer",
      href: workflowHref,
      count: instructions.length,
    },
    {
      title: "Graph",
      description: `${nodes.length} object types · ${edges.length} relations · ${actions.length} actions`,
      href: graphPath(ctx, "nodes"),
      count: nodes.length,
    },
    {
      title: "Tasks",
      description: "Shared work queue for humans and automation",
      href: projectPath(ctx, "tasks"),
      count: nodes.find((n) => n.nodeType === "Task") ? 1 : 0,
    },
    {
      title: "Developer",
      description: "MCP connect and project-scoped agent setup",
      href: projectPath(ctx, "developer/setup"),
      count: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer Start"
        description="Connect an agent, choose a workflow, create a Task, review gates, and inspect runs — all scoped to workflows."
      />

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Ship the first SSOTA-on-SSOTA loop</CardTitle>
              <CardDescription>
                Follow the same path an automated steward will use: workflow,
                Task, gate review, and audit trail.
              </CardDescription>
            </div>
            <Button render={<Link href={workflowHref} />} nativeButton={false}>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs review</CardTitle>
            <CardDescription>
              Pending human gates across workflow contracts.
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
              render={<Link href={reviewsHref} />}
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
            <CardTitle className="text-base">Recent runs</CardTitle>
            <CardDescription>
              Latest graph actions across all workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                최근 액션 로그가 없습니다.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{log.actionType}</div>
                    <div className="text-muted-foreground">
                      {log.executorType}
                    </div>
                  </div>
                  <Badge variant="outline">{log.outcome}</Badge>
                </div>
              ))
            )}
            <Button
              render={<Link href={runsHref} />}
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
          <h2 className="text-sm font-semibold">Console</h2>
          <p className="text-sm text-muted-foreground">
            Primary surfaces for workflow-first agent development.
          </p>
        </div>
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
                    {card.count > 0 ? (
                      <Badge variant="secondary">{card.count}</Badge>
                    ) : null}
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
