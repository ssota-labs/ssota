"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { AgentDefinition } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { AgentSettingsSheet } from "@/components/console/agent-settings-sheet";
import type { AgentGroup } from "@/lib/console/load-agents-for-ui";
import type { AgentSettingsContext } from "@/lib/console/load-agent-settings-context";
import { isWorkerAgentId } from "@/lib/console/agent-tool-catalog";

type AgentsWorkspaceProps = {
  teamspaceId: string;
  groups: AgentGroup[];
  settingsContext: AgentSettingsContext;
  scriptToolLinks: Record<string, string[]>;
};

export function AgentsWorkspace({
  teamspaceId,
  groups: initialGroups,
  settingsContext,
  scriptToolLinks,
}: AgentsWorkspaceProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [activeId, setActiveId] = useState<string | null>(null);

  const definitions = groups.flatMap((group) => group.items);
  const activeDefinition =
    definitions.find((entry) => entry.id === activeId) ?? null;
  const open = activeDefinition !== null;

  const workers = useMemo(
    () => definitions.filter((d) => isWorkerAgentId(d.id)),
    [definitions],
  );

  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setActiveId(null);

  return (
    <div
      className="absolute inset-0 flex flex-col"
      data-testid="agents-workspace"
    >
      <BrowseWorkspace.Frame>
        <BrowseWorkspace.Header
          title="Agents"
          description="Configure agent playbooks, tools, triggers, and models for this project."
        />

        {groups.map((group) => (
          <BrowseWorkspace.Section key={group.key} label={group.label}>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {group.items.map((definition) => (
                <button
                  key={definition.id}
                  type="button"
                  data-testid={`agent-item-${definition.id}`}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    activeId === definition.id && "bg-muted/30",
                  )}
                  onClick={() => setActiveId(definition.id)}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-sm font-medium">{definition.name}</span>
                    <p className="font-mono text-xs text-muted-foreground">
                      {definition.id}
                    </p>
                    {definition.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {definition.description}
                      </p>
                    ) : null}
                  </div>
                  <CaretRightIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </BrowseWorkspace.Section>
        ))}

        {definitions.length === 0 ? (
          <BrowseWorkspace.Empty>
            No agent definitions seeded for this project yet.
          </BrowseWorkspace.Empty>
        ) : null}
      </BrowseWorkspace.Frame>

      {open && activeDefinition ? (
        <AgentSettingsSheet
          definition={activeDefinition}
          teamspaceId={teamspaceId}
          accountId={settingsContext.accountId}
          scriptToolIds={scriptToolLinks[activeDefinition.id] ?? []}
          scriptTools={settingsContext.scriptTools}
          workers={workers}
          connectors={settingsContext.connectors}
          connections={settingsContext.connections}
          schedules={settingsContext.schedules}
          onClose={close}
        />
      ) : null}

    </div>
  );
}

/** @deprecated Use AgentsWorkspace */
export const WorkflowInstructionsWorkspace = AgentsWorkspace;
