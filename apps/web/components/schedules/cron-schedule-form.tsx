"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Switch } from "@ssota/ui/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { cn } from "@ssota/ui/lib/utils";
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

export type CronScheduleValue = {
  cronExpression: string;
  timezone: string;
  enabled: boolean;
};

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
    frequency: "hour",
    interval: 1,
    daysOfWeek: [1, 2, 3, 4, 5],
    atHour: 9,
    atMinute: 0,
    windowStartHour: 9,
    windowEndHour: 14,
    timezone,
  };
}

export type CronScheduleFormProps = {
  value: CronScheduleValue;
  onValueChange: (value: CronScheduleValue) => void;
  formId: string;
  onSubmit: (event: React.FormEvent) => void;
  compact?: boolean;
  isPending?: boolean;
  showEnabled?: boolean;
  error?: string | null;
  title?: string;
  submitButton?: React.ReactNode;
  inlineSubmitPlacement?: "inline" | "header";
};

export function CronScheduleForm({
  value,
  onValueChange,
  formId,
  onSubmit,
  compact = false,
  isPending = false,
  showEnabled = true,
  error = null,
  title = "Schedule",
  submitButton,
  inlineSubmitPlacement = "header",
}: CronScheduleFormProps) {
  const initialRecurrence = useMemo<Recurrence>(() => {
    return (
      cronToRecurrence(value.cronExpression, value.timezone) ??
      defaultRecurrence(value.timezone)
    );
  }, [value.cronExpression, value.timezone]);

  const [rec, setRec] = useState<Recurrence>(initialRecurrence);
  const [timezone, setTimezone] = useState(value.timezone);
  const [enabled, setEnabled] = useState(value.enabled);

  useEffect(() => {
    setRec(initialRecurrence);
    setTimezone(value.timezone);
    setEnabled(value.enabled);
  }, [value, initialRecurrence]);

  const recurrence = useMemo<Recurrence>(
    () => ({ ...rec, timezone }),
    [rec, timezone],
  );

  const cronExpression = recurrenceToCron(recurrence);

  const tzOptions = useMemo(() => {
    const set = new Set([...TIMEZONES, timezone, value.timezone]);
    return [...set];
  }, [timezone, value.timezone]);

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
    const cronError = validateCron(cronExpression, timezone);
    if (cronError) return;
    onValueChange({
      cronExpression,
      timezone,
      enabled,
    });
    onSubmit(event);
  }

  const showWindow = rec.frequency === "minute" || rec.frequency === "hour";
  const showAtTime = rec.frequency === "day" || rec.frequency === "week";
  const showDays = rec.frequency !== "day";

  const form = (
    <form
      id={formId}
      className={cn(compact ? "space-y-3" : "space-y-5")}
      onSubmit={handleSubmit}
    >
      <div className="flex items-end gap-2">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-every`}>Every</Label>
          <Input
            id={`${formId}-every`}
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
          <Label htmlFor={`${formId}-frequency`}>Frequency</Label>
          <Select
            value={rec.frequency}
            onValueChange={(next) =>
              next && patch({ frequency: next as Frequency })
            }
            disabled={isPending}
            items={FREQUENCIES}
            modal={false}
          >
            <SelectTrigger id={`${formId}-frequency`} className="w-full">
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
                  className={cn("px-0", compact ? "h-7 w-9" : "h-8 w-10")}
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
        <Label htmlFor={`${formId}-timezone`}>Timezone</Label>
        <Select
          value={timezone}
          onValueChange={(next) => next && setTimezone(next)}
          disabled={isPending}
          items={tzOptions.map((tz) => ({ value: tz, label: tz }))}
          modal={false}
        >
          <SelectTrigger id={`${formId}-timezone`} className="w-full">
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

      {showEnabled ? (
        <div className="flex items-center justify-between">
          <Label htmlFor={`${formId}-enabled`}>Enabled</Label>
          <Switch
            id={`${formId}-enabled`}
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={isPending}
          />
        </div>
      ) : null}

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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );

  return (
    <div className="space-y-4" data-testid="cron-schedule-form">
      {inlineSubmitPlacement === "header" && submitButton ? (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold leading-none">{title}</h3>
          {submitButton}
        </div>
      ) : null}
      {form}
      {inlineSubmitPlacement === "inline" && submitButton ? (
        <div className="flex justify-end">{submitButton}</div>
      ) : null}
    </div>
  );
}

export function summarizeCronSchedule(value: CronScheduleValue): string {
  const rec = cronToRecurrence(value.cronExpression, value.timezone);
  return rec ? describeRecurrence(rec) : value.cronExpression;
}

export function defaultCronScheduleValue(): CronScheduleValue {
  const timezone = DEFAULT_TIMEZONE;
  return {
    cronExpression: recurrenceToCron(defaultRecurrence(timezone)),
    timezone,
    enabled: true,
  };
}
