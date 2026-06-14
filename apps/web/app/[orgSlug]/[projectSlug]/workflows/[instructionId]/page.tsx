import Link from "next/link";
import { notFound } from "next/navigation";
import { attachInstructionRunbookFormAction } from "@/app/actions";
import { ActionLogDataTable } from "@/components/graph/action-log-data-table";
import { PageHeader } from "@/components/studio/page-header";
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

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{
    orgSlug: string;
    projectSlug: string;
    instructionId: string;
  }>;
}) {
  const { orgSlug, projectSlug, instructionId } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const instruction =
    (await ports.catalog.getInstruction(instructionId)) ??
    (await ports.catalog.getInstructionBySlug(instructionId));
  if (!instruction) notFound();

  const logs = await ports.commit.getActionLog({ limit: 100 });
  const selectedRuns = logs.filter(
    (log) =>
      log.metadata.instructionId === instruction.id ||
      log.input.instructionId === instruction.id,
  );
  const runRows = selectedRuns.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    actionType: log.actionType,
    scope: formatActionScope(log.metadata.scope ?? log.input.scope),
    instruction: instruction.title,
    outcome: log.outcome,
    executorType: log.executorType,
  }));
  const runbookUrl = getRunbookUrl(instruction.outputContract, instruction.body);

  return (
    <div className="space-y-6">
      <PageHeader
        title={instruction.title}
        description="Workflow instruction detail, runbook links, execution contract, and run history."
      />

      <div className="flex flex-wrap gap-2">
        <Button
          render={<Link href={projectPath(ctx, "workflows")} />}
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
            Open Notion runbook
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Runbook</CardTitle>
              <CardDescription>
                The graph instruction stays thin; the Notion page carries the
                editable steward runbook and templates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {runbookUrl ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-sm font-medium">Notion runbook URL</div>
                  <Link
                    href={runbookUrl}
                    target="_blank"
                    className="mt-1 block break-all text-sm text-primary hover:underline"
                  >
                    {runbookUrl}
                  </Link>
                </div>
              ) : (
                <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  No Notion runbook is attached yet. Attach the page that stores
                  Trigger, Preconditions, Allowed actions, Gate policy,
                  Completion criteria, and Read-if-needed links.
                </p>
              )}
              <form
                action={attachInstructionRunbookFormAction}
                className="space-y-3 rounded-lg border p-3"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="instructionId" value={instruction.id} />
                <div className="space-y-2">
                  <Label htmlFor="runbookUrl">Attach Notion runbook URL</Label>
                  <Input
                    id="runbookUrl"
                    name="runbookUrl"
                    type="url"
                    placeholder="https://notion.so/…"
                    required
                  />
                </div>
                <Button type="submit" size="sm">
                  Attach runbook
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Natural language instruction</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-6">
                {instruction.body}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last runs</CardTitle>
              <CardDescription>
                Runs tagged with this instruction id.
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
        </div>

        <aside className="space-y-4">
          <MetaCard
            title="Trigger"
            items={[...instruction.triggerPatterns, ...instruction.triggers]}
            empty="manual"
          />
          <MetaCard
            title="Allowed actions"
            items={[
              ...instruction.requiredActions,
              ...instruction.optionalActions,
              ...instruction.allowedActions,
            ]}
            empty="No actions declared."
          />
          <JsonCard title="Workflow steps" value={instruction.workflowSteps} />
          <JsonCard title="Output contract" value={instruction.outputContract} />
          <JsonCard title="Gate policy" value={instruction.gatePolicy} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Completion criteria</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {instruction.completionCriteria ?? "No completion criteria."}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function getRunbookUrl(outputContract: Record<string, unknown>, body: string) {
  const fromContract =
    stringValue(outputContract.notion_instruction_url) ||
    stringValue(outputContract.notion_url) ||
    stringValue(outputContract.canonical_url);
  if (fromContract) return fromContract;
  return body.match(/https?:\/\/\S+/)?.[0] ?? "";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function MetaCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  const uniqueItems = [...new Set(items.filter(Boolean))];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1.5">
        {uniqueItems.length ? (
          uniqueItems.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">{empty}</span>
        )}
      </CardContent>
    </Card>
  );
}

function JsonCard({ title, value }: { title: string; value: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
