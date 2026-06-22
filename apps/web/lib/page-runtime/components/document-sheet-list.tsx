"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CaretRightIcon, XIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
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
  /** Optional page-style heading rendered inside the overlay region (above the list). */
  sectionTitle?: string;
  sectionSubtitle?: string;
  field?: string;
  subtitleField?: string;
  statusField?: string;
  editable?: boolean;
  action?: string;
  sheetSize?: SheetSize;
};

const panelWidthClass: Record<SheetSize, string> = {
  default: "w-[min(24rem,92%)]",
  half: "w-1/2 min-w-[18rem] max-w-[50%]",
  inspector: "w-[min(42%,560px)] min-w-[18rem]",
  wide: "w-2/3 min-w-[20rem] max-w-[48rem]",
  full: "w-full",
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
      className="relative min-h-[28rem] w-full"
      data-testid="document-sheet-list"
    >
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
      </div>

      {open && activeNode ? (
        <>
          <button
            type="button"
            aria-label="Close document panel"
            className="absolute inset-0 z-10 bg-black/40"
            data-testid="document-sheet-backdrop"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-sheet-title"
            data-testid="document-sheet-panel"
            className={cn(
              "bg-background border-border absolute inset-y-0 right-0 z-20 flex flex-col border-l shadow-xl",
              "animate-in slide-in-from-right duration-200",
              panelWidthClass[sheetSize],
            )}
          >
            <header className="border-border flex shrink-0 items-start gap-3 border-b px-4 py-4 md:px-6">
              <div className="min-w-0 flex-1 space-y-1">
                <h2
                  id="document-sheet-title"
                  className="text-base font-semibold leading-snug"
                >
                  {activeNode.title}
                </h2>
                {readField(activeNode, subtitleField) ? (
                  <p className="text-muted-foreground text-sm">
                    {readField(activeNode, subtitleField)}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                data-testid="document-sheet-close"
                onClick={close}
              >
                <XIcon className="size-4" />
              </Button>
            </header>
            <div
              className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6"
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
          </div>
        </>
      ) : null}
    </div>
  );
}
