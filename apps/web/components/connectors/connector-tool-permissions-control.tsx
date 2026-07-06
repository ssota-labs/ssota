"use client";

import { useEffect, useState } from "react";
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
import { setConnectionDisabledAction } from "@/app/[orgSlug]/[teamspaceSlug]/connections/actions";
import type { ConnectorConnectScope } from "@/lib/connect/authorize-href";
import {
  patchConnectionToolSettingsDisabledCache,
  prefetchConnectionToolSettings,
  useConnectionToolSettings,
} from "@/lib/hooks/use-connection-tool-settings";

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
  const { tools, disabled, loading, error } = useConnectionToolSettings({
    teamspaceId,
    connectionId,
    toolkit,
    scope,
  });
  const [optimisticDisabled, setOptimisticDisabled] = useState<string[] | null>(
    null,
  );
  const [pendingSlugs, setPendingSlugs] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const disabledSlugs = optimisticDisabled ?? disabled;
  const disabledSet = new Set(disabledSlugs);

  useEffect(() => {
    if (pendingSlugs.size > 0 || optimisticDisabled === null) return;
    const serverKey = [...disabled].sort().join("\0");
    const optimisticKey = [...optimisticDisabled].sort().join("\0");
    if (serverKey === optimisticKey) {
      setOptimisticDisabled(null);
    }
  }, [disabled, optimisticDisabled, pendingSlugs]);

  function toggle(slug: string, enabled: boolean) {
    const previousDisabled = optimisticDisabled ?? disabled;
    const nextSet = new Set(previousDisabled);
    if (enabled) nextSet.delete(slug);
    else nextSet.add(slug);
    const next = [...nextSet];

    setOptimisticDisabled(next);
    setPendingSlugs((current) => new Set(current).add(slug));

    void (async () => {
      try {
        await setConnectionDisabledAction({
          teamspaceId,
          connectionId,
          toolkit,
          disabled: next,
          revalidate: returnTo,
        });
        patchConnectionToolSettingsDisabledCache(teamspaceId, connectionId, next);
      } catch {
        setOptimisticDisabled((current) => {
          const reverted = new Set(current ?? disabled);
          if (enabled) reverted.add(slug);
          else reverted.delete(slug);
          return [...reverted];
        });
      } finally {
        setPendingSlugs((current) => {
          const nextPending = new Set(current);
          nextPending.delete(slug);
          return nextPending;
        });
      }
    })();
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
            const isSaving = pendingSlugs.has(tool.slug);
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
                  disabled={isSaving}
                  onCheckedChange={(checked) => toggle(tool.slug, checked)}
                  aria-label={`Enable ${tool.name}`}
                  data-testid={`connection-tool-permission-switch-${tool.slug}`}
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
                    prefetchConnectionToolSettings({
                      teamspaceId,
                      connectionId,
                      toolkit,
                      scope,
                    })
                  }
                  onFocus={() =>
                    prefetchConnectionToolSettings({
                      teamspaceId,
                      connectionId,
                      toolkit,
                      scope,
                    })
                  }
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
