"use client";

import dynamic from "next/dynamic";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";
import type { RenderNode } from "../types";
import { DocumentStatusBadge } from "./document-status-badge";

const DocumentViewEl = dynamic(
  () => import("../catalog-document").then((m) => m.DocumentViewEl),
  { ssr: false },
);
const DocumentEditorEl = dynamic(
  () => import("../catalog-document").then((m) => m.DocumentEditorEl),
  { ssr: false },
);

type SheetSize = "default" | "half" | "inspector" | "wide" | "full";

const panelWidthClass: Record<SheetSize, string> = {
  default: "w-[min(24rem,100%)]",
  half: "w-1/2 min-w-[18rem]",
  inspector: "w-[min(42%,560px)] min-w-[18rem]",
  wide: "w-2/3 min-w-[20rem] max-w-[48rem]",
  full: "w-full",
};

type DocumentSheetPanelProps = {
  node: RenderNode;
  subtitle?: string;
  status?: string;
  field: string;
  editable: boolean;
  sheetSize: SheetSize;
  onClose: () => void;
  onSave?: (blocks: unknown[]) => void;
};

function readContent(node: RenderNode, field: string): unknown {
  return node.properties[field];
}

export function DocumentSheetPanel({
  node,
  subtitle,
  status,
  field,
  editable,
  sheetSize,
  onClose,
  onSave,
}: DocumentSheetPanelProps) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="document-sheet-title"
      data-testid="document-sheet-panel"
      className={cn(
        "bg-background border-border absolute top-1 right-2 bottom-1 z-20 flex flex-col overflow-hidden rounded-xl border",
        "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)]",
        "animate-in slide-in-from-right-4 fade-in duration-200",
        panelWidthClass[sheetSize],
      )}
    >
      <header className="border-border flex shrink-0 items-start gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="document-sheet-title"
              className="text-base font-semibold leading-snug"
            >
              {node.title}
            </h2>
            {status ? <DocumentStatusBadge status={status} /> : null}
          </div>
          {subtitle ? (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Close"
          data-testid="document-sheet-close"
          onClick={onClose}
        >
          <XIcon className="size-4" />
        </Button>
      </header>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
        data-testid="document-sheet-editor"
      >
        {editable ? (
          <DocumentEditorEl
            compact
            content={readContent(node, field)}
            onSave={(blocks) => onSave?.(blocks)}
          />
        ) : (
          <DocumentViewEl compact content={readContent(node, field)} />
        )}
      </div>
    </div>
  );
}

export type { SheetSize };
