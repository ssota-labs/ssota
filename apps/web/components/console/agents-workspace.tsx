"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { AgentSettingsSheet } from "@/components/console/agent-settings-sheet";
import { CardListSheet } from "@/components/card-list-sheet";
import type { AgentGroup } from "@/lib/console/load-agents-for-ui";
import type { AgentSettingsContext } from "@/lib/console/load-agent-settings-context";
import { isWorkerAgentId } from "@/lib/console/agent-tool-catalog";

type AgentsWorkspaceProps = {
  teamspaceId: string;
  groups: AgentGroup[];
  settingsContext: AgentSettingsContext;
  scriptToolLinks: Record<string, string[]>;
  skillLinks: Record<string, string[]>;
  skillsHref: string;
};

export function AgentsWorkspace({
  teamspaceId,
  groups: initialGroups,
  settingsContext,
  scriptToolLinks,
  skillLinks,
  skillsHref,
}: AgentsWorkspaceProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [activeId, setActiveId] = useState<string | null>(null);
  const requestCloseRef = useRef<((action: () => void) => void) | null>(null);

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

  const close = () => setActiveId(null);

  const handleActiveIdChange = useCallback(
    (nextId: string | null) => {
      if (activeId === null) {
        setActiveId(nextId);
        return;
      }
      if (nextId === activeId) {
        return;
      }
      const applyChange = () => setActiveId(nextId);
      if (requestCloseRef.current) {
        requestCloseRef.current(applyChange);
        return;
      }
      applyChange();
    },
    [activeId],
  );

  const registerRequestClose = useCallback(
    (requestClose: ((action: () => void) => void) | null) => {
      requestCloseRef.current = requestClose;
    },
    [],
  );

  return (
    <CardListSheet.Root
      activeId={activeId}
      onActiveIdChange={handleActiveIdChange}
      dismissOnOutsideClick
      className="absolute inset-0 flex flex-col"
      testId="agents-workspace"
    >
      <BrowseWorkspace.Frame>
        <BrowseWorkspace.Header
          title="Agents"
          description="Configure agent playbooks, tools, triggers, models, and skills."
          actions={
            <a
              href={skillsHref}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Open Skills
            </a>
          }
        />

        {groups.map((group) => (
          <BrowseWorkspace.Section key={group.key} label={group.label}>
            <CardListSheet.List className="border-border bg-transparent">
              {group.items.map((definition) => (
                <CardListSheet.Row
                  key={definition.id}
                  id={definition.id}
                  testId={`agent-item-${definition.id}`}
                  className="bg-transparent hover:bg-muted/30"
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
                  <CardListSheet.RowCaret />
                </CardListSheet.Row>
              ))}
            </CardListSheet.List>
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
          boundSkillIds={skillLinks[activeDefinition.id] ?? []}
          skillCatalog={settingsContext.skillCatalog}
          scriptTools={settingsContext.scriptTools}
          workers={workers}
          connectors={settingsContext.connectors}
          connections={settingsContext.connections}
          inboundChannels={settingsContext.inboundChannels}
          channelsHref={settingsContext.channelsHref}
          schedules={settingsContext.schedules}
          onClose={close}
          registerRequestClose={registerRequestClose}
        />
      ) : null}
    </CardListSheet.Root>
  );
}

/** @deprecated Use AgentsWorkspace */
export const WorkflowInstructionsWorkspace = AgentsWorkspace;
