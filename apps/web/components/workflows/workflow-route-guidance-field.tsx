"use client";

import { useState } from "react";
import { LinkIcon, PlusIcon } from "@phosphor-icons/react";
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
  ExpandableListSection,
} from "@ssota/ui/components/ui/expandable-list-section";
import {
  addRouteLink,
  removeRouteLink,
  updateRouteBlock,
  type WorkflowDraft,
} from "@/lib/workflows/workflow-draft";
import { WorkflowInspectorSheetHeader } from "@/components/workflows/workflow-inspector-sheet-header";

function defaultLink(): WorkflowExternalLink {
  return {
    id: `link_${crypto.randomUUID().slice(0, 8)}`,
    label: "Link",
    url: "https://",
  };
}

export function WorkflowRouteGuidanceField({
  draft,
  routeId,
  routingInstructionUrl,
  links,
  onDraftChange,
  readOnly = false,
  inspectorHeader = false,
  className,
}: {
  draft: WorkflowDraft;
  routeId: string;
  routingInstructionUrl?: string | null;
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
          title="Guidance"
          kind="guidance"
          description="Routing instruction and reference links the agent reads before choosing an outlet."
        />
      ) : (
        <div className="space-y-1">
          <Label className="text-sm font-medium">Guidance</Label>
          <p className="text-xs text-muted-foreground">
            Routing instruction and reference links for outlet selection.
          </p>
        </div>
      )}

      <div className={cn("space-y-4", inspectorHeader && "px-4 py-4")}>
        <div className="space-y-2">
          <Label htmlFor="route-routing-url" className="text-sm font-medium">
            Routing instruction URL
          </Label>
          <Input
            id="route-routing-url"
            value={routingInstructionUrl ?? ""}
            disabled={readOnly}
            onChange={(event) =>
              patchRoute({
                routingInstructionUrl: event.target.value.trim()
                  ? event.target.value
                  : null,
              })
            }
            placeholder="https://notion.so/…"
          />
          <p className="text-xs text-muted-foreground">
            Primary runbook the agent fetches when deciding which outlet to take.
          </p>
        </div>

        <ExpandableListSection
          title="External links"
          description="Supplementary references alongside the routing instruction."
          addLabel="Add link"
          addTestId="add-route-link"
          hasItems={links.length > 0}
          onAdd={
            readOnly
              ? undefined
              : () => {
                  const link = defaultLink();
                  onDraftChange(addRouteLink(draft, routeId, link));
                  setExpandedLinkId(link.id);
                }
          }
        >
          {links.map((link) => {
            const expanded = expandedLinkId === link.id;
            return (
              <ExpandableListItem
                key={link.id}
                icon={LinkIcon}
                title={link.label?.trim() || "Untitled link"}
                description={link.url}
                testId={`route-link-row-${link.id}`}
                expandedTestId={`route-link-expanded-${link.id}`}
                expanded={expanded}
                onExpandedChange={(next) => setExpandedLinkId(next ? link.id : null)}
                removeLabel="Remove link"
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
                        source: value as NonNullable<WorkflowExternalLink["source"]>,
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
        </ExpandableListSection>
      </div>
    </div>
  );
}
