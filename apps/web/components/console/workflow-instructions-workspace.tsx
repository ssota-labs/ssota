"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenIcon } from "@phosphor-icons/react";
import type { WorkflowInstruction } from "@ssota/contracts";
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
            <BrowseWorkspace.Grid>
              {group.items.map((instruction) => (
                <BrowseWorkspace.Card
                  key={instruction.id}
                  title={instruction.name}
                  subtitle={instruction.key}
                  subtitleClassName="font-mono"
                  description={instruction.description ?? undefined}
                  selected={activeId === instruction.id}
                  onSelect={() => setActiveId(instruction.id)}
                  testId={`workflow-instruction-item-${instruction.key}`}
                  icon={
                    <BookOpenIcon
                      className="size-5 text-muted-foreground"
                      aria-hidden
                    />
                  }
                />
              ))}
            </BrowseWorkspace.Grid>
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
