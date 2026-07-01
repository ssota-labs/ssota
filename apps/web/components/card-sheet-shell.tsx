"use client";

import {
  createContext,
  use,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";

export type CardSheetSize =
  | "default"
  | "half"
  | "inspector"
  | "wide"
  | "full"
  | "viewport";

const panelWidthClass: Record<Exclude<CardSheetSize, "viewport">, string> = {
  default: "w-[min(24rem,100%)]",
  half: "w-1/2 min-w-[18rem]",
  inspector: "w-[min(42%,560px)] min-w-[18rem]",
  wide: "w-2/3 min-w-[20rem] max-w-[48rem]",
  full: "w-full",
};

const isViewportSheet = (sheetSize: CardSheetSize) => sheetSize === "viewport";

function readMaxPanelWidth(panel: HTMLElement): number {
  const parent = panel.offsetParent;
  if (parent instanceof HTMLElement) {
    return Math.max(parent.clientWidth - 8, panel.getBoundingClientRect().width);
  }
  return window.innerWidth * 0.95;
}

type CardSheetShellContextValue = {
  onClose: () => void;
  titleId: string;
  closeButtonTestId: string;
  resizeHandleTestId: string;
};

const CardSheetShellContext = createContext<CardSheetShellContextValue | null>(
  null,
);

function useCardSheetShell() {
  const value = use(CardSheetShellContext);
  if (!value) {
    throw new Error("CardSheetShell subcomponents must be used within CardSheetShell.Root");
  }
  return value;
}

type RootProps = {
  open?: boolean;
  sheetSize?: CardSheetSize;
  /** Edge-to-edge vertically (no inset-y-2). */
  fullHeight?: boolean;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  titleId?: string;
  closeButtonTestId?: string;
  resizeHandleTestId?: string;
};

function Root({
  open = true,
  sheetSize = "inspector",
  fullHeight = false,
  onClose,
  children,
  testId = "card-sheet-shell",
  titleId: titleIdProp,
  closeButtonTestId = "card-sheet-close",
  resizeHandleTestId = "card-sheet-resize-handle",
}: RootProps) {
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
    <CardSheetShellContext
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
          "flex flex-col overflow-hidden border",
          viewport
            ? "fixed inset-0 z-50 rounded-none border-border/60"
            : cn(
                "border-border/60 absolute z-20",
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
    </CardSheetShellContext>
  );

  if (viewport && typeof document !== "undefined") {
    return createPortal(panel, document.body);
  }

  return panel;
}

function Header({
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
        "border-border/50 bg-background/20 supports-backdrop-filter:backdrop-blur-md flex shrink-0 gap-2 border-b px-4 py-3",
        align === "start" ? "items-start" : "items-center",
        className,
      )}
    >
      {children}
    </header>
  );
}

function HeaderMain({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 flex-1 space-y-1", className)}>{children}</div>;
}

function HeaderPrefix({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("shrink-0", className)}>{children}</div>;
}

function HeaderAction({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("shrink-0", className)}>{children}</div>;
}

function Title({
  children,
  id,
  className,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  const { titleId } = useCardSheetShell();
  return (
    <h2
      id={id ?? titleId}
      className={cn("text-base font-semibold leading-snug", className)}
    >
      {children}
    </h2>
  );
}

function Subtitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-muted-foreground text-sm", className)}>{children}</p>;
}

function Close({ className, testId }: { className?: string; testId?: string }) {
  const { onClose, closeButtonTestId } = useCardSheetShell();
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

function Body({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-3", className)}>
      {children}
    </div>
  );
}

function Footer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer className={cn("border-border/50 shrink-0 border-t px-4 py-3", className)}>
      {children}
    </footer>
  );
}

/** Convenience wrapper preserving the legacy CardSheetPanel prop API. */
export type CardSheetPanelProps = {
  title: string;
  subtitle?: string;
  headerPrefix?: ReactNode;
  headerAction?: ReactNode;
  sheetSize?: CardSheetSize;
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

export function CardSheetPanel({
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
  testId = "card-sheet-panel",
  titleId,
  closeButtonTestId,
  resizeHandleTestId,
}: CardSheetPanelProps) {
  return (
    <Root
      open={open}
      sheetSize={sheetSize}
      fullHeight={fullHeight}
      onClose={onClose}
      testId={testId}
      titleId={titleId}
      closeButtonTestId={closeButtonTestId}
      resizeHandleTestId={resizeHandleTestId}
    >
      <Header align={headerPrefix ? "start" : "center"}>
        {headerPrefix ? <HeaderPrefix>{headerPrefix}</HeaderPrefix> : null}
        <HeaderMain>
          <Title>{title}</Title>
          {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
        </HeaderMain>
        {headerAction ? <HeaderAction>{headerAction}</HeaderAction> : null}
        <Close />
      </Header>
      <Body>{children}</Body>
      {footer ? <Footer>{footer}</Footer> : null}
    </Root>
  );
}

export const CardSheetShell = {
  Root,
  Header,
  HeaderMain,
  HeaderPrefix,
  HeaderAction,
  Title,
  Subtitle,
  Close,
  Body,
  Footer,
};
