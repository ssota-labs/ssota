"use client";

import {
  CheckCircleIcon,
  HandIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import type {
  AgentConnectorBinding,
  ConnectorToolPermission,
} from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";
import {
  getEffectiveToolPermission,
  setBindingToolPermission,
} from "@/lib/console/agent-connector-bindings";
import { useToolkitToolSettings } from "@/lib/hooks/use-toolkit-tool-settings";

const PERMISSION_OPTIONS: Array<{
  value: ConnectorToolPermission;
  label: string;
  icon: typeof CheckCircleIcon;
}> = [
  { value: "allow", label: "Always allow", icon: CheckCircleIcon },
  { value: "approval", label: "Needs approval", icon: HandIcon },
  { value: "block", label: "Blocked", icon: ProhibitIcon },
];

function ToolPermissionTriState({
  value,
  disabled,
  onChange,
  toolName,
}: {
  value: ConnectorToolPermission;
  disabled?: boolean;
  onChange: (next: ConnectorToolPermission) => void;
  toolName: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-md border border-border p-0.5",
        disabled && "opacity-60",
      )}
      role="group"
      aria-label={`Permission for ${toolName}`}
    >
      {PERMISSION_OPTIONS.map(({ value: option, label, icon: Icon }) => {
        const selected = value === option;
        return (
          <Button
            key={option}
            type="button"
            variant={selected ? "secondary" : "ghost"}
            size="icon-sm"
            className={cn(
              "size-7 shrink-0",
              selected && "bg-background shadow-xs",
            )}
            disabled={disabled}
            aria-label={label}
            aria-pressed={selected}
            data-testid={`tool-permission-${option}`}
            onClick={() => onChange(option)}
          >
            <Icon className="size-3.5" aria-hidden />
          </Button>
        );
      })}
    </div>
  );
}

export function AgentConnectorToolPermissionsPopoverContent({
  binding,
  teamspaceId,
  providerLabel,
  onBindingChange,
}: {
  binding: AgentConnectorBinding;
  teamspaceId: string;
  providerLabel: string;
  onBindingChange: (next: AgentConnectorBinding) => void;
}) {
  const { tools, disabled: globalDisabled, loading, error } =
    useToolkitToolSettings(teamspaceId, binding.provider);

  const handlePermissionChange = (
    slug: string,
    permission: ConnectorToolPermission,
  ) => {
    onBindingChange(setBindingToolPermission(binding, slug, permission));
  };

  const hasConnectionsDisabledTools =
    !loading &&
    !error &&
    tools != null &&
    tools.length > 0 &&
    globalDisabled.length > 0;

  return (
    <div
      className="space-y-3"
      data-testid={`agent-tool-permissions-popover-${binding.scope}-${binding.connectionId}`}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Tool permissions</p>
        <p className="text-muted-foreground text-xs">
          {providerLabel} ·{" "}
          {binding.scope === "org" ? "Organization" : "Personal"}
        </p>
      </div>

      {hasConnectionsDisabledTools ? (
        <p
          className="text-muted-foreground rounded-md border border-dashed border-border/80 bg-muted/20 px-2 py-1.5 text-xs"
          data-testid="agent-tool-permissions-connections-hint"
        >
          Tools turned off in Connections stay blocked for every agent. Enable
          them on the Connections page to change permissions here.
        </p>
      ) : null}

      {loading && !tools ? (
        <div
          className="flex min-h-[min(50vh,20rem)] items-start pt-1"
          aria-busy="true"
        >
          <p className="text-muted-foreground text-xs">Loading tools…</p>
        </div>
      ) : error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : !tools || tools.length === 0 ? (
        <p className="text-muted-foreground text-xs">No tools available.</p>
      ) : (
        <ul className="max-h-[min(50vh,20rem)] space-y-1 overflow-y-auto">
          {tools.map((tool) => {
            const effective = getEffectiveToolPermission(
              globalDisabled,
              binding,
              tool.slug,
            );
            const globallyBlocked = globalDisabled.includes(tool.slug);
            return (
              <li
                key={tool.slug}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-1 py-1.5",
                  globallyBlocked && "opacity-60",
                )}
                data-testid={`agent-tool-permission-row-${tool.slug}`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span
                    className="block truncate text-xs"
                    title={`${tool.name} (${tool.slug})`}
                  >
                    {tool.name}
                  </span>
                  {globallyBlocked ? (
                    <p
                      className="text-muted-foreground text-[11px]"
                      data-testid={`agent-tool-permission-connections-disabled-${tool.slug}`}
                    >
                      Disabled in Connections
                    </p>
                  ) : null}
                </div>
                <ToolPermissionTriState
                  value={effective}
                  disabled={globallyBlocked}
                  toolName={tool.name}
                  onChange={(next) => handlePermissionChange(tool.slug, next)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
