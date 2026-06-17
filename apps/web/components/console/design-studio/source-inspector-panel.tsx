"use client";

import type { SourceRef } from "@/lib/design-studio/source-patch";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { ClassnameInspector } from "./inspector/classname-inspector";

type SourceInspectorPanelProps = {
  selectedId: string | null;
  selectedSourceRef: SourceRef | null;
  className: string;
  onClassNameChange: (nextClassName: string) => void;
  readOnly?: boolean;
  domReferencePx?: number | null;
};

export function SourceInspectorPanel({
  selectedId,
  selectedSourceRef,
  className,
  onClassNameChange,
  readOnly = false,
  domReferencePx,
}: SourceInspectorPanelProps) {
  if (!selectedId || !selectedSourceRef) {
    return (
      <div className="flex h-full min-h-0 flex-col border-l bg-card">
        <div className="border-b px-3 py-2 text-sm font-medium">Inspector</div>
        <p className="p-4 text-sm text-muted-foreground">
          Select a layer in the preview or layers panel to edit styles.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l bg-card">
      <div className="border-b px-3 py-2">
        <p className="text-sm font-medium">{selectedSourceRef.file}</p>
        {selectedSourceRef.loc ? (
          <p className="text-xs text-muted-foreground">{selectedSourceRef.loc}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        <div className="space-y-2">
          <Label htmlFor="studio-node-id">Node ID</Label>
          <Input id="studio-node-id" value={selectedId} readOnly />
        </div>
        {readOnly ? (
          <p className="text-sm text-muted-foreground">
            Could not map this selection back to source. Edit the file manually.
          </p>
        ) : (
          <ClassnameInspector
            className={className}
            onChange={onClassNameChange}
            domReferencePx={domReferencePx}
          />
        )}
      </div>
    </div>
  );
}
