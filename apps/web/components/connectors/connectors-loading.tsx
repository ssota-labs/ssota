import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { cn } from "@ssota/ui/lib/utils";
import {
  COMPOSIO_THEME_ORDER,
  COMPOSIO_TOOLKITS,
} from "@ssota/agent-runtime/composio-shared";
import {
  connectorCardClassName,
  connectorCardTextClassName,
  connectorIconWrapClassName,
} from "@/components/connectors/connector-card-styles";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { ConnectorsScrollShell } from "@/components/connectors/connectors-scroll-shell";

function ConnectorCardSkeleton() {
  return (
    <div className={connectorCardClassName} aria-hidden>
      <span className={connectorIconWrapClassName}>
        <Skeleton className="size-5 rounded-sm" />
      </span>
      <span className={cn(connectorCardTextClassName, "space-y-1.5")}>
        <Skeleton className="h-3.5 w-[7.5rem] max-w-[45%] rounded-sm" />
        <Skeleton className="h-3 w-full max-w-[85%] rounded-sm" />
      </span>
    </div>
  );
}

export function ConnectorsLoading() {
  const groups = COMPOSIO_THEME_ORDER.map((theme) => ({
    theme,
    count: COMPOSIO_TOOLKITS.filter((toolkit) => toolkit.theme === theme).length,
  })).filter((group) => group.count > 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConnectorsScrollShell>
        <ConsolePageFrame contentClassName="gap-8" maxWidthClassName="max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Connectors</h1>
          <div className="max-w-2xl">
            <Skeleton className="h-4 w-72 max-w-full rounded-sm" />
          </div>
        </header>

        {groups.map((group) => (
          <section key={group.theme} className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.theme}
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: group.count }, (_, index) => (
                <ConnectorCardSkeleton key={`${group.theme}-${index}`} />
              ))}
            </div>
          </section>
        ))}
        </ConsolePageFrame>
      </ConnectorsScrollShell>
    </div>
  );
}
