import Link from "next/link";
import { buildWorkflowInstructionPackage } from "@ssota/core";
import type { ActionLogRecord, Gate, Instruction } from "@ssota/core";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@ssota/ui/components/ui/sheet";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { defineWorkflowInstructionFormAction } from "@/app/actions";
import { ActionLogDataTable } from "@/components/graph/action-log-data-table";
import { NewTableButton } from "@/components/graph/table-catalog-panel";
import { WorkflowBuilderSections } from "@/components/workflows/workflow-builder-sections";
import { WorkflowCatalogExplorer } from "@/components/workflows/workflow-catalog-explorer";
import {
  WorkflowReviewsPanel,
  gateMatchesWorkflow,
} from "@/components/workflows/workflow-reviews-panel";
import { WorkflowVisualBuilder } from "@/components/workflows/workflow-visual-builder";
import { projectPath } from "@/lib/console/paths";
import { formatActionScope } from "@/lib/graph/format-scope";

type LogRow = {
  id: string;
  createdAt: string;
  actionType: string;
  scope: string;
  instruction: string;
  outcome: string;
  executorType: string;
};

export function WorkflowsWorkspace({
  orgSlug,
  projectSlug,
  projectId,
  instructions,
  logs,
  pendingGates,
  selected,
  activeTab,
}: {
  orgSlug: string;
  projectSlug: string;
  projectId: string;
  instructions: Instruction[];
  logs: ActionLogRecord[];
  pendingGates: Gate[];
  selected: Instruction | null;
  activeTab: "builder" | "instruction" | "flow" | "runs" | "reviews";
}) {
  const ctx = { orgSlug, projectSlug };
  const baseHref = projectPath(ctx, "workflow");
  const selectedHref = selected
    ? `${baseHref}?workflow=${encodeURIComponent(selected.slug)}`
    : baseHref;

  const catalogItems = instructions.map((instruction) => ({
    slug: instruction.slug,
    label: instruction.title,
    stepCount: instruction.workflowSteps.length,
  }));

  const selectedRuns = selected
    ? logs.filter(
        (log) =>
          log.metadata.instructionId === selected.id ||
          log.input.instructionId === selected.id,
      )
    : [];
  const runRows: LogRow[] = selectedRuns.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    actionType: log.actionType,
    scope: formatActionScope(log.metadata.scope ?? log.input.scope),
    instruction: selected?.title ?? "-",
    outcome: log.outcome,
    executorType: log.executorType,
  }));
  const workflowGates = selected
    ? pendingGates.filter((gate) =>
        gateMatchesWorkflow(gate, selected.id, selected.allowedActions),
      )
    : pendingGates;
  const package_ = selected ? buildWorkflowInstructionPackage(selected) : null;

  const tabBar = selected ? (
    <>
      <WorkflowTabLink href={selectedHref} active={activeTab === "builder"}>
        Builder
      </WorkflowTabLink>
      <WorkflowTabLink
        href={`${selectedHref}&tab=instruction`}
        active={activeTab === "instruction"}
      >
        Instruction
      </WorkflowTabLink>
      <WorkflowTabLink href={`${selectedHref}&tab=flow`} active={activeTab === "flow"}>
        Flow
      </WorkflowTabLink>
      <WorkflowTabLink href={`${selectedHref}&tab=runs`} active={activeTab === "runs"}>
        Runs
      </WorkflowTabLink>
      <WorkflowTabLink
        href={`${selectedHref}&tab=reviews`}
        active={activeTab === "reviews"}
      >
        Reviews
        {workflowGates.length ? (
          <Badge variant="secondary" className="ml-1">
            {workflowGates.length}
          </Badge>
        ) : null}
      </WorkflowTabLink>
      <Button
        render={<Link href={projectPath(ctx, "workflow", selected.slug)} />}
        variant="outline"
        size="sm"
        nativeButton={false}
        className="ml-auto h-7"
      >
        Detail
      </Button>
    </>
  ) : null;

  const mainContent = selected && package_ ? (
    activeTab === "builder" ? (
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <div className="min-h-64 flex-1 border-b lg:min-h-0 lg:border-r lg:border-b-0">
          <WorkflowVisualBuilder workflow={package_.workflow} />
        </div>
        <div className="h-72 shrink-0 overflow-auto lg:h-auto lg:w-96 lg:shrink-0">
          <div className="p-4">
            <WorkflowBuilderSections workflow={package_.workflow} />
          </div>
        </div>
      </div>
    ) : activeTab === "flow" ? (
      <WorkflowVisualBuilder workflow={package_.workflow} readOnly />
    ) : activeTab === "runs" ? (
      <ActionLogDataTable
        rows={runRows}
        filterColumn="actionType"
        emptyMessage={`No runs recorded for ${selected.title} yet.`}
      />
    ) : activeTab === "reviews" ? (
      <WorkflowReviewsPanel
        gates={workflowGates}
        projectId={projectId}
        emptyMessage={`No pending reviews for ${selected.title}.`}
      />
    ) : (
      <div className="grid h-full gap-4 overflow-auto p-4 lg:grid-cols-[1fr_18rem]">
        <article className="rounded-lg border bg-muted/20 p-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Rendered instruction (from workflow spec)
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-6">
            {package_.renderedText}
          </pre>
        </article>
        <aside className="space-y-3">
          <WorkflowMetaCard
            title="Allowed actions"
            items={[
              ...selected.requiredActions,
              ...selected.optionalActions,
              ...selected.allowedActions,
            ]}
            empty="No actions declared."
          />
          <WorkflowMetaCard
            title="Output contract"
            items={Object.keys(selected.outputContract)}
            empty="No output contract fields."
          />
        </aside>
      </div>
    )
  ) : null;

  return (
    <WorkflowCatalogExplorer
      items={catalogItems}
      newWorkflowTrigger={
        <NewWorkflowSheet projectId={projectId}>
          <NewTableButton>New workflow</NewTableButton>
        </NewWorkflowSheet>
      }
      mainHeader={
        selected && package_
          ? {
              title: selected.title,
              description: formatInstructionScope(selected.scope),
            }
          : null
      }
      tabBar={tabBar}
      mainContent={mainContent}
    />
  );
}

