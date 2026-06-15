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
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getTaskPort } from "@/lib/ports";

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
  const tasks = await getTaskPort(project.id).listTasks({ limit: 200 });

  const startSteps: StartStep[] = [
    {
      title: "Connect a development agent",
      description:
        "Copy this project's MCP details only when the agent needs task or project context.",
      href: projectPath(ctx, "developer/setup"),
      cta: "Open setup",
      completed: false,
    },
    {
      title: "Create a first Task",
      description:
        "Use tasks as the shared work queue for developers and development agents.",
      href: projectPath(ctx, "tasks"),
      cta: "Open Tasks",
      completed: tasks.length > 0,
    },
    {
      title: "Tune project settings",
      description:
        "Keep the project shell focused on the development workflow runtime.",
      href: projectPath(ctx, "settings/general"),
      cta: "Open settings",
      completed: true,
    },
  ];

  const cards = [
    {
      title: "Tasks",
      description: "Shared development workflow queue",
      href: projectPath(ctx, "tasks"),
      count: tasks.length,
    },
    {
      title: "Developer",
      description: "MCP connect and project-scoped agent setup",
      href: projectPath(ctx, "developer/setup"),
      count: 0,
    },
    {
      title: "Settings",
      description: "Project shell settings",
      href: projectPath(ctx, "settings/general"),
      count: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer Start"
        description="Development workflow workspace for humans and development agents."
      />

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Run the development workflow</CardTitle>
              <CardDescription>
                Generic context graph surfaces are archived; active work now starts from tasks.
              </CardDescription>
            </div>
            <Button render={<Link href={projectPath(ctx, "tasks")} />} nativeButton={false}>
              Open Tasks
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-3">
          {startSteps.map((step, index) => (
            <Link
              key={step.title}
              href={step.href}
              className="group rounded-lg border bg-background p-3 transition-colors hover:bg-muted/40"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <Badge variant={step.completed ? "default" : "secondary"}>
                  {step.completed ? "Ready" : `Step ${index + 1}`}
                </Badge>
                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                  {step.cta}
                </span>
              </div>
              <div className="font-medium">{step.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Active surfaces</h2>
          <p className="text-sm text-muted-foreground">
            Primary areas for the development-workflow-only runtime.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
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
                    {card.count ? <Badge variant="secondary">{card.count}</Badge> : null}
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
