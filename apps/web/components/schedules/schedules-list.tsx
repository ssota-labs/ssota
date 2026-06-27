"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretRightIcon, ClockIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Switch } from "@ssota/ui/components/ui/switch";
import { cn } from "@ssota/ui/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ssota/ui/components/ui/alert-dialog";
import {
  cronToRecurrence,
  describeRecurrence,
  nextOccurrence,
} from "@/lib/schedules/recurrence";
import {
  ScheduleSheet,
  type InstructionOption,
  type ScheduleEditTarget,
} from "@/components/schedules/schedule-sheet";
import { useLocale } from "@/components/i18n/locale-provider";

export interface ScheduleRow {
  id: string;
  workflowInstructionId: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SchedulesListProps {
  schedules: ScheduleRow[];
  instructions: InstructionOption[];
  projectId: string;
  accountId: string;
}

function summarize(cron: string, timezone: string): string {
  const rec = cronToRecurrence(cron, timezone);
  return rec ? describeRecurrence(rec) : cron;
}

export function SchedulesList({
  schedules,
  instructions,
  projectId,
  accountId,
}: SchedulesListProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEditTarget | null>(
    null,
  );

  const instructionName = useMemo(() => {
    const map = new Map(instructions.map((i) => [i.id, i.name]));
    return (id: string) => map.get(id) ?? "Unknown agent";
  }, [instructions]);

  function openCreateSheet() {
    setEditingSchedule(null);
    setSheetOpen(true);
  }

  function openEditSheet(schedule: ScheduleRow) {
    setEditingSchedule({
      id: schedule.id,
      workflowInstructionId: schedule.workflowInstructionId,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      enabled: schedule.enabled,
    });
    setSheetOpen(true);
  }

  function toggleEnabled(schedule: ScheduleRow, enabled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/schedules/${schedule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, accountId, enabled }),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  function remove(schedule: ScheduleRow) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/schedules/${schedule.id}?projectId=${projectId}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  useEffect(() => {
    if (!sheetOpen) setEditingSchedule(null);
  }, [sheetOpen]);

  return (
    <div
      className="absolute inset-0 flex flex-col"
      data-testid="schedules-workspace"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {t("nav.schedules")}
              </h1>
              <p className="text-sm text-muted-foreground">
                Run agents on a recurring schedule. Each schedule only runs inside
                its window, so tokens aren&apos;t spent outside it.
              </p>
            </div>
            <Button size="sm" onClick={openCreateSheet}>
              Add trigger
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {schedules.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border px-4 py-10 text-center text-sm">
              No schedules yet. Add a trigger to run an agent on a recurring
              schedule.
            </p>
          ) : (
            <div
              className="border-border divide-border divide-y overflow-hidden rounded-lg border"
              data-testid="schedule-list"
            >
              {schedules.map((schedule) => {
                const next = nextOccurrence(
                  schedule.cronExpression,
                  schedule.timezone,
                );
                return (
                  <div
                    key={schedule.id}
                    className={cn(
                      "hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 transition-colors",
                    )}
                    data-testid={`schedule-list-item-${schedule.id}`}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => openEditSheet(schedule)}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="text-sm font-medium">
                          {instructionName(schedule.workflowInstructionId)}
                        </span>
                        <p className="text-muted-foreground line-clamp-2 text-xs">
                          {summarize(schedule.cronExpression, schedule.timezone)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {schedule.cronExpression}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {schedule.timezone}
                          </Badge>
                          <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                            <ClockIcon className="size-3" />
                            {next
                              ? next.toLocaleString("en-US", {
                                  timeZone: schedule.timezone,
                                })
                              : "—"}
                          </span>
                        </div>
                      </div>
                      <CaretRightIcon
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden
                      />
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(value) => toggleEnabled(schedule, value)}
                        onClick={(event) => event.stopPropagation()}
                        disabled={isPending}
                        aria-label={`Toggle ${instructionName(schedule.workflowInstructionId)}`}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Delete schedule"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <TrashIcon className="size-4" />
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This stops the recurring run. This can&apos;t be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(schedule)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ScheduleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        projectId={projectId}
        accountId={accountId}
        instructions={instructions}
        schedule={editingSchedule ?? undefined}
      />
    </div>
  );
}
