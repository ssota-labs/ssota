"use client";

import {
  createContext,
  use,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CaretRightIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";

export type CardListSheetSize =
  | "default"
  | "half"
  | "inspector"
  | "wide"
  | "full"
  | "viewport";

const panelWidthClass: Record<Exclude<CardListSheetSize, "viewport">, string> = {
  default: "w-[min(24rem,100%)]",
  half: "w-1/2 min-w-[18rem]",
  inspector: "w-[min(42%,560px)] min-w-[18rem]",
  wide: "w-2/3 min-w-[20rem] max-w-[48rem]",
  full: "w-full",
};

const isViewportSheet = (sheetSize: CardListSheetSize) => sheetSize === "viewport";

function readMaxPanelWidth(panel: HTMLElement): number {
  const parent = panel.offsetParent;
  if (parent instanceof HTMLElement) {
    return Math.max(parent.clientWidth - 8, panel.getBoundingClientRect().width);
  }
  return window.innerWidth * 0.95;
}

// --- List (card rows trigger) ---

type CardListSheetListContextValue = {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
};

const CardListSheetListContext = createContext<CardListSheetListContextValue | null>(
  null,
);

function useCardListSheetList() {
  const value = use(CardListSheetListContext);
  if (!value) {
    throw new Error("CardListSheet list parts must be used within CardListSheet.Root");
  }
  return value;
}

type ListRootProps = {
  activeId: string | null;
  onActiveIdChange: (id: string | null) => void;
  children: ReactNode;
  className?: string;
  testId?: string;
  dismissOnEscape?: boolean;
};

function ListRoot({
  activeId,
  onActiveIdChange,
  children,
  className,
  testId,
  dismissOnEscape = true,
}: ListRootProps) {
  const open = activeId !== null;

  useEffect(() => {
    if (!dismissOnEscape || !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onActiveIdChange(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismissOnEscape, open, onActiveIdChange]);

  return (
    <CardListSheetListContext value={{ activeId, setActiveId: onActiveIdChange }}>
      <div
        className={cn("relative flex min-h-0 flex-1 flex-col", className)}
        data-testid={testId}
      >
        {children}
      </div>
    </CardListSheetListContext>
  );
}

function List({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-lg border bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

type RowProps = {
  id: string;
  children: ReactNode;
  className?: string;
  testId?: string;
  onClick?: () => void;
};

function Row({ id, children, className, testId, onClick }: RowProps) {
  const { activeId, setActiveId } = useCardListSheetList();
  const active = activeId === id;

  return (
    <button
      type="button"
      data-testid={testId}
      className={cn(
        "hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        active && "bg-muted/30",
        className,
      )}
      onClick={() => {
        setActiveId(id);
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

function RowCaret({ className }: { className?: string }) {
  return (
    <CaretRightIcon
      className={cn("text-muted-foreground size-4 shrink-0", className)}
      aria-hidden
    />
  );
}

function Empty({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground px-4 py-6 text-center text-sm",
        className,
      )}
    >
      {children}
    </p>
  );
}

// --- Sheet (card docked panel) ---

type CardListSheetSheetContextValue = {
  onClose: () => void;
  titleId: string;
  closeButtonTestId: string;
  resizeHandleTestId: string;
};

const CardListSheetSheetContext = createContext<CardListSheetSheetContextValue | null>(
  null,
);

function useCardListSheetSheet() {
  const value = use(CardListSheetSheetContext);
  if (!value) {
    throw new Error(
      "CardListSheet.Sheet parts must be used within CardListSheet.Sheet.Root",
    );
  }
  return value;
}

type SheetRootProps = {
  open?: boolean;
  sheetSize?: CardListSheetSize;
  fullHeight?: boolean;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  titleId?: string;
  closeButtonTestId?: string;
  resizeHandleTestId?: string;
};

function SheetRoot({
  open = true,
  sheetSize = "inspector",
  fullHeight = false,
  onClose,
  children,
  testId = "card-list-sheet-panel",
  titleId: titleIdProp,
  closeButtonTestId = "card-list-sheet-close",
  resizeHandleTestId = "card-list-sheet-resize-handle",
}: SheetRootProps) {
  const generatedTitleId = useId();
  const titleId = titleIdProp ?? generatedTitleId;
  const panelRef = useRef<HTMLDivElement>(null);
  const minWidthPxRef = useRef<number | null>(null);
  const [widthPx, setWidthPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (isViewportSheet(sheetSize)) return;
    const panel = panelRef.current;
    if (!panel) return;

    minWidthPxRef.current = panel.getBoundingClientRect().width;
    setWidthPx(null);
  }, [sheetSize, open]);

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
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
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

  if (!open) return null;

  const viewport = isViewportSheet(sheetSize);

  const panel = (
    <CardListSheetSheetContext
      value={{ onClose, titleId, closeButtonTestId, resizeHandleTestId }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={viewport}
        aria-labelledby={titleId}
        data-testid={testId}
        style={viewport || widthPx === null ? undefined : { width: widthPx }}
        className={cn(
          "flex flex-col overflow-hidden border-[1.5px] border-border",
          viewport
            ? "fixed inset-0 z-50 rounded-none"
            : cn(
                "absolute z-20",
                fullHeight
                  ? "inset-y-0 right-0 h-full rounded-l-xl border-y-0 border-r-0"
                  : "inset-y-2 right-2 rounded-xl",
                widthPx === null ? panelWidthClass[sheetSize] : "min-w-0",
              ),
          "bg-background/50 shadow-lg shadow-black/5",
          "supports-backdrop-filter:backdrop-blur-xl supports-backdrop-filter:backdrop-saturate-150",
          "supports-backdrop-filter:bg-background/40",
          "animate-in slide-in-from-right-4 fade-in duration-200",
        )}
      >
        {!viewport ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            data-testid={resizeHandleTestId}
            className="hover:bg-primary/20 active:bg-primary/30 absolute top-0 bottom-0 left-0 z-30 w-1.5 -translate-x-1/2 cursor-col-resize touch-none"
            onMouseDown={handleResizeMouseDown}
            onPointerDown={handleResizePointerDown}
          />
        ) : null}
        {children}
      </div>
    </CardListSheetSheetContext>
  );

  if (viewport && typeof document !== "undefined") {
    return createPortal(panel, document.body);
  }

  return panel;
}

function SheetHeader({
  children,
  className,
  align = "center",
}: {
  children: ReactNode;
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <header
      className={cn(
        "border-border bg-background/20 supports-backdrop-filter:backdrop-blur-md flex shrink-0 gap-2 border-b px-4 py-3",
        align === "start" ? "items-start" : "items-center",
        className,
      )}
    >
      {children}
    </header>
  );
}

function SheetHeaderMain({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("min-w-0 flex-1 space-y-1", className)}>{children}</div>;
}

function SheetHeaderPrefix({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("shrink-0", className)}>{children}</div>;
}

function SheetHeaderAction({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("shrink-0", className)}>{children}</div>;
}

function SheetTitle({
  children,
  id,
  className,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  const { titleId } = useCardListSheetSheet();
  return (
    <h2
      id={id ?? titleId}
      className={cn("text-base font-semibold leading-snug", className)}
    >
      {children}
    </h2>
  );
}

function SheetSubtitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("text-muted-foreground text-sm", className)}>{children}</p>;
}

function SheetClose({ className, testId }: { className?: string; testId?: string }) {
  const { onClose, closeButtonTestId } = useCardListSheetSheet();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label="Close"
      data-testid={testId ?? closeButtonTestId}
      onClick={onClose}
      className={cn("shrink-0", className)}
    >
      <XIcon className="size-4" />
    </Button>
  );
}

function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-3", className)}>
      {children}
    </div>
  );
}

function SheetFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <footer className={cn("border-border shrink-0 border-t px-4 py-3", className)}>
      {children}
    </footer>
  );
}

