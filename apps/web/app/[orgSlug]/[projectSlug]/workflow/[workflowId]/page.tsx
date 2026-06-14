import Link from "next/link";
import { notFound } from "next/navigation";
import { buildWorkflowInstructionPackage } from "@ssota/core";
import { attachInstructionRunbookFormAction } from "@/app/actions";
import { ActionLogDataTable } from "@/components/graph/action-log-data-table";
import { PageHeader } from "@/components/studio/page-header";
import { WorkflowBuilderSections } from "@/components/workflows/workflow-builder-sections";
import { WorkflowFlowCanvas } from "@/components/workflows/workflow-flow-canvas";
import {
  WorkflowReviewsPanel,
  gateMatchesWorkflow,
} from "@/components/workflows/workflow-reviews-panel";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { formatActionScope } from "@/lib/graph/format-scope";
import { getActionPorts } from "@/lib/ports";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";

const tabs = ["builder", "instruction", "flow", "runs", "reviews"] as const;

export default async function WorkflowDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    orgSlug: string;
    projectSlug: string;
    workflowId: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgSlug, projectSlug, workflowId } = await params;
  const { tab } = await searchParams;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const instruction = isUuid(workflowId)
    ? ((await ports.catalog.getInstruction(workflowId)) ??
      (await ports.catalog.getInstructionBySlug(workflowId)))
    : await ports.catalog.getInstructionBySlug(workflowId);
  if (!instruction) notFound();

  const [logs, pendingGates] = await Promise.all([
    ports.commit.getActionLog({ limit: 100 }),
    ports.gate.listPendingGates(),
  ]);
  const pkg = buildWorkflowInstructionPackage(instruction);
  const runRows = logs
    .filter(
      (log) =>
        log.metadata.instructionId === instruction.id ||
        log.input.instructionId === instruction.id,
    )
    .map((log) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      actionType: log.actionType,
      scope: formatActionScope(log.metadata.scope ?? log.input.scope),
      instruction: instruction.title,
      outcome: log.outcome,
      executorType: log.executorType,
    }));
  const workflowGates = pendingGates.filter((gate) =>
    gateMatchesWorkflow(gate, instruction.id, instruction.allowedActions),
  );
  const activeTab =
    tab && tabs.includes(tab as (typeof tabs)[number])
      ? (tab as (typeof tabs)[number])
      : "builder";
  const baseHref = projectPath(ctx, "workflow", instruction.slug);
  const runbookUrl = getRunbookUrl(instruction);

  return (
    <div className="space-y-6">
      <PageHeader
        title={instruction.title}
        description="Workflow SSOT with builder sections, rendered instruction text, runs, and pending reviews."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          render={<Link href={projectPath(ctx, "workflow")} />}
          variant="outline"
          size="sm"
          nativeButton={false}
        >
          Back to workflows
        </Button>
        {runbookUrl ? (
          <Button
            render={<Link href={runbookUrl} target="_blank" />}
            size="sm"
            nativeButton={false}
          >
            Open runbook
          </Button>
        ) : null}
        {tabs.map((tabName) => (
          <Button
            key={tabName}
            render={
              <Link
                href={
                  tabName === "builder" ? baseHref : `${baseHref}?tab=${tabName}`
                }
                scroll={false}
              />
            }
            variant={activeTab === tabName ? "secondary" : "ghost"}
            size="sm"
            nativeButton={false}
            className="h-7 capitalize"
          >
            {tabName}
            {tabName === "reviews" && workflowGates.length ? (
              <Badge variant="secondary" className="ml-1">
                {workflowGates.length}
              </Badge>
            ) : null}
          </Button>
        ))}
      </div>

      {activeTab === "builder" ? (
        <div className="space-y-4">
          <WorkflowBuilderSections workflow={pkg.workflow} />
          {!runbookUrl ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attach runbook</CardTitle>
                <CardDescription>
                  Link an external runbook URL for steward editing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action={attachInstructionRunbookFormAction}
                  className="flex flex-wrap gap-2"
                >
                  <input type="hidden" name="projectId" value={project.id} />
                  <input
                    type="hidden"
                    name="instructionId"
                    value={instruction.id}
                  />
                  <Input
                    name="runbookUrl"
                    type="url"
                    placeholder="https://notion.so/…"
                    className="max-w-md"
                    required
                  />
                  <Button type="submit" size="sm">
                    Attach
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeTab === "instruction" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rendered instruction</CardTitle>
            <CardDescription>
              Generated from the structured workflow spec for MCP{" "}
              <code className="text-xs">get_instruction</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 text-sm leading-6">
              {pkg.renderedText}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "flow" ? (
        <Card>
          <CardContent className="p-4">
            <WorkflowFlowCanvas steps={instruction.workflowSteps} />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "runs" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Runs</CardTitle>
            <CardDescription>
              Action log entries tagged with this workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ActionLogDataTable
              rows={runRows}
              filterColumn="actionType"
              emptyMessage={`No runs recorded for ${instruction.title} yet.`}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "reviews" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending reviews</CardTitle>
            <CardDescription>
              Human gates for actions in this workflow contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <WorkflowReviewsPanel
              gates={workflowGates}
              projectId={project.id}
              emptyMessage={`No pending reviews for ${instruction.title}.`}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function getRunbookUrl(instruction: {
  contentUrl: string | null;
  outputContract: Record<string, unknown>;
  body: string | null;
}) {
  if (instruction.contentUrl) return instruction.contentUrl;
  const fromContract =
    stringValue(instruction.outputContract.notion_instruction_url) ||
    stringValue(instruction.outputContract.notion_url) ||
    stringValue(instruction.outputContract.canonical_url);
  if (fromContract) return fromContract;
  return instruction.body?.match(/https?:\/\/\S+/)?.[0] ?? "";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