function formatInstructionScope(
  scope: { kind: string } & Record<string, unknown>,
) {
  if (scope.kind === "node_type") return `node:${scope.nodeType}`;
  if (scope.kind === "edge_type") return `edge:${scope.edgeType}`;
  if (scope.kind === "property") {
    return `property:${scope.nodeType}.${scope.propertyKey}`;
  }
  if (scope.kind === "action") return `action:${scope.actionType}`;
  return "global";
}

function WorkflowTabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      render={<Link href={href} scroll={false} />}
      variant={active ? "secondary" : "ghost"}
      size="sm"
      nativeButton={false}
      className="h-7 capitalize"
    >
      {children}
    </Button>
  );
}

function WorkflowMetaCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.length ? (
          [...new Set(items)].map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">{empty}</span>
        )}
      </div>
    </div>
  );
}

function NewWorkflowSheet({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger className="block w-full">{children}</SheetTrigger>
      <SheetContent className="inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New workflow</SheetTitle>
          <SheetDescription>
            define_instruction 메타 액션으로 agent workflow를 추가합니다.
          </SheetDescription>
        </SheetHeader>
        <form
          action={defineWorkflowInstructionFormAction}
          className="space-y-4 px-6 pb-6"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="triggerPatterns">Trigger patterns</Label>
            <Input id="triggerPatterns" name="triggerPatterns" defaultValue="manual" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="triggers">Automation triggers</Label>
            <Input id="triggers" name="triggers" placeholder="task_assigned" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowedActions">Allowed actions</Label>
            <Input id="allowedActions" name="allowedActions" placeholder="create_node" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workflowSteps">Workflow steps JSON array</Label>
            <Textarea
              id="workflowSteps"
              name="workflowSteps"
              defaultValue='[{ "id": "gather_context", "title": "Gather context", "actionRefs": [] }]'
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="outputContract">Output contract JSON</Label>
            <Textarea id="outputContract" name="outputContract" defaultValue="{}" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gatePolicy">Gate policy JSON</Label>
            <Textarea id="gatePolicy" name="gatePolicy" defaultValue="{}" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructionKey">Workflow key (optional)</Label>
            <Input
              id="instructionKey"
              name="instructionKey"
              placeholder="document_creation"
              pattern="[a-z][a-z0-9_]*"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contentUrl">External runbook URL (optional)</Label>
            <Input id="contentUrl" name="contentUrl" type="url" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Inline body (optional if URL set)</Label>
            <Textarea id="body" name="body" />
          </div>
          <Button type="submit">Submit workflow</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
