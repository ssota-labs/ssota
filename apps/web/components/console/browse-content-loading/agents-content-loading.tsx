import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { listRunnableBuiltinAgentIds } from "@ssota/contracts/agents";
import { AGENT_GROUP_LABEL, type AgentGroupKey } from "@/lib/console/agent-groups";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { ListRowSkeleton } from "@/components/console/route-loaders";

const GROUP_ORDER: AgentGroupKey[] = ["builtin", "custom"];

/** Phase-2 Suspense fallback for Agents browse page. */
export function AgentsContentLoading() {
  const builtinRows = listRunnableBuiltinAgentIds().length;

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

          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Project agent
            </h2>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-transparent">
              <ListRowSkeleton />
            </div>
          </section>

          {GROUP_ORDER.map((key) => (
            <section key={key} className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {AGENT_GROUP_LABEL[key]}
              </h2>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-transparent">
                {Array.from(
                  { length: key === "builtin" ? builtinRows : 1 },
                  (_, index) => (
                    <ListRowSkeleton key={index} />
                  ),
                )}
              </div>
            </section>
          ))}
        </ConsolePageFrame>
      </div>
    </div>
  );
}
