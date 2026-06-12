"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";

type GraphTableSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function GraphTableSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: GraphTableSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="inset-y-0 right-0 flex h-full w-[calc(100%-3rem)] max-w-none flex-col border-l p-0 sm:max-w-none lg:w-[calc(100%-15rem)]"
      >
        <SheetHeader className="shrink-0 border-b px-4 py-3">
          <SheetTitle className="text-sm">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-xs">{description}</SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
