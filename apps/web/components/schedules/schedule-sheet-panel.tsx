"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";
import type { SheetSize } from "@/lib/page-runtime/components/document-sheet-panel";

const panelWidthClass: Record<SheetSize, string> = {
  default: "w-[min(24rem,100%)]",
  half: "w-1/2 min-w-[18rem]",
  inspector: "w-[min(42%,560px)] min-w-[18rem]",
  wide: "w-2/3 min-w-[20rem] max-w-[48rem]",
  full: "w-full",
};

type ScheduleSheetPanelProps = {
  title: string;
  subtitle?: string;
  sheetSize?: SheetSize;
  /** Fill the parent height (no vertical inset). Default matches document card sheets. */
  fullHeight?: boolean;
  testId?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

function readMaxPanelWidth(panel: HTMLElement): number {
  const parent = panel.offsetParent;
  if (parent instanceof HTMLElement) {
    return Math.max(parent.clientWidth - 8, panel.getBoundingClientRect().width);
  }
  return window.innerWidth * 0.95;
}

export function ScheduleSheetPanel({
  title,
  subtitle,
  sheetSize = "half",
  fullHeight = false,
  testId = "schedule-sheet-panel",
  onClose,
  children,
  footer,
}: ScheduleSheetPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const minWidthPxRef = useRef<number | null>(null);
  const [widthPx, setWidthPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    minWidthPxRef.current = panel.getBoundingClientRect().width;
    setWidthPx(null);
  }, [title, sheetSize]);

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
      aria-labelledby="schedule-sheet-title"
      data-testid={testId}
      style={widthPx === null ? undefined : { width: widthPx }}
      className={cn(
        "border-border/60 absolute z-20 flex flex-col overflow-hidden border",
        fullHeight
          ? "inset-y-0 right-0 h-full rounded-l-xl border-y-0 border-r-0"
          : "inset-y-2 right-2 rounded-xl",
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
        data-testid="schedule-sheet-resize-handle"
        className="hover:bg-primary/20 active:bg-primary/30 absolute top-0 bottom-0 left-0 z-30 w-1.5 -translate-x-1/2 cursor-col-resize touch-none"
        onMouseDown={handleResizeMouseDown}
        onPointerDown={handleResizePointerDown}
      />
      <header className="border-border/50 bg-background/20 supports-backdrop-filter:backdrop-blur-md flex shrink-0 items-start gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h2
            id="schedule-sheet-title"
            className="text-base font-semibold leading-snug"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Close"
          data-testid="schedule-sheet-close"
          onClick={onClose}
        >
          <XIcon className="size-4" />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
      {footer ? (
        <footer className="border-border/50 shrink-0 border-t px-4 py-3">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
