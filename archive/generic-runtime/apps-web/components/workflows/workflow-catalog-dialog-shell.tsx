"use client";

import type { ReactNode } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  DialogContent,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@ssota/ui/components/ui/input-group";
import { cn } from "@ssota/ui/lib/utils";

/** Override cn-dialog-content grid/p-4/gap-4 so chrome borders sit flush. */
export const WORKFLOW_CATALOG_DIALOG_CONTENT_CLASS =
  "!flex h-[min(640px,calc(100vh-3rem))] w-[min(760px,calc(100vw-2rem))] !max-w-[760px] flex-col !gap-0 overflow-hidden !p-0 !sm:max-w-[760px] bg-popover shadow-lg";

export const WORKFLOW_CATALOG_DIALOG_GRID_CLASS =
  "grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)]";

const HEADER_CLASS =
  "flex h-10 shrink-0 items-center gap-2 border-b bg-popover px-2.5";

const FOOTER_CLASS =
  "flex h-11 shrink-0 items-center justify-end border-t bg-popover px-2.5";

export function WorkflowCatalogDialogHeader({
  title,
  query,
  onQueryChange,
  onClose,
}: {
  title: string;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div className={HEADER_CLASS}>
      <DialogTitle className="text-sm font-medium leading-none">{title}</DialogTitle>
      <InputGroup className="ml-auto h-7 max-w-[11rem]">
        <InputGroupAddon>
          <MagnifyingGlassIcon className="size-3 shrink-0 opacity-50" />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="Search"
        />
      </InputGroup>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 shrink-0"
        onClick={onClose}
      >
        <XIcon className="size-3.5" />
        <span className="sr-only">Close</span>
      </Button>
    </div>
  );
}

export function WorkflowCatalogDialogFooter({ children }: { children: ReactNode }) {
  return <div className={FOOTER_CLASS}>{children}</div>;
}

export function WorkflowCatalogDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      showCloseButton={false}
      forceBackdrop
      className={cn(WORKFLOW_CATALOG_DIALOG_CONTENT_CLASS, className)}
      {...props}
    >
      {children}
    </DialogContent>
  );
}
