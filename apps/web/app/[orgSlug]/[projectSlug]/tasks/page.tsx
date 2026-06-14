import { PageHeader } from "@/components/studio/page-header";
import {
  TasksWorkspace,
  type TaskFilter,
  type TaskWorkspaceRow,
} from "@/components/tasks/tasks-workspace";
import { graphPath, projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

const taskFilters = new Set<TaskFilter>([
  "all",
  "human",
  "agent",
  "automation",
  "blocked",
  "review",
]);

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { view } = await searchParams;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const taskNodes = await ports.graph.queryNodes({ nodeType: "Task", limit: 200 });
  const activeFilter = taskFilters.has(view as TaskFilter)
    ? (view as TaskFilter)
    : "all";

  const rows: TaskWorkspaceRow[] = taskNodes.map((node) => {
    const properties = node.properties;
    return {
      id: node.id,
      title: stringValue(properties.title) || "Untitled Task",
      lifecycleStatus: node.lifecycleStatus,
      status: stringValue(properties.status) || node.lifecycleStatus,
      assignee: stringValue(properties.assignee) || "Unassigned",
      workflowType: stringValue(properties.workflow_type),
      workflowKey: stringValue(properties.workflow_key),
      targetNodeId: stringValue(properties.target_node_id),
      acceptanceCriteria: arrayValue(properties.acceptance_criteria),
      notionUrl:
        stringValue(properties.canonical_url) ||
        stringValue(properties.notion_url) ||
        stringValue(node.contentUrl),
      lockOwner: stringValue(properties.lock_owner),
      lockExpiresAt: stringValue(properties.lock_expires_at),
      content: node.content ?? "",
      updatedAt: node.updatedAt.toISOString(),
      rawProperties: properties,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="A shared work queue for humans, agents, and automation. Graph writes still go through execute_action."
      />
      <TasksWorkspace
        rows={rows}
        activeFilter={activeFilter}
        baseHref={projectPath(ctx, "tasks")}
        graphTaskHref={`${graphPath(ctx, "nodes")}?table=task`}
      />
    </div>
  );
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function arrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const stringItem = stringValue(item);
      return stringItem ? [stringItem] : [];
    });
  }
  const stringItem = stringValue(value);
  return stringItem ? [stringItem] : [];
}
