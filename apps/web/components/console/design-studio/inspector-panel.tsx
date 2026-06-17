"use client";

import type { StudioNode } from "@ssota/contracts/catalog";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { findStudioNode } from "@/lib/design-studio/tree-utils";

type InspectorPanelProps = {
  root: StudioNode;
  selectedId: string | null;
  onPatch: (nodeId: string, patch: Record<string, unknown>) => void;
};

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

  return (
    <div className="flex h-full min-h-0 flex-col border-l bg-card">
      <div className="border-b px-3 py-2 text-sm font-medium">Inspector</div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        <div className="space-y-2">
          <Label htmlFor="studio-node-id">Node ID</Label>
          <Input id="studio-node-id" value={selected.id} readOnly />
        </div>

        {selected.kind === "element" ? (
          <>
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
            <div className="space-y-2">
              <Label htmlFor="studio-class">className</Label>
              <Textarea
                id="studio-class"
                value={selected.className ?? ""}
                onChange={(event) =>
                  onPatch(selected.id, { className: event.target.value })
                }
                rows={4}
              />
            </div>
          </>
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
          <>
            <div className="space-y-2">
              <Label>Ref</Label>
              <Input value={selected.ref.slug} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studio-component-class">className</Label>
              <Textarea
                id="studio-component-class"
                value={selected.className ?? ""}
                onChange={(event) =>
                  onPatch(selected.id, { className: event.target.value })
                }
                rows={3}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
