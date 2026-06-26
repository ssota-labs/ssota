"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
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

function readMaxPanelWidth(panel: HTMLElement): number {
  const parent = panel.offsetParent;
  if (parent instanceof HTMLElement) {
    return Math.max(parent.clientWidth - 8, panel.getBoundingClientRect().width);
  }
  return window.innerWidth * 0.95;
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
  const panelRef = useRef<HTMLDivElement>(null);
  const minWidthPxRef = useRef<number | null>(null);
  const [widthPx, setWidthPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    minWidthPxRef.current = panel.getBoundingClientRect().width;
    setWidthPx(null);
  }, [node.id, sheetSize]);

  const beginResize = (startX: number) => {
    const panel = panelRef.current;
    if (!panel) return;

    const startWidth = panel.getBoundingClientRect().width;
    if (minWidthPxRef.current === null) {
      minWidthPxRef.current = startWidth;
    }
    const minWidth = minWidthPxRef.current;
    const maxWidth = readMaxPanelWidth(panel);

    const onMove = (moveEvent: MouseEvent | globalThis.PointerEvent) => {
      const delta = startX - moveEvent.clientX;
      const nextWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startWidth + delta),
      );
      setWidthPx(nextWidth);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    beginResize(event.clientX);
  };

  const handleResizeMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    beginResize(event.clientX);
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="document-sheet-title"
      data-testid="document-sheet-panel"
      style={widthPx === null ? undefined : { width: widthPx }}
      className={cn(
        "border-border/60 absolute inset-y-2 right-0 z-20 flex flex-col overflow-hidden rounded-xl border",
        "bg-background/50 shadow-lg shadow-black/5",
        "supports-backdrop-filter:backdrop-blur-xl supports-backdrop-filter:backdrop-saturate-150",
        "supports-backdrop-filter:bg-background/40",
        "animate-in slide-in-from-right-4 fade-in duration-200",
        widthPx === null ? panelWidthClass[sheetSize] : "min-w-0",
      )}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        data-testid="document-sheet-resize-handle"
        className="hover:bg-primary/20 active:bg-primary/30 absolute top-0 bottom-0 left-0 z-30 w-1.5 -translate-x-1/2 cursor-col-resize touch-none"
        onMouseDown={handleResizeMouseDown}
        onPointerDown={handleResizePointerDown}
      />
      <header className="border-border/50 bg-background/20 supports-backdrop-filter:backdrop-blur-md flex shrink-0 items-start gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {status ? (
            <DocumentStatusBadge status={status} className="mt-1 shrink-0" />
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            <h2
              id="document-sheet-title"
              className="text-base font-semibold leading-snug"
            >
              {node.title}
            </h2>
            {subtitle ? (
              <p className="text-muted-foreground text-sm">{subtitle}</p>
            ) : null}
          </div>
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
