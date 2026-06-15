"use client";

import { useState } from "react";
import { BookOpenIcon, PlusIcon } from "@phosphor-icons/react";
import type { WorkflowExternalLink } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { cn } from "@ssota/ui/lib/utils";
import {
  ExpandableListItem,
} from "@ssota/ui/components/ui/expandable-list-section";
import {
  addRouteLink,
  removeRouteLink,
  updateRouteBlock,
  type WorkflowDraft,
} from "@/lib/workflows/workflow-draft";
import { WorkflowInspectorSheetHeader } from "@/components/workflows/workflow-inspector-sheet-header";

function defaultInstruction(): WorkflowExternalLink {
  return {
    id: `link_${crypto.randomUUID().slice(0, 8)}`,
    label: "Instruction",
    url: "https://",
  };
}

export function WorkflowRouteInstructionsField({
  draft,
  routeId,
  links,
  onDraftChange,
  readOnly = false,
  inspectorHeader = false,
  className,
}: {
  draft: WorkflowDraft;
  routeId: string;
  links: WorkflowExternalLink[];
  onDraftChange: (draft: WorkflowDraft) => void;
  readOnly?: boolean;
  inspectorHeader?: boolean;
  className?: string;
}) {
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);

  function patchRoute(patch: Parameters<typeof updateRouteBlock>[2]) {
    onDraftChange(updateRouteBlock(draft, routeId, patch));
  }

  function updateLink(linkId: string, patch: Partial<WorkflowExternalLink>) {
    patchRoute({
      links: links.map((link) =>
        link.id === linkId ? { ...link, ...patch } : link,
      ),
    });
  }

  return (
    <div className={cn(inspectorHeader ? undefined : "space-y-3 px-6", className)}>
      {inspectorHeader ? (
        <WorkflowInspectorSheetHeader
          title="Instruction"
          kind="instruction"
          description="Runbooks and reference links the agent reads before choosing an outlet."
          bordered={false}
        />
      ) : (
        <div className="space-y-1">
          <Label className="text-sm font-medium">Instruction</Label>
          <p className="text-xs text-muted-foreground">
            Runbooks and reference links for outlet selection.
          </p>
        </div>
      )}

      <div className={cn("space-y-3", inspectorHeader && "px-4 py-4")}>
        <div className="overflow-hidden rounded-lg border bg-card">
          {links.length > 0 ? (
            <ul className="divide-y">
              {links.map((link) => {
                const expanded = expandedLinkId === link.id;
                return (
                  <ExpandableListItem
                    key={link.id}
                    icon={BookOpenIcon}
                    title={link.label?.trim() || "Instruction"}
                    description={link.url}
                    testId={`route-instruction-row-${link.id}`}
                    expandedTestId={`route-instruction-expanded-${link.id}`}
                    expanded={expanded}
                    onExpandedChange={(next) =>
                      setExpandedLinkId(next ? link.id : null)
                    }
                    removeLabel="Remove instruction"
                    onRemove={
                      readOnly
                        ? undefined
                        : () => {
                            onDraftChange(removeRouteLink(draft, routeId, link.id));
                            if (expandedLinkId === link.id) {
                              setExpandedLinkId(null);
                            }
                          }
                    }
                  >
                    <fieldset disabled={readOnly} className="min-w-0 space-y-2 border-0 p-0">
                      <Input
                        value={link.label ?? ""}
                        onChange={(event) =>
                          updateLink(link.id, { label: event.target.value })
                        }
                        placeholder="Label"
                      />
                      <Input
                        value={link.url}
                        onChange={(event) =>
                          updateLink(link.id, { url: event.target.value })
                        }
                        placeholder="https://…"
                      />
                      <Select
                        value={link.source ?? "generic"}
                        onValueChange={(value) => {
                          if (!value) return;
                          updateLink(link.id, {
                            source: value as NonNullable<
                              WorkflowExternalLink["source"]
                            >,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notion">notion</SelectItem>
                          <SelectItem value="gdrive">gdrive</SelectItem>
                          <SelectItem value="gmail">gmail</SelectItem>
                          <SelectItem value="generic">generic</SelectItem>
                        </SelectContent>
                      </Select>
                    </fieldset>
                  </ExpandableListItem>
                );
              })}
            </ul>
          ) : (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              None added yet.
            </p>
          )}

          {!readOnly ? (
            <div className="border-t px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                data-testid="add-route-instruction"
                onClick={() => {
                  const link = defaultInstruction();
                  onDraftChange(addRouteLink(draft, routeId, link));
                  setExpandedLinkId(link.id);
                }}
              >
                <PlusIcon className="size-3.5" />
                Add instruction
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
