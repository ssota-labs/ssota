"use client";

import type { StudioNode } from "@ssota/contracts/catalog";
import { Input } from "@ssota/ui/components/ui/input";
import { Separator } from "@ssota/ui/components/ui/separator";
import { Label } from "@ssota/ui/components/ui/label";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { findStudioNode } from "@/lib/design-studio/tree-utils";
import { ClassnameInspector } from "./inspector/classname-inspector";
import { LayerNodeIcon } from "./layer-node-icon";

type InspectorPanelProps = {
  root: StudioNode;
  selectedId: string | null;
  onPatch: (nodeId: string, patch: Record<string, unknown>) => void;
};

function selectedTitle(node: StudioNode): string {
  switch (node.kind) {
    case "element":
      return node.tag;
    case "component":
      return node.ref.slug;
    case "text":
      return "text";
    case "fragment":
      return "fragment";
  }
}

export function InspectorPanel({
  root,
  selectedId,
  onPatch,
}: InspectorPanelProps) {
  const selected = selectedId ? findStudioNode(root, selectedId) : null;

  if (!selected) {
    return (
      <div className="flex h-full min-h-0 flex-col border-l bg-card">
        <div className="border-b px-3 py-2 text-sm font-medium">Inspector</div>
        <p className="p-4 text-sm text-muted-foreground">
          Select a layer to edit its properties.
        </p>
      </div>
    );
  }

  const className =
    selected.kind === "element" || selected.kind === "component"
      ? (selected.className ?? "")
      : "";

  return (
    <div className="flex h-full min-h-0 flex-col border-l bg-card">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <LayerNodeIcon node={selected} className="text-foreground" />
        <span className="text-sm font-medium">{selectedTitle(selected)}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <div className="space-y-4 px-4 pt-4 pb-3">
          <div className="space-y-2">
            <Label htmlFor="studio-node-id">Node ID</Label>
            <Input id="studio-node-id" value={selected.id} readOnly />
          </div>

          {selected.kind === "element" ? (
            <div className="space-y-2">
              <Label htmlFor="studio-tag">Tag</Label>
              <Input
                id="studio-tag"
                value={selected.tag}
                onChange={(event) =>
                  onPatch(selected.id, { tag: event.target.value })
                }
              />
            </div>
          ) : null}

          {selected.kind === "text" ? (
            <div className="space-y-2">
              <Label htmlFor="studio-text">Text</Label>
              <Textarea
                id="studio-text"
                value={selected.text}
                onChange={(event) =>
                  onPatch(selected.id, { text: event.target.value })
                }
                rows={4}
              />
            </div>
          ) : null}

          {selected.kind === "component" ? (
            <div className="space-y-2">
              <Label>Ref</Label>
              <Input value={selected.ref.slug} readOnly />
            </div>
          ) : null}
        </div>

        {selected.kind === "element" || selected.kind === "component" ? (
          <>
            <Separator />
            <ClassnameInspector
              className={className}
              onChange={(nextClassName) =>
                onPatch(selected.id, { className: nextClassName })
              }
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
