"use client";

import { useEffect, useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { useAction } from "../context";
import type { RenderNode } from "../types";
import { DocumentStatusBadge } from "./document-status-badge";
import { DocumentSheetPanel, type SheetSize } from "./document-sheet-panel";
import { readNodeField } from "./roadmap-doc-card";

export type DocumentSheetListProps = {
  nodes: RenderNode[];
  title?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  field?: string;
  subtitleField?: string;
  statusField?: string;
  editable?: boolean;
  action?: string;
  sheetSize?: SheetSize;
};

export function DocumentSheetListEl({
  nodes,
  title,
  sectionTitle,
  sectionSubtitle,
  field = "content",
  subtitleField = "summary",
  statusField = "lifecycleStatus",
  editable = false,
  action,
  sheetSize = "half",
}: DocumentSheetListProps) {
  const onAction = useAction();
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeNode = nodes.find((node) => node.id === activeId) ?? null;
  const open = activeNode !== null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setActiveId(null);

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden p-4 md:p-6"
      data-testid="document-sheet-list"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3">
        {sectionTitle ? (
          <header className="space-y-1 border-b pb-3">
            <h2 className="text-lg font-semibold">{sectionTitle}</h2>
            {sectionSubtitle ? (
              <p className="text-muted-foreground text-sm">{sectionSubtitle}</p>
            ) : null}
          </header>
        ) : null}

        {title ? <h3 className="text-sm font-medium">{title}</h3> : null}

        <div className="border-border divide-border divide-y overflow-hidden rounded-lg border">
          {nodes.map((node) => {
            const subtitle = readNodeField(node, subtitleField);
            const status = readNodeField(node, statusField);
            return (
              <button
                key={node.id}
                type="button"
                data-testid={`document-sheet-list-item-${node.id}`}
                className={cn(
                  "hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  activeId === node.id && "bg-muted/30",
                )}
                onClick={() => setActiveId(node.id)}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{node.title}</span>
                    {status ? <DocumentStatusBadge status={status} /> : null}
                  </div>
                  {subtitle ? (
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                <CaretRightIcon
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden
                />
              </button>
            );
          })}
          {nodes.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              No documents
            </p>
          ) : null}
        </div>
        </div>
      </div>

      {open && activeNode ? (
        <DocumentSheetPanel
          node={activeNode}
          subtitle={readNodeField(activeNode, subtitleField)}
          status={readNodeField(activeNode, statusField)}
          field={field}
          editable={editable}
          sheetSize={sheetSize}
          onClose={close}
          onSave={(blocks) => {
            if (onAction && action) {
              void onAction(action, {
                nodeId: activeNode.id,
                doc: blocks,
              });
            }
          }}
        />
      ) : null}
    </div>
  );
}
