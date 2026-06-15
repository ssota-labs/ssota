import Link from "next/link";
import { buildWorkflowPackage } from "@ssota/core";
import type { ActionLogRecord, Workflow } from "@ssota/core";
import type { ActionCatalogEntry, EdgeCatalogEntry, NodeCatalogEntry } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { ActionLogDataTable } from "@/components/graph/action-log-data-table";
import { NewWorkflowSheet } from "@/components/workflows/new-workflow-sheet";
import { WorkflowCatalogExplorer } from "@/components/workflows/workflow-catalog-explorer";
import { WorkflowVisualBuilder } from "@/components/workflows/workflow-visual-builder";
import { projectPath } from "@/lib/console/paths";
import { formatActionScope } from "@/lib/graph/format-scope";

type LogRow = {
  id: string;
  createdAt: string;
  actionType: string;
  scope: string;
  workflow: string;
  outcome: string;
  executorType: string;
};

export function WorkflowsWorkspace({
  orgSlug,
  projectSlug,
  projectId,
  workflows,
  logs,
  selected,
  activeTab,
  nodeCatalog,
  actionCatalog,
  edgeCatalog,
}: {
  orgSlug: string;
  projectSlug: string;
  projectId: string;
  workflows: Workflow[];
  logs: ActionLogRecord[];
  selected: Workflow | null;
  activeTab: "builder" | "agent" | "runs";
  nodeCatalog: NodeCatalogEntry[];
  actionCatalog: ActionCatalogEntry[];
  edgeCatalog: EdgeCatalogEntry[];
}) {
  const ctx = { orgSlug, projectSlug };
  const baseHref = projectPath(ctx, "workflow");
  const selectedHref = selected
    ? `${baseHref}?workflow=${encodeURIComponent(selected.slug)}`
    : baseHref;

  const catalogItems = workflows.map((workflow) => ({
    slug: workflow.slug,
    label: workflow.spec.title,
    stepCount: workflow.spec.steps.length,
  }));

  const selectedRuns = selected
    ? logs.filter(
        (log) =>
          log.metadata.workflowId === selected.id ||
          log.input.workflowId === selected.id,
      )
    : [];
  const runRows: LogRow[] = selectedRuns.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    actionType: log.actionType,
    scope: formatActionScope(log.metadata.scope ?? log.input.scope),
    workflow: selected?.spec.title ?? "-",
    outcome: log.outcome,
    executorType: log.executorType,
  }));
  const package_ = selected ? buildWorkflowPackage(selected) : null;

  const contextNodeCatalog = nodeCatalog.map((entry) => ({
    nodeType: entry.nodeType,
    label: entry.label,
    propertyKeys: Object.keys(entry.propertySchema ?? {}),
  }));

  const contextEdgeCatalog = edgeCatalog.map((entry) => ({
    edgeType: entry.edgeType,
    label: entry.label,
  }));

  const tabBar = selected ? (
    <>
      <WorkflowTabLink href={selectedHref} active={activeTab === "builder"}>
        Builder
      </WorkflowTabLink>
      <WorkflowTabLink
        href={`${selectedHref}&tab=agent`}
        active={activeTab === "agent"}
      >
        Rendered text
      </WorkflowTabLink>
      <WorkflowTabLink href={`${selectedHref}&tab=runs`} active={activeTab === "runs"}>
        Runs
      </WorkflowTabLink>
    </>
  ) : null;

  const mainContent = selected && package_ ? (
    activeTab === "builder" ? (
      <WorkflowVisualBuilder
        workflow={package_.workflow}
        workflowId={selected.id}
        projectId={projectId}
        orgSlug={orgSlug}
        projectSlug={projectSlug}
        workflowOptions={workflows
          .filter((entry) => entry.workflowKey)
          .map((entry) => ({
            workflowKey: entry.workflowKey!,
            title: entry.spec.title,
          }))}
        actionCatalog={actionCatalog}
        contextNodeCatalog={contextNodeCatalog}
        contextEdgeCatalog={contextEdgeCatalog}
      />
    ) : activeTab === "runs" ? (
      <ActionLogDataTable
        rows={runRows}
        filterColumn="actionType"
        emptyMessage={`No runs recorded for ${selected.spec.title} yet.`}
      />
    ) : (
      <div className="grid h-full gap-4 overflow-auto p-4 lg:grid-cols-[1fr_18rem]">
        <article className="rounded-lg border bg-muted/20 p-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Rendered workflow text (from spec)
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-6">
            {package_.renderedText}
          </pre>
        </article>
        <aside className="space-y-3">
          <WorkflowMetaCard
            title="Allowed actions"
            items={selected.spec.allowedActions}
            empty="No actions declared."
          />
          <WorkflowMetaCard
            title="Workflow role"
            items={selected.spec.workflowRole ? [selected.spec.workflowRole] : []}
            empty="No role tag."
          />
        </aside>
      </div>
    )
  ) : null;

  return (
    <WorkflowCatalogExplorer
      items={catalogItems}
      newWorkflowTrigger={
        <NewWorkflowSheet
          projectId={projectId}
          orgSlug={orgSlug}
          projectSlug={projectSlug}
          nodeCatalog={nodeCatalog}
          actionCatalog={actionCatalog}
          edgeCatalog={edgeCatalog}
        />
      }
      mainHeader={
        selected && package_
          ? {
              title: selected.spec.title,
              badge: formatWorkflowScope(selected.scope),
            }
          : null
      }
      tabBar={tabBar}
      mainContent={mainContent}
    />
  );
}

function formatWorkflowScope(
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
