"use client";

import {
  createContext,
  use,
  useEffect,
  type ReactNode,
} from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";

type ListSheetContextValue = {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
};

const ListSheetContext = createContext<ListSheetContextValue | null>(null);

function useListSheet() {
  const value = use(ListSheetContext);
  if (!value) {
    throw new Error("ListSheet subcomponents must be used within ListSheet.Root");
  }
  return value;
}

type RootProps = {
  activeId: string | null;
  onActiveIdChange: (id: string | null) => void;
  children: ReactNode;
  className?: string;
  testId?: string;
  /** Register Escape-to-close while a row is selected. Default true. */
  dismissOnEscape?: boolean;
};

function Root({
  activeId,
  onActiveIdChange,
  children,
  className,
  testId,
  dismissOnEscape = true,
}: RootProps) {
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
    <ListSheetContext value={{ activeId, setActiveId: onActiveIdChange }}>
      <div
        className={cn("relative flex min-h-0 flex-1 flex-col", className)}
        data-testid={testId}
      >
        {children}
      </div>
    </ListSheetContext>
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
  const { activeId, setActiveId } = useListSheet();
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

export const ListSheet = {
  Root,
  List,
  Row,
  RowCaret,
  Empty,
};
