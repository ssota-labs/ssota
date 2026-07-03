"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { AgentSettingsSheet } from "@/components/console/agent-settings-sheet";
import { CardListSheet } from "@/components/card-list-sheet";
import type { AgentDefinition } from "@ssota/contracts";
import { MAIN_AGENT_ID } from "@ssota/contracts/agents";
import type { AgentGroup } from "@/lib/console/load-agents-for-ui";
import type { AgentSettingsContext } from "@/lib/console/load-agent-settings-context";
import { isWorkerAgentId } from "@/lib/console/agent-tool-catalog";

type AgentsWorkspaceProps = {
  teamspaceId: string;
  mainAgentDefinition: AgentDefinition;
  groups: AgentGroup[];
  settingsContext: AgentSettingsContext;
  scriptToolLinks: Record<string, string[]>;
  skillsHref: string;
};

export function AgentsWorkspace({
  teamspaceId,
  mainAgentDefinition,
  groups: initialGroups,
  settingsContext,
  scriptToolLinks,
  skillsHref,
}: AgentsWorkspaceProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [mainAgent, setMainAgent] = useState(mainAgentDefinition);
  const [activeId, setActiveId] = useState<string | null>(null);
  const requestCloseRef = useRef<((action: () => void) => void) | null>(null);

  const definitions = groups.flatMap((group) => group.items);
  const activeDefinition =
    activeId === MAIN_AGENT_ID
      ? mainAgent
      : (definitions.find((entry) => entry.id === activeId) ?? null);
  const open = activeDefinition !== null;

  const workers = useMemo(
    () => definitions.filter((d) => isWorkerAgentId(d.id)),
    [definitions],
  );

  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  useEffect(() => {
    setMainAgent(mainAgentDefinition);
  }, [mainAgentDefinition]);

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
          description="Configure the project agent and runnable specialist playbooks."
          actions={
            <a
              href={skillsHref}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Open Skills
            </a>
          }
        />

        <BrowseWorkspace.Section label="Project agent">
          <CardListSheet.List className="border-border bg-transparent">
            <CardListSheet.Row
              id={MAIN_AGENT_ID}
              testId="main-agent-card"
              className="bg-transparent hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-sm font-medium">{mainAgent.name}</span>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {mainAgent.description}
                </p>
              </div>
              <CardListSheet.RowCaret />
            </CardListSheet.Row>
          </CardListSheet.List>
        </BrowseWorkspace.Section>

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
            No runnable agent playbooks seeded for this project yet.
          </BrowseWorkspace.Empty>
        ) : null}
      </BrowseWorkspace.Frame>

      {open && activeDefinition ? (
        <AgentSettingsSheet
          definition={activeDefinition}
          settingsTarget={activeId === MAIN_AGENT_ID ? "main" : "agent"}
          teamspaceId={teamspaceId}
          accountId={settingsContext.accountId}
          scriptToolIds={scriptToolLinks[activeDefinition.id] ?? []}
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
