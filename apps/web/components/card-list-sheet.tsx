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
import { CaretRightIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";

/** Docked sheet width as % of CardListSheet.Root (main content column). */
const DOCKED_SHEET_MIN_WIDTH_PX = 24 * 16;
const DOCKED_SHEET_MAX_WIDTH_PX = 640;
/** Inset from container or viewport edges (top/right/bottom). */
const DOCKED_SHEET_INSET_PX = 16;
const DOCKED_SHEET_INSET_CLASS = "top-4 right-4 bottom-4";
/** 60% of the positioning parent — scales with ConsolePageFrame column width. */
const dockedSheetWidthClass = "w-[60%] min-w-[24rem] max-w-[640px]";

function readDockedSheetMaxWidth(
  panel: HTMLElement,
  options?: { viewport?: boolean },
): number {
  const inset = DOCKED_SHEET_INSET_PX * 2;
  const parentCap = options?.viewport
    ? window.innerWidth - inset
    : panel.offsetParent instanceof HTMLElement
      ? panel.offsetParent.clientWidth - inset
      : window.innerWidth * 0.95 - inset;
  return Math.min(DOCKED_SHEET_MAX_WIDTH_PX, parentCap);
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
  /** Close the sheet when the user clicks the list area outside the panel. */
  dismissOnOutsideClick?: boolean;
};

function ListRoot({
  activeId,
  onActiveIdChange,
  children,
  className,
  testId,
  dismissOnEscape = true,
  dismissOnOutsideClick = false,
}: ListRootProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const open = activeId !== null;

  useEffect(() => {
    if (!dismissOnEscape || !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onActiveIdChange(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismissOnEscape, open, onActiveIdChange]);

  useEffect(() => {
    if (!dismissOnOutsideClick || !open) return;

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      const target = event.target;
      if (!root || !(target instanceof Node) || !root.contains(target)) return;

      const sheet = root.querySelector('[role="dialog"]');
      if (sheet?.contains(target)) return;

      if (
        target instanceof Element &&
        target.closest("[data-card-list-sheet-row]")
      ) {
        return;
      }

      onActiveIdChange(null);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [dismissOnOutsideClick, open, onActiveIdChange]);

  return (
    <CardListSheetListContext value={{ activeId, setActiveId: onActiveIdChange }}>
      <div
        ref={rootRef}
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
  /** Sibling controls (e.g. Save) rendered outside the row button to avoid nested buttons. */
  action?: ReactNode;
  className?: string;
  testId?: string;
  onClick?: () => void;
};

const rowButtonClassName =
  "hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors";

function Row({ id, children, action, className, testId, onClick }: RowProps) {
  const { activeId, setActiveId } = useCardListSheetList();
  const active = activeId === id;

  const openRow = () => {
    setActiveId(id);
    onClick?.();
  };

  if (action) {
    return (
      <div
        data-testid={testId}
        data-card-list-sheet-row=""
        className={cn(
          "hover:bg-muted/40 flex w-full items-center gap-3 transition-colors",
          active && "bg-transparent",
          className,
        )}
      >
        <button
          type="button"
          className={cn(rowButtonClassName, "min-w-0 flex-1 border-0 bg-transparent p-0 px-4 py-3")}
          onClick={openRow}
        >
          {children}
        </button>
        <div className="shrink-0 pr-4">{action}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      data-card-list-sheet-row=""
      className={cn(rowButtonClassName, active && "bg-transparent", className)}
      onClick={openRow}
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
  /** Stretch to parent height with inset gaps (content-column docked). */
  fullHeight?: boolean;
  /** Pin to the browser viewport with inset gaps (full-height floating panel). */
  viewport?: boolean;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  titleId?: string;
  closeButtonTestId?: string;
  resizeHandleTestId?: string;
};

function SheetRoot({
  open = true,
  fullHeight = false,
  viewport = false,
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
  const [widthPx, setWidthPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    setWidthPx(null);
  }, [open]);

  const beginResize = (startX: number) => {
    const panel = panelRef.current;
    if (!panel) return;

    const startWidth = panel.getBoundingClientRect().width;
    const minWidth = DOCKED_SHEET_MIN_WIDTH_PX;
    const maxWidth = readDockedSheetMaxWidth(panel, { viewport });

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

  return (
    <CardListSheetSheetContext
      value={{ onClose, titleId, closeButtonTestId, resizeHandleTestId }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby={titleId}
        data-testid={testId}
        style={widthPx === null ? undefined : { width: widthPx }}
        className={cn(
          "flex flex-col overflow-hidden rounded-xl border-[1.5px] border-border",
          viewport
            ? cn(
                "fixed z-50",
                DOCKED_SHEET_INSET_CLASS,
                "max-h-[calc(100dvh-2rem)]",
              )
            : cn(
                "absolute z-20",
                fullHeight
                  ? cn(DOCKED_SHEET_INSET_CLASS, "h-[calc(100%-2rem)]")
                  : "inset-y-2 right-2 max-h-[calc(100%-1rem)]",
              ),
          widthPx === null ? dockedSheetWidthClass : "min-w-0 max-w-[640px]",
          "bg-background/50 shadow-lg shadow-black/5",
          "supports-backdrop-filter:backdrop-blur-xl supports-backdrop-filter:backdrop-saturate-150",
          "supports-backdrop-filter:bg-background/40",
          "animate-in slide-in-from-right-4 fade-in duration-200",
        )}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          data-testid={resizeHandleTestId}
          className="hover:bg-primary/20 active:bg-primary/30 absolute top-0 bottom-0 left-0 z-30 w-1.5 -translate-x-1/2 cursor-col-resize touch-none"
          onMouseDown={handleResizeMouseDown}
          onPointerDown={handleResizePointerDown}
        />
        {children}
      </div>
    </CardListSheetSheetContext>
  );
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

const SHEET_INLINE_TITLE_CLASS =
  "w-full min-w-0 border-0 bg-transparent p-0 text-base font-semibold leading-snug text-foreground shadow-none outline-none ring-0 focus-visible:ring-0";

/** Notion-style title — static heading until clicked, then inline edit. */
export function CardListSheetInlineTitle({
  value,
  onChange,
  onBlur,
  onKeyDown,
  readOnly,
  placeholder = "Untitled",
  "data-testid": testId,
  "aria-label": ariaLabel = "Title",
  className,
}: {
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  placeholder?: string;
  "data-testid"?: string;
  "aria-label"?: string;
  className?: string;
}) {
  const { titleId } = useCardListSheetSheet();
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);

  const titleClass = cn("text-base font-semibold leading-snug", className);
  const displayValue = value.trim() || placeholder;

  useEffect(() => {
    if (!isEditing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [isEditing]);

  function beginEditing() {
    if (readOnly) return;
    setIsEditing(true);
  }

  function endEditing() {
    setIsEditing(false);
  }

  if (readOnly) {
    return (
      <h2 id={titleId} className={titleClass} data-testid={testId}>
        {displayValue}
      </h2>
    );
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        id={titleId}
        data-testid={testId}
        aria-label={ariaLabel}
        className={cn(
          titleClass,
          "block w-full min-w-0 cursor-text truncate rounded-sm text-left",
          !value.trim() && "text-muted-foreground",
        )}
        onClick={beginEditing}
      >
        {displayValue}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      id={titleId}
      value={value}
      onChange={onChange}
      onBlur={(event) => {
        endEditing();
        if (!skipBlurCommitRef.current) {
          onBlur?.(event);
        }
        skipBlurCommitRef.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          skipBlurCommitRef.current = true;
          endEditing();
        }
        onKeyDown?.(event);
      }}
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn(SHEET_INLINE_TITLE_CLASS, className)}
    />
  );
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
  /** Replaces the default SheetTitle (e.g. inline editable title). */
  titleNode?: ReactNode;
  subtitle?: string;
  headerPrefix?: ReactNode;
  headerAction?: ReactNode;
  fullHeight?: boolean;
  viewport?: boolean;
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
  titleNode,
  subtitle,
  headerPrefix,
  headerAction,
  fullHeight,
  viewport,
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
      fullHeight={fullHeight}
      viewport={viewport}
      onClose={onClose}
      testId={testId}
      titleId={titleId}
      closeButtonTestId={closeButtonTestId}
      resizeHandleTestId={resizeHandleTestId}
    >
      <SheetHeader align={headerPrefix ? "start" : "center"}>
        {headerPrefix ? <SheetHeaderPrefix>{headerPrefix}</SheetHeaderPrefix> : null}
        <SheetHeaderMain>
          {titleNode ?? <SheetTitle>{title}</SheetTitle>}
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
