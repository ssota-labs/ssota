"use client";

import { useTransition } from "react";
import { GearIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ssota/ui/components/ui/popover";
import { Switch } from "@ssota/ui/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ssota/ui/components/ui/tooltip";
import { setToolkitDisabledAction } from "@/app/[orgSlug]/[teamspaceSlug]/connections/actions";
import type { ConnectorConnectScope } from "@/lib/connect/authorize-href";
import {
  invalidateToolkitToolSettingsCache,
  prefetchToolkitToolSettings,
  useToolkitToolSettings,
} from "@/lib/hooks/use-toolkit-tool-settings";

function ConnectorToolkitToolPermissionsPopoverContent({
  toolkit,
  providerLabel,
  scope,
  teamspaceId,
  returnTo,
  connectionId,
}: {
  toolkit: string;
  providerLabel: string;
  scope: ConnectorConnectScope;
  teamspaceId: string;
  returnTo: string;
  connectionId: string;
}) {
  const { tools, disabled, loading, error } = useToolkitToolSettings(
    teamspaceId,
    toolkit,
  );
  const [isPending, startTransition] = useTransition();
  const disabledSet = new Set(disabled);

  function toggle(slug: string, enabled: boolean) {
    const next = new Set(disabledSet);
    if (enabled) next.delete(slug);
    else next.add(slug);
    startTransition(async () => {
      await setToolkitDisabledAction({
        teamspaceId,
        toolkit,
        disabled: [...next],
        revalidate: returnTo,
      });
      invalidateToolkitToolSettingsCache(teamspaceId, toolkit);
    });
  }

  return (
    <div
      className="space-y-3"
      data-testid={`connection-tool-permissions-popover-${scope}-${connectionId}`}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Tool permissions</p>
        <p className="text-muted-foreground text-xs">
          {providerLabel} · {scope === "org" ? "Organization" : "Personal"}
        </p>
      </div>

      {loading && !tools ? (
        <p className="text-muted-foreground text-xs">Loading tools…</p>
      ) : error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : !tools || tools.length === 0 ? (
        <p className="text-muted-foreground text-xs">No tools available.</p>
      ) : (
        <ul className="max-h-[min(50vh,20rem)] space-y-1 overflow-y-auto">
          {tools.map((tool) => {
            const enabled = !disabledSet.has(tool.slug);
            return (
              <li
                key={tool.slug}
                className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5"
                data-testid={`connection-tool-permission-row-${tool.slug}`}
              >
                <span className="min-w-0 truncate text-xs" title={tool.slug}>
                  {tool.name}
                </span>
                <Switch
                  checked={enabled}
                  disabled={isPending}
                  onCheckedChange={(checked) => toggle(tool.slug, checked)}
                  aria-label={`Enable ${tool.name}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ConnectorToolPermissionsControl({
  toolkit,
  providerLabel,
  scope,
  teamspaceId,
  returnTo,
  connectionId,
}: {
  toolkit: string;
  providerLabel: string;
  scope: ConnectorConnectScope;
  teamspaceId: string;
  returnTo: string;
  connectionId: string;
}) {
  return (
    <Popover modal={false}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Tool permissions for ${providerLabel}`}
                  data-testid={`connection-tool-settings-${scope}-${connectionId}`}
                  onPointerEnter={() =>
                    prefetchToolkitToolSettings(teamspaceId, toolkit)
                  }
                  onFocus={() => prefetchToolkitToolSettings(teamspaceId, toolkit)}
                />
              }
            />
          }
        >
          <GearIcon className="size-4" aria-hidden />
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={5}>
          Tool permissions
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="w-[min(20rem,92vw)] p-3"
        data-testid="connection-tool-permissions-popover"
        initialFocus={false}
        finalFocus={false}
      >
        <ConnectorToolkitToolPermissionsPopoverContent
          toolkit={toolkit}
          providerLabel={providerLabel}
          scope={scope}
          teamspaceId={teamspaceId}
          returnTo={returnTo}
          connectionId={connectionId}
        />
      </PopoverContent>
    </Popover>
  );
}
