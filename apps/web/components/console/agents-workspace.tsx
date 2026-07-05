"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { AgentSettingsSheet } from "@/components/console/agent-settings-sheet";
import { CardListSheet } from "@/components/card-list-sheet";
import { Button } from "@ssota/ui/components/ui/button";
import type { AgentDefinition } from "@ssota/contracts";
import { MAIN_AGENT_ID } from "@ssota/contracts/agents";
import type { AgentSettingsContext } from "@/lib/console/load-agent-settings-context";
import { isWorkerAgentId } from "@/lib/console/agent-tool-catalog";
import {
  CREATE_AGENT_SHEET_ID,
  buildEmptyAgentDefinition,
  isCreateAgentSheetId,
} from "@/lib/console/agent-create-draft";

type AgentsWorkspaceProps = {
  teamspaceId: string;
  mainAgentDefinition: AgentDefinition;
  definitions: AgentDefinition[];
  settingsContext: AgentSettingsContext;
  scriptToolLinks: Record<string, string[]>;
  skillLinks: Record<string, string[]>;
  connectionsHref: string;
};

export function AgentsWorkspace({
  teamspaceId,
  mainAgentDefinition,
  definitions: initialDefinitions,
  settingsContext,
  scriptToolLinks,
  skillLinks,
  connectionsHref,
}: AgentsWorkspaceProps) {
  const [definitions, setDefinitions] = useState(initialDefinitions);
  const [mainAgent, setMainAgent] = useState(mainAgentDefinition);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState<AgentDefinition | null>(null);
  const requestCloseRef = useRef<((action: () => void) => void) | null>(null);

  const isCreating = isCreateAgentSheetId(activeId);
  const activeDefinition = isCreating
    ? createDraft
    : activeId === MAIN_AGENT_ID
      ? mainAgent
      : (definitions.find((entry) => entry.id === activeId) ?? null);
  const open = activeDefinition !== null;

  const workers = useMemo(
    () => definitions.filter((d) => isWorkerAgentId(d.id)),
    [definitions],
  );

  useEffect(() => {
    setDefinitions(initialDefinitions);
  }, [initialDefinitions]);

  useEffect(() => {
    setMainAgent(mainAgentDefinition);
  }, [mainAgentDefinition]);

  const close = useCallback(() => {
    setActiveId(null);
    setCreateDraft(null);
  }, []);

  const openCreateSheet = useCallback(() => {
    setCreateDraft(buildEmptyAgentDefinition(teamspaceId));
    setActiveId(CREATE_AGENT_SHEET_ID);
  }, [teamspaceId]);

  const handleActiveIdChange = useCallback(
    (nextId: string | null) => {
      if (activeId === null) {
        setActiveId(nextId);
        return;
      }
      if (nextId === activeId) {
        return;
      }
      const applyChange = () => {
        if (isCreateAgentSheetId(nextId)) {
          openCreateSheet();
          return;
        }
        setCreateDraft(null);
        setActiveId(nextId);
      };
      if (requestCloseRef.current) {
        requestCloseRef.current(applyChange);
        return;
      }
      applyChange();
    },
    [activeId, openCreateSheet],
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
          description="Configure the project agent and agents you create for this project."
          actions={
            <Button
              type="button"
              onClick={openCreateSheet}
              data-testid="agents-create-button"
            >
              <PlusIcon className="size-4" aria-hidden />
              Create agent
            </Button>
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

        {definitions.length > 0 ? (
          <CardListSheet.List className="border-border bg-transparent">
            {definitions.map((definition) => (
              <CardListSheet.Row
                key={definition.id}
                id={definition.id}
                testId={`agent-item-${definition.id}`}
                className="bg-transparent hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-sm font-medium">{definition.name}</span>
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
        ) : (
          <BrowseWorkspace.Empty>
            No agents yet. Create agents from chat or when applying a template.
          </BrowseWorkspace.Empty>
        )}
      </BrowseWorkspace.Frame>

      {open && activeDefinition ? (
        <AgentSettingsSheet
          definition={activeDefinition}
          mode={isCreating ? "create" : "edit"}
          settingsTarget={activeId === MAIN_AGENT_ID ? "main" : "agent"}
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
          connectionsHref={connectionsHref}
          schedules={settingsContext.schedules}
          onClose={close}
          onCreated={(definition) => {
            setDefinitions((prev) => [...prev, definition]);
          }}
          registerRequestClose={registerRequestClose}
        />
      ) : null}
    </CardListSheet.Root>
  );
}

/** @deprecated Use AgentsWorkspace */
export const WorkflowInstructionsWorkspace = AgentsWorkspace;