export type CardListSheetPanelProps = {
  title: string;
  subtitle?: string;
  headerPrefix?: ReactNode;
  headerAction?: ReactNode;
  sheetSize?: CardListSheetSize;
  fullHeight?: boolean;
  open?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  testId?: string;
  titleId?: string;
  closeButtonTestId?: string;
  resizeHandleTestId?: string;
};

/** Title + body shortcut over CardListSheet.Sheet compound parts. */
export function CardListSheetPanel({
  title,
  subtitle,
  headerPrefix,
  headerAction,
  sheetSize = "inspector",
  fullHeight,
  open = true,
  onClose,
  footer,
  children,
  testId,
  titleId,
  closeButtonTestId,
  resizeHandleTestId,
}: CardListSheetPanelProps) {
  return (
    <SheetRoot
      open={open}
      sheetSize={sheetSize}
      fullHeight={fullHeight}
      onClose={onClose}
      testId={testId}
      titleId={titleId}
      closeButtonTestId={closeButtonTestId}
      resizeHandleTestId={resizeHandleTestId}
    >
      <SheetHeader align={headerPrefix ? "start" : "center"}>
        {headerPrefix ? <SheetHeaderPrefix>{headerPrefix}</SheetHeaderPrefix> : null}
        <SheetHeaderMain>
          <SheetTitle>{title}</SheetTitle>
          {subtitle ? <SheetSubtitle>{subtitle}</SheetSubtitle> : null}
        </SheetHeaderMain>
        {headerAction ? <SheetHeaderAction>{headerAction}</SheetHeaderAction> : null}
        <SheetClose />
      </SheetHeader>
      <SheetBody>{children}</SheetBody>
      {footer ? <SheetFooter>{footer}</SheetFooter> : null}
    </SheetRoot>
  );
}

export const CardListSheet = {
  Root: ListRoot,
  List,
  Row,
  RowCaret,
  Empty,
  Sheet: {
    Root: SheetRoot,
    Header: SheetHeader,
    HeaderMain: SheetHeaderMain,
    HeaderPrefix: SheetHeaderPrefix,
    HeaderAction: SheetHeaderAction,
    Title: SheetTitle,
    Subtitle: SheetSubtitle,
    Close: SheetClose,
    Body: SheetBody,
    Footer: SheetFooter,
  },
};
