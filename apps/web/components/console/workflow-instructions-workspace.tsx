"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { WorkflowInstruction } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";
import { updateWorkflowInstructionAction } from "@/app/actions";
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
    <div
      className="absolute inset-0 flex flex-col"
      data-testid="workflow-instructions-workspace"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        <div className="space-y-6">
          <header className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Workflow instructions
            </h1>
            <p className="text-sm text-muted-foreground">
              Agent playbooks for this project. Edits apply to the next agent or
              MCP run.
            </p>
          </header>

          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <h2 className="text-sm font-semibold">{group.label}</h2>
              <div className="border-border divide-border divide-y overflow-hidden rounded-lg border">
                {group.items.map((instruction) => (
                  <button
                    key={instruction.id}
                    type="button"
                    data-testid={`workflow-instruction-item-${instruction.key}`}
                    className={cn(
                      "hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      activeId === instruction.id && "bg-muted/30",
                    )}
                    onClick={() => setActiveId(instruction.id)}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-sm font-medium">
                        {instruction.name}
                      </span>
                      <p className="text-muted-foreground font-mono text-xs">
                        {instruction.key}
                      </p>
                      {instruction.description ? (
                        <p className="text-muted-foreground line-clamp-2 text-xs">
                          {instruction.description}
                        </p>
                      ) : null}
                    </div>
                    <CaretRightIcon
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden
                    />
                  </button>
                ))}
              </div>
            </section>
          ))}

          {instructions.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border px-4 py-6 text-center text-sm">
              No workflow instructions seeded for this project yet.
            </p>
          ) : null}
        </div>
      </div>

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
