"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { AgentDefinition } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";
import { updateAgentDefinitionAction } from "@/app/actions";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import type { AgentGroup } from "@/lib/console/load-agents-for-ui";
import {
  DocumentSheetPanel,
  type SheetSize,
} from "@/lib/page-runtime/components/document-sheet-panel";
import { AgentSkillBindings, SkillsCatalogPanel } from "@/components/console/skills-workspace";
import type { RenderNode } from "@/lib/page-runtime/types";

type WorkspaceTab = "agents" | "skills";

type AgentsWorkspaceProps = {
  teamspaceId: string;
  groups: AgentGroup[];
};

function toRenderNode(definition: AgentDefinition): RenderNode {
  return {
    id: definition.id,
    catalogKey: "agent_definition",
    title: definition.name,
    properties: {
      content: definition.instructions,
      summary: definition.description,
    },
  };
}

export function AgentsWorkspace({
  teamspaceId,
  groups: initialGroups,
}: AgentsWorkspaceProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("agents");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const definitions = groups.flatMap((group) => group.items);
  const activeDefinition =
    definitions.find((entry) => entry.id === activeId) ?? null;
  const open = activeDefinition !== null;
  const sheetSize: SheetSize = "half";

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

  const handleSave = (blocks: unknown[]) => {
    if (!activeDefinition) return;

    startTransition(async () => {
      await updateAgentDefinitionAction(teamspaceId, {
        id: activeDefinition.id,
        name: activeDefinition.name,
        description: activeDefinition.description,
        instructions: blocks,
        isMain: activeDefinition.isMain,
        referenceOnly: activeDefinition.referenceOnly,
      });
      setGroups((current) =>
        current.map((group) => ({
          ...group,
          items: group.items.map((entry) =>
            entry.id === activeDefinition.id
              ? {
                  ...entry,
                  instructions: blocks as AgentDefinition["instructions"],
                }
              : entry,
          ),
        })),
      );
      router.refresh();
    });
  };

  return (
    <div
      className="absolute inset-0 flex flex-col"
      data-testid="agents-workspace"
    >
      <BrowseWorkspace.Frame>
        <BrowseWorkspace.Header
          title="Agents & Skills"
          description="Agent playbooks and skill bindings for this project."
        />

        <div className="mb-4 flex gap-2 border-b border-border pb-2">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "agents"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("agents")}
          >
            Agents
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "skills"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("skills")}
            data-testid="skills-tab"
          >
            Skills
          </button>
        </div>

        {tab === "skills" ? (
          <BrowseWorkspace.Section label="Organization catalog">
            <SkillsCatalogPanel teamspaceId={teamspaceId} />
          </BrowseWorkspace.Section>
        ) : null}

        {tab === "agents"
          ? groups.map((group) => (
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
        ))
          : null}

        {tab === "agents" && definitions.length === 0 ? (
          <BrowseWorkspace.Empty>
            No agent definitions seeded for this project yet.
          </BrowseWorkspace.Empty>
        ) : null}
      </BrowseWorkspace.Frame>

      {open && activeDefinition ? (
        <>
          <DocumentSheetPanel
            node={toRenderNode(activeDefinition)}
            subtitle={activeDefinition.description || activeDefinition.id}
            field="content"
            editable
            sheetSize={sheetSize}
            onClose={close}
            onSave={handleSave}
          />
          <div className="pointer-events-auto fixed bottom-0 right-0 z-50 w-full max-w-xl border-l border-t border-border bg-background p-4 shadow-lg md:max-h-[40vh]">
            <AgentSkillBindings
              teamspaceId={teamspaceId}
              agentDefinitionId={activeDefinition.id}
            />
          </div>
        </>
      ) : null}

      {isPending ? (
        <p className="sr-only" aria-live="polite">
          Saving agent definition
        </p>
      ) : null}
    </div>
  );
}

/** @deprecated Use AgentsWorkspace */
export const WorkflowInstructionsWorkspace = AgentsWorkspace;
