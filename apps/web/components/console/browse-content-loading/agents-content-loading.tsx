import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import {
  getAgentDefinitionById,
  listBuiltinAgentIds,
} from "@ssota/contracts/agents";
import { AGENT_GROUP_LABEL, type AgentGroupKey } from "@/lib/console/agent-groups";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { ListRowSkeleton } from "@/components/console/route-loaders";

const GROUP_ORDER: AgentGroupKey[] = ["main", "agents", "reference", "custom"];

function builtinAgentGroups() {
  const buckets = new Map<AgentGroupKey, number>();
  for (const id of listBuiltinAgentIds()) {
    const builtin = getAgentDefinitionById(id);
    if (!builtin) continue;
    const key: AgentGroupKey = builtin.isMain
      ? "main"
      : builtin.referenceOnly
        ? "reference"
        : "agents";
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return GROUP_ORDER.filter((key) => (buckets.get(key) ?? 0) > 0).map(
    (key) => ({
      key,
      label: AGENT_GROUP_LABEL[key],
      rows: buckets.get(key) ?? 0,
    }),
  );
}

/** Phase-2 Suspense fallback for Agents browse page. */
export function AgentsContentLoading() {
  const groups = builtinAgentGroups();

  return (
    <div
      className="relative min-h-0 flex-1"
      data-testid="content-loading-agents"
    >
      <div className="absolute inset-0 flex flex-col">
        <ConsolePageFrame contentClassName="gap-8">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
            <div className="max-w-2xl">
              <Skeleton className="h-4 w-full max-w-2xl rounded-sm" />
            </div>
          </header>

          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h2>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-transparent">
                {Array.from({ length: group.rows }, (_, index) => (
                  <ListRowSkeleton key={index} />
                ))}
              </div>
            </section>
          ))}

          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {AGENT_GROUP_LABEL.custom}
            </h2>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-transparent">
              <ListRowSkeleton />
            </div>
          </section>
        </ConsolePageFrame>
      </div>
    </div>
  );
}
