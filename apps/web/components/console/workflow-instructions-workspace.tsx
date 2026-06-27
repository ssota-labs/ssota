"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { WorkflowInstruction } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";
import { updateWorkflowInstructionAction } from "@/app/actions";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import type { WorkflowInstructionGroup } from "@/lib/console/load-workflow-instructions-for-ui";
import {
  DocumentSheetPanel,
  type SheetSize,
} from "@/lib/page-runtime/components/document-sheet-panel";
import type { RenderNode } from "@/lib/page-runtime/types";

type WorkflowInstructionsWorkspaceProps = {
  projectId: string;
  groups: WorkflowInstructionGroup[];
};

function toRenderNode(instruction: WorkflowInstruction): RenderNode {
  return {
    id: instruction.id,
    catalogKey: "workflow_instruction",
    title: instruction.name,
    properties: {
      content: instruction.content,
      summary: instruction.key,
    },
  };
}

export function WorkflowInstructionsWorkspace({
  projectId,
  groups: initialGroups,
}: WorkflowInstructionsWorkspaceProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const instructions = groups.flatMap((group) => group.items);
  const activeInstruction =
    instructions.find((entry) => entry.id === activeId) ?? null;
  const open = activeInstruction !== null;
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
    if (!activeInstruction) return;

    startTransition(async () => {
      await updateWorkflowInstructionAction(projectId, {
        key: activeInstruction.key,
        name: activeInstruction.name,
        description: activeInstruction.description,
        content: blocks,
      });
      setGroups((current) =>
        current.map((group) => ({
          ...group,
          items: group.items.map((entry) =>
            entry.id === activeInstruction.id
              ? {
                  ...entry,
                  content: blocks as WorkflowInstruction["content"],
                }
              : entry,
          ),
        })),
      );
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BrowseWorkspace.Frame testId="workflow-instructions-workspace">
        <BrowseWorkspace.Header
          title="Workflow instructions"
          description="Agent playbooks for this project. Edits apply to the next agent or MCP run."
        />

        {groups.map((group) => (
          <BrowseWorkspace.Section key={group.key} label={group.label}>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {group.items.map((instruction) => (
                <button
                  key={instruction.id}
                  type="button"
                  data-testid={`workflow-instruction-item-${instruction.key}`}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    activeId === instruction.id && "bg-muted/30",
                  )}
                  onClick={() => setActiveId(instruction.id)}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-sm font-medium">{instruction.name}</span>
                    <p className="font-mono text-xs text-muted-foreground">
                      {instruction.key}
                    </p>
                    {instruction.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {instruction.description}
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

        {instructions.length === 0 ? (
          <BrowseWorkspace.Empty>
            No workflow instructions seeded for this project yet.
          </BrowseWorkspace.Empty>
        ) : null}
      </BrowseWorkspace.Frame>

      {open && activeInstruction ? (
        <DocumentSheetPanel
          node={toRenderNode(activeInstruction)}
          subtitle={activeInstruction.key}
          field="content"
          editable
          sheetSize={sheetSize}
          onClose={close}
          onSave={handleSave}
        />
      ) : null}

      {isPending ? (
        <p className="sr-only" aria-live="polite">
          Saving workflow instruction
        </p>
      ) : null}
    </div>
  );
}
