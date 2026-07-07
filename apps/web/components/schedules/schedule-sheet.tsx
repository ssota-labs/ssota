"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FloppyDiskIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ssota/ui/components/ui/tooltip";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { cn } from "@ssota/ui/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import type { ScheduleTargetType } from "@ssota/contracts";
import { MAIN_AGENT_ID } from "@ssota/contracts/agents";
import {
  DEFAULT_TIMEZONE,
  cronToRecurrence,
  describeRecurrence,
  nextOccurrence,
  recurrenceToCron,
  validateCron,
  type Frequency,
  type Recurrence,
} from "@/lib/schedules/recurrence";
import { InstructionPickerSelect } from "./instruction-picker-select";
import type { InstructionOption } from "./instruction-picker-select";
import { CardListSheetPanel } from "@/components/card-list-sheet";

export type { InstructionOption };

export interface ScheduleEditTarget {
  id: string;
  agentDefinitionId: string;
  targetType: ScheduleTargetType;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
}

interface ScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamspaceId: string;
  accountId: string;
  instructions: InstructionOption[];
  schedule?: ScheduleEditTarget;
  /** Sheet on schedules page; dialog when editing from agent card; inline in add-trigger sidebar. */
  presentation?: "sheet" | "dialog" | "inline";
  /** Where the submit button renders for inline presentation (default inline). */
  inlineSubmitPlacement?: "inline" | "footer" | "header";
  /** Tighter spacing for compact popovers (agent schedule edit). */
  compact?: boolean;
}

function inferTargetType(agentDefinitionId?: string): ScheduleTargetType {
  return agentDefinitionId === MAIN_AGENT_ID ? "main_heartbeat" : "agent";
}

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
];

const TIMEZONES = [
  "Asia/Seoul",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Tokyo",
];

