import { TasksDetail } from "@/components/tasks/tasks-detail";
import { TasksViewPanel } from "@/components/tasks/tasks-view-panel";
import type { TaskFilter, TaskTab, TaskWorkspaceRow } from "@/components/tasks/tasks-workspace";
import { matchesTaskFilter } from "@/components/tasks/tasks-workspace";

const filterLabels: Record<TaskFilter, string> = {
  all: "All",
  human: "Human",
  agent: "Agent",
  automation: "Automation",
  blocked: "Blocked",
  review: "Ready",
};

const filterDescriptions: Record<TaskFilter, string> = {
  all: "Runtime work queue for humans, agents, and automation.",
  human: "Tasks assigned to human executors.",
  agent: "Tasks assigned to agent executors.",
  automation: "System and automation-backed tasks.",
  blocked: "Tasks waiting on a blocker.",
  review: "Tasks ready for review or pickup.",
};

type TasksExplorerProps = {
  rows: TaskWorkspaceRow[];
  activeFilter: TaskFilter;
  activeTab: TaskTab;
  baseHref: string;
  projectId: string;
};

export function TasksExplorer({
  rows,
  activeFilter,
  activeTab,
  baseHref,
  projectId,
}: TasksExplorerProps) {
  const viewItems = (Object.keys(filterLabels) as TaskFilter[]).map((filter) => ({
    slug: filter,
    label: filterLabels[filter],
    count: rows.filter((row) => matchesTaskFilter(row, filter)).length,
  }));

  return (
    <div className="flex h-full min-h-0">
      <TasksViewPanel
        items={viewItems}
        activeFilter={activeFilter}
        activeTab={activeTab}
        baseHref={baseHref}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="flex shrink-0 items-start gap-2 border-b px-4 py-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold">{filterLabels[activeFilter]}</h1>
            <p className="text-xs text-muted-foreground">
              {filterDescriptions[activeFilter]} Status changes go through update_task.
            </p>
          </div>
        </div>
        <TasksDetail
          rows={rows}
          activeFilter={activeFilter}
          activeTab={activeTab}
          baseHref={baseHref}
          projectId={projectId}
        />
      </div>
    </div>
  );
}
