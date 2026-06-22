"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import { cn } from "@ssota/ui/lib/utils";
import { useAction } from "../context";
import type { RenderNode } from "../types";

const DocumentViewEl = dynamic(
  () => import("../catalog-document").then((m) => m.DocumentViewEl),
  { ssr: false },
);
const DocumentEditorEl = dynamic(
  () => import("../catalog-document").then((m) => m.DocumentEditorEl),
  { ssr: false },
);

type SheetSize = "default" | "half" | "inspector" | "wide" | "full";

export type DocumentSheetListProps = {
  nodes: RenderNode[];
  title?: string;
  field?: string;
  subtitleField?: string;
  statusField?: string;
  editable?: boolean;
  action?: string;
  sheetSize?: SheetSize;
};

function readField(node: RenderNode, key: string | undefined): string {
  if (!key) return "";
  if (key === "title") return node.title;
  const value = node.properties[key];
  return typeof value === "string" ? value : "";
}

function readContent(node: RenderNode, field: string): unknown {
  return node.properties[field];
}

export function DocumentSheetListEl({
  nodes,
  title,
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

  return (
    <div className="space-y-3" data-testid="document-sheet-list">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}

      <div className="border-border divide-border divide-y overflow-hidden rounded-lg border">
        {nodes.map((node) => {
          const subtitle = readField(node, subtitleField);
          const status = readField(node, statusField);
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
                  {status ? (
                    <Badge variant="outline" className="text-[10px]">
                      {status}
                    </Badge>
                  ) : null}
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

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setActiveId(null);
        }}
      >
        <SheetContent
          size={sheetSize}
          className="flex flex-col overflow-hidden p-0"
          data-testid="document-sheet-panel"
        >
          {activeNode ? (
            <>
              <SheetHeader className="border-border shrink-0 border-b px-6 py-4">
                <SheetTitle>{activeNode.title}</SheetTitle>
                {readField(activeNode, subtitleField) ? (
                  <SheetDescription>
                    {readField(activeNode, subtitleField)}
                  </SheetDescription>
                ) : null}
              </SheetHeader>
              <div
                className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
                data-testid="document-sheet-editor"
              >
                {editable ? (
                  <DocumentEditorEl
                    content={readContent(activeNode, field)}
                    onSave={(blocks) => {
                      if (onAction && action) {
                        void onAction(action, {
                          nodeId: activeNode.id,
                          doc: blocks,
                        });
                      }
                    }}
                  />
                ) : (
                  <DocumentViewEl content={readContent(activeNode, field)} />
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
