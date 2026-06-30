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
import type { RenderNode } from "@/lib/page-runtime/types";

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
          title="Agents"
          description="Agent playbooks for this project. Edits apply to the next agent or MCP run."
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
        <DocumentSheetPanel
          node={toRenderNode(activeDefinition)}
          subtitle={activeDefinition.description || activeDefinition.id}
          field="content"
          editable
          sheetSize={sheetSize}
          onClose={close}
          onSave={handleSave}
        />
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
