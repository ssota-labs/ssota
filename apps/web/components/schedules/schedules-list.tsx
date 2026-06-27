"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Switch } from "@ssota/ui/components/ui/switch";
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
  ScheduleDialog,
  type InstructionOption,
} from "@/components/schedules/schedule-dialog";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const instructionName = useMemo(() => {
    const map = new Map(instructions.map((i) => [i.id, i.name]));
    return (id: string) => map.get(id) ?? "Unknown agent";
  }, [instructions]);

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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Schedules</h1>
          <p className="text-sm text-muted-foreground">
            Run agents on a recurring schedule. Each schedule only runs inside
            its window, so tokens aren&apos;t spent outside it.
          </p>
        </div>
        <ScheduleDialog
          projectId={projectId}
          accountId={accountId}
          instructions={instructions}
          trigger={<Button size="sm">Add trigger</Button>}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No schedules yet. Add a trigger to run an agent on a recurring
            schedule.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => {
            const next = nextOccurrence(
              schedule.cronExpression,
              schedule.timezone,
            );
            return (
              <Card key={schedule.id}>
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {instructionName(schedule.workflowInstructionId)}
                    </CardTitle>
                    <CardDescription>
                      {summarize(schedule.cronExpression, schedule.timezone)}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(value) => toggleEnabled(schedule, value)}
                    disabled={isPending}
                  />
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="font-mono">
                      {schedule.cronExpression}
                    </Badge>
                    <Badge variant="outline">{schedule.timezone}</Badge>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3.5" />
                      {next
                        ? next.toLocaleString("en-US", {
                            timeZone: schedule.timezone,
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ScheduleDialog
                      projectId={projectId}
                      accountId={accountId}
                      instructions={instructions}
                      schedule={schedule}
                      trigger={
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit schedule"
                        >
                          <PencilSimpleIcon className="size-4" />
                        </Button>
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete schedule"
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
