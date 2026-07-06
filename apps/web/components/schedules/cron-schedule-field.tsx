"use client";

import { useRef, useState, type RefObject } from "react";
import { ClockIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
} from "@ssota/ui/components/ui/popover";
import { AgentSettingCard } from "@/components/console/agent-setting-card";
import {
  CronScheduleForm,
  summarizeCronSchedule,
  type CronScheduleValue,
} from "@/components/schedules/cron-schedule-form";

type CronScheduleFieldProps = {
  value: CronScheduleValue;
  onSave: (value: CronScheduleValue) => void;
  label?: string;
  subtitle?: string;
  isPending?: boolean;
  testId?: string;
  showEnabled?: boolean;
};

export function CronScheduleField({
  value,
  onSave,
  label = "Schedule",
  subtitle,
  isPending = false,
  testId = "cron-schedule-field",
  showEnabled = true,
}: CronScheduleFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CronScheduleValue>(value);
  const [error, setError] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const ignoreNextPressRef = useRef(false);

  const summary = summarizeCronSchedule(value);
  const formId = `${testId}-form`;

  function openEditor(element: HTMLDivElement) {
    if (ignoreNextPressRef.current) {
      ignoreNextPressRef.current = false;
      return;
    }
    setDraft(value);
    setError(null);
    anchorRef.current = element;
    setOpen((current) => !current);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      onSave(draft);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    }
  }

  const submitButton = (
    <Button
      type="submit"
      form={formId}
      disabled={isPending}
      className="h-8 px-3 text-xs"
      data-testid={`${testId}-save`}
    >
      Save changes
    </Button>
  );

  const editor = (
    <CronScheduleForm
      value={draft}
      onValueChange={setDraft}
      formId={formId}
      onSubmit={handleSave}
      compact
      isPending={isPending}
      showEnabled={showEnabled}
      error={error}
      title={label}
      submitButton={submitButton}
      inlineSubmitPlacement="header"
    />
  );

  return (
    <>
      <AgentSettingCard.Item
        testId={testId}
        onPress={openEditor}
        icon={<ClockIcon className="size-3.5 text-muted-foreground" />}
        title={summary}
        subtitle={
          subtitle ??
          `${value.timezone}${showEnabled && !value.enabled ? " · disabled" : ""}`
        }
      />
      <CronSchedulePopover
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        onDismissFromAnchor={() => {
          ignoreNextPressRef.current = true;
        }}
        testId={`${testId}-popover`}
      >
        {editor}
      </CronSchedulePopover>
    </>
  );
}

function CronSchedulePopover({
  open,
  onOpenChange,
  anchorRef,
  onDismissFromAnchor,
  testId,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: RefObject<HTMLDivElement | null>;
  onDismissFromAnchor?: () => void;
  testId: string;
  children: React.ReactNode;
}) {
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
        data-testid={testId}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
