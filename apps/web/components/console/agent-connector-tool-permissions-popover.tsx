"use client";

import { useEffect, useState } from "react";
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
import { loadToolkitToolSettingsAction } from "@/app/[orgSlug]/[teamspaceSlug]/connections/actions";
import {
  getEffectiveToolPermission,
  setBindingToolPermission,
} from "@/lib/console/agent-connector-bindings";

type ToolRow = {
  slug: string;
  name: string;
};

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
  const [tools, setTools] = useState<ToolRow[] | null>(null);
  const [globalDisabled, setGlobalDisabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadToolkitToolSettingsAction({ teamspaceId, toolkit: binding.provider })
      .then((result) => {
        if (!active) return;
        setTools(result.tools.map((tool) => ({ slug: tool.slug, name: tool.name })));
        setGlobalDisabled(result.disabled);
      })
      .catch(() => {
        if (!active) return;
        setError("Could not load tools for this connector.");
        setTools([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [binding.provider, teamspaceId]);

  const handlePermissionChange = (
    slug: string,
    permission: ConnectorToolPermission,
  ) => {
    onBindingChange(setBindingToolPermission(binding, slug, permission));
  };

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

      {loading ? (
        <p className="text-muted-foreground text-xs">Loading tools…</p>
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
                <span
                  className="min-w-0 truncate text-xs"
                  title={tool.slug}
                >
                  {tool.name}
                </span>
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