const DAYS = [
  { value: 1, label: "Mo" },
  { value: 2, label: "Tu" },
  { value: 3, label: "We" },
  { value: 4, label: "Th" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
  { value: 0, label: "Su" },
];

function defaultRecurrence(timezone: string): Recurrence {
  return {
    frequency: "minute",
    interval: 10,
    daysOfWeek: [1, 2, 3, 4, 5],
    atHour: 9,
    atMinute: 0,
    windowStartHour: 9,
    windowEndHour: 14,
    timezone,
  };
}

export function ScheduleSheet({
  open,
  onOpenChange,
  teamspaceId,
  accountId,
  instructions,
  schedule,
  presentation = "sheet",
  inlineSubmitPlacement = "inline",
  compact = false,
}: ScheduleSheetProps) {
  const router = useRouter();
  const isEdit = Boolean(schedule);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialTimezone = schedule?.timezone ?? DEFAULT_TIMEZONE;
  const initialRecurrence = useMemo<Recurrence>(() => {
    if (schedule) {
      return (
        cronToRecurrence(schedule.cronExpression, schedule.timezone) ??
        defaultRecurrence(schedule.timezone)
      );
    }
    return defaultRecurrence(DEFAULT_TIMEZONE);
  }, [schedule]);

  const [instructionId, setInstructionId] = useState(
    schedule?.agentDefinitionId ?? instructions[0]?.id ?? "",
  );
  const [rec, setRec] = useState<Recurrence>(initialRecurrence);
  const [timezone, setTimezone] = useState(initialTimezone);

  useEffect(() => {
    if (!open) return;
    setInstructionId(
      schedule?.agentDefinitionId ?? instructions[0]?.id ?? "",
    );
    setRec(initialRecurrence);
    setTimezone(initialTimezone);
    setError(null);
  }, [
    open,
    schedule,
    instructions,
    initialRecurrence,
    initialTimezone,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const recurrence = useMemo<Recurrence>(
    () => ({ ...rec, timezone }),
    [rec, timezone],
  );
  const cronExpression = recurrenceToCron(recurrence);

  const tzOptions = useMemo(() => {
    const set = new Set([...TIMEZONES, timezone]);
    return [...set];
  }, [timezone]);

  const preview = useMemo(() => {
    const cronError = validateCron(cronExpression, timezone);
    if (cronError) {
      return { error: cronError, summary: "", next: null as Date | null };
    }
    return {
      error: null,
      summary: describeRecurrence(recurrence),
      next: nextOccurrence(cronExpression, timezone),
    };
  }, [cronExpression, timezone, recurrence]);

  const selectedInstruction = instructions.find(
    (entry) => entry.id === instructionId,
  );

  function patch(update: Partial<Recurrence>) {
    setRec((prev) => ({ ...prev, ...update }));
  }

  function toggleDay(day: number) {
    setRec((prev) => {
      const days = new Set(prev.daysOfWeek ?? []);
      if (days.has(day)) days.delete(day);
      else days.add(day);
      return { ...prev, daysOfWeek: [...days].sort((a, b) => a - b) };
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!instructionId) {
      setError("Pick an agent to run.");
      return;
    }
    const cronError = validateCron(cronExpression, timezone);
    if (cronError) {
      setError(cronError);
      return;
    }

    startTransition(async () => {
      try {
        const selected = instructions.find((entry) => entry.id === instructionId);
        const body = {
          teamspaceId,
          accountId,
          agentDefinitionId: instructionId,
          targetType: inferTargetType(selected?.id),
          cronExpression,
          timezone,
          enabled: schedule?.enabled ?? true,
        };
        const res = await fetch(
          isEdit ? `/api/schedules/${schedule!.id}` : "/api/schedules",
          {
            method: isEdit ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? `Request failed (${res.status})`);
        }
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save schedule");
      }
    });
  }

  const showWindow = rec.frequency === "minute" || rec.frequency === "hour";
  const showAtTime = rec.frequency === "day" || rec.frequency === "week";
  const showDays = rec.frequency !== "day";
  const showAgentPicker = instructions.length > 1;

  const title = isEdit ? "Edit trigger" : "Add trigger";
  const subtitle = selectedInstruction
    ? selectedInstruction.name
    : "Choose an agent and set a recurring schedule.";

  const formId =
    presentation === "inline" && schedule
      ? `schedule-sheet-form-${schedule.id}`
      : "schedule-sheet-form";

  const useHeaderIconActions =
    presentation === "inline" && compact && inlineSubmitPlacement === "header";

  const submitButton = (
    <Button
      type="submit"
      form={formId}
      disabled={isPending || Boolean(preview.error)}
      className={cn(
        presentation === "sheet" ? "w-full" : undefined,
        useHeaderIconActions && "size-8",
      )}
      data-testid={
        presentation === "inline" && !isEdit ? "add-trigger-confirm" : undefined
      }
    >
      {isEdit ? "Save changes" : "Add trigger"}
    </Button>
  );

  const headerSaveButton = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="submit"
            form={formId}
            size="icon"
            variant="ghost"
            className="size-8"
            disabled={isPending || Boolean(preview.error)}
            aria-label="Save changes"
            data-testid="schedule-save-trigger"
          >
            <FloppyDiskIcon className="size-4" aria-hidden />
          </Button>
        }
      />
      <TooltipContent side="top" sideOffset={5}>
        Save changes
      </TooltipContent>
    </Tooltip>
  );

  const form = (
    <form
      id={formId}
      className={cn(compact ? "space-y-3" : "space-y-5")}
      onSubmit={handleSubmit}
    >
        {showAgentPicker ? (
          <div className="space-y-2">
            <Label>Agent</Label>
            <InstructionPickerSelect
              instructions={instructions}
              selectedId={instructionId}
              onSelect={setInstructionId}
              disabled={isPending}
            />
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <div className="grid gap-2">
            <Label htmlFor="schedule-every">Every</Label>
            <Input
              id="schedule-every"
              type="number"
              min={1}
              className="w-20"
              value={rec.interval}
              onChange={(e) =>
                patch({ interval: Math.max(1, Number(e.target.value)) })
              }
              disabled={isPending}
            />
          </div>
          <div className="grid flex-1 gap-2">
            <Label htmlFor="schedule-frequency">Frequency</Label>
            <Select
              value={rec.frequency}
              onValueChange={(value) =>
                value && patch({ frequency: value as Frequency })
              }
              disabled={isPending}
              items={FREQUENCIES}
              modal={false}
            >
              <SelectTrigger id="schedule-frequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showAtTime && (
          <div className="grid gap-2">
            <Label>At</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={23}
                className="w-20"
                value={rec.atHour}
                onChange={(e) =>
                  patch({
                    atHour: Math.min(23, Math.max(0, Number(e.target.value))),
                  })
                }
                disabled={isPending}
              />
              <span>:</span>
              <Input
                type="number"
                min={0}
                max={59}
                className="w-20"
                value={rec.atMinute}
                onChange={(e) =>
                  patch({
                    atMinute: Math.min(
                      59,
                      Math.max(0, Number(e.target.value)),
                    ),
                  })
                }
                disabled={isPending}
              />
            </div>
          </div>
        )}

        {showWindow && (
          <div className="grid gap-2">
            <Label>Active window (hours)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={23}
                className="w-20"
                value={rec.windowStartHour ?? 0}
                onChange={(e) =>
                  patch({
                    windowStartHour: Math.min(
                      23,
                      Math.max(0, Number(e.target.value)),
                    ),
                  })
                }
                disabled={isPending}
              />
              <span>to</span>
              <Input
                type="number"
                min={0}
                max={23}
                className="w-20"
                value={rec.windowEndHour ?? 23}
                onChange={(e) =>
                  patch({
                    windowEndHour: Math.min(
                      23,
                      Math.max(0, Number(e.target.value)),
                    ),
                  })
                }
                disabled={isPending}
              />
            </div>
          </div>
        )}

        {showDays && (
          <div className="grid gap-2">
            <Label>On days</Label>
            <div className="flex flex-wrap gap-1">
              {DAYS.map((d) => {
                const active = (rec.daysOfWeek ?? []).includes(d.value);
                return (
                  <Button
                    key={d.value}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className={cn(
                      "px-0",
                      compact ? "h-7 w-9" : "h-8 w-10",
                    )}
                    onClick={() => toggleDay(d.value)}
                    disabled={isPending}
                  >
                    {d.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="schedule-timezone">Timezone</Label>
          <Select
            value={timezone}
            onValueChange={(value) => value && setTimezone(value)}
            disabled={isPending}
            items={tzOptions.map((tz) => ({ value: tz, label: tz }))}
            modal={false}
          >
            <SelectTrigger id="schedule-timezone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tzOptions.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={cn(
            "rounded-md border bg-muted/40",
            compact ? "p-2 text-xs" : "p-3 text-sm",
          )}
        >
          {preview.error ? (
            <p className="text-destructive">{preview.error}</p>
          ) : (
            <>
              <p className="font-medium">{preview.summary}</p>
              <p className="text-muted-foreground">
                <span className="font-mono">{cronExpression}</span>
              </p>
              <p className="text-muted-foreground">
                Next occurrence:{" "}
                {preview.next
                  ? preview.next.toLocaleString("en-US", { timeZone: timezone })
                  : "—"}
              </p>
            </>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
  );

  if (presentation === "inline") {
    if (!open) return null;
    return (
      <div className="space-y-4" data-testid="schedule-inline-form">
        {inlineSubmitPlacement === "header" ? (
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold leading-none">{title}</h3>
            <div className="flex shrink-0 items-center gap-1">
              {isEdit && useHeaderIconActions ? headerSaveButton : submitButton}
            </div>
          </div>
        ) : null}
        {form}
        {inlineSubmitPlacement === "inline" ? (
          <div className="flex justify-end">{submitButton}</div>
        ) : null}
      </div>
    );
  }

  if (presentation === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[85vh] max-w-3xl overflow-y-auto"
          forceBackdrop
          data-testid="schedule-add-dialog"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          {form}
          <DialogFooter>{submitButton}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!open) return null;

  return (
    <CardListSheetPanel
      title={title}
      subtitle={subtitle}
      onClose={() => onOpenChange(false)}
      footer={submitButton}
      testId="schedule-sheet-panel"
      closeButtonTestId="schedule-sheet-close"
      resizeHandleTestId="schedule-sheet-resize-handle"
    >
      {form}
    </CardListSheetPanel>
  );
}
