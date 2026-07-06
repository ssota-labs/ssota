"use client";

import type { RefObject } from "react";
import {
  Popover,
  PopoverContent,
} from "@ssota/ui/components/ui/popover";
import {
  ScheduleSheet,
  type InstructionOption,
  type ScheduleEditTarget,
} from "@/components/schedules/schedule-sheet";

type ScheduleEditPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: RefObject<HTMLDivElement | null>;
  schedule: ScheduleEditTarget | undefined;
  teamspaceId: string;
  accountId: string;
  instructions: InstructionOption[];
  /** Ignore the next row press after closing from the anchor (toggle popover). */
  onDismissFromAnchor?: () => void;
};

export function ScheduleEditPopover({
  open,
  onOpenChange,
  anchorRef,
  schedule,
  teamspaceId,
  accountId,
  instructions,
  onDismissFromAnchor,
}: ScheduleEditPopoverProps) {
  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (
          !nextOpen &&
          eventDetails?.reason === "outside-press" &&
          anchorRef.current?.contains(eventDetails.event.target as Node)
        ) {
          onDismissFromAnchor?.();
          onOpenChange(false);
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <PopoverContent
        anchor={anchorRef}
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-[min(22rem,92vw)] max-h-[min(65vh,24rem)] overflow-y-auto p-3"
        data-testid="schedule-edit-popover"
      >
        {schedule ? (
          <ScheduleSheet
            presentation="inline"
            inlineSubmitPlacement="header"
            compact
            open
            onOpenChange={(next) => {
              if (!next) onOpenChange(false);
            }}
            teamspaceId={teamspaceId}
            accountId={accountId}
            instructions={instructions}
            schedule={schedule}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
