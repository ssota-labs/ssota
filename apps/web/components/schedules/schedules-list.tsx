"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
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
} from "@/lib/schedules/recurrence";
import {
  ScheduleSheet,
  type InstructionOption,
  type ScheduleEditTarget,
} from "@/components/schedules/schedule-sheet";
import { ScheduleEditPopover } from "@/components/schedules/schedule-edit-popover";
import { AgentSettingCard } from "@/components/console/agent-setting-card";
import { useLocale } from "@/components/i18n/locale-provider";
import { BrowseWorkspace } from "@/components/console/browse-workspace";

export interface ScheduleRow {
  id: string;
  agentDefinitionId: string;
  targetType: import("@ssota/contracts").ScheduleTargetType;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SchedulesListProps {
  schedules: ScheduleRow[];
  instructions: InstructionOption[];
  teamspaceId: string;
  accountId: string;
}

function summarize(cron: string, timezone: string): string {
  const rec = cronToRecurrence(cron, timezone);
  return rec ? describeRecurrence(rec) : cron;
}

export function SchedulesList({
  schedules,
  instructions,
  teamspaceId,
  accountId,
}: SchedulesListProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null,
  );
  const schedulePopoverAnchorRef = useRef<HTMLDivElement | null>(null);
  const ignoreNextScheduleRowPressRef = useRef(false);

  const instructionName = useMemo(() => {
    const map = new Map(instructions.map((i) => [i.id, i.name]));
    return (id: string) => map.get(id) ?? "Unknown agent";
  }, [instructions]);

  const editingSchedule = editingScheduleId
    ? schedules.find((s) => s.id === editingScheduleId)
    : undefined;

  const scheduleEditTarget: ScheduleEditTarget | undefined = editingSchedule
    ? {
        id: editingSchedule.id,
        agentDefinitionId: editingSchedule.agentDefinitionId,
        targetType: editingSchedule.targetType,
        cronExpression: editingSchedule.cronExpression,
        timezone: editingSchedule.timezone,
        enabled: editingSchedule.enabled,
      }
    : undefined;

  function toggleEnabled(schedule: ScheduleRow, enabled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/schedules/${schedule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamspaceId, accountId, enabled }),
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
          `/api/schedules/${schedule.id}?teamspaceId=${teamspaceId}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        if (editingScheduleId === schedule.id) {
          setEditingScheduleId(null);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div
      className="absolute inset-0 flex flex-col"
      data-testid="schedules-workspace"
    >
      <BrowseWorkspace.Frame>
        <BrowseWorkspace.Header
          title={t("nav.schedules")}
          description="Run agents on a recurring schedule. Each schedule only runs inside its window, so tokens aren't spent outside it."
          actions={
            <Button size="sm" onClick={() => setCreateSheetOpen(true)}>
              Add trigger
            </Button>
          }
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {schedules.length === 0 ? (
          <BrowseWorkspace.Empty>
            No schedules yet. Add a trigger to run an agent on a recurring
            schedule.
          </BrowseWorkspace.Empty>
        ) : (
          <AgentSettingCard.Root testId="schedule-list">
            <AgentSettingCard.Body>
              <AgentSettingCard.Items>
                {schedules.map((schedule) => {
                  const label = summarize(
                    schedule.cronExpression,
                    schedule.timezone,
                  );
                  return (
                    <AgentSettingCard.Item
                      key={schedule.id}
                      className="group"
                      testId={`schedule-list-item-${schedule.id}`}
                      onPress={(element) => {
                        if (ignoreNextScheduleRowPressRef.current) {
                          ignoreNextScheduleRowPressRef.current = false;
                          return;
                        }
                        setEditingScheduleId((current) => {
                          if (current === schedule.id) return null;
                          schedulePopoverAnchorRef.current = element;
                          return schedule.id;
                        });
                      }}
                      icon={
                        <ClockIcon className="size-3.5 text-muted-foreground" />
                      }
                      title={label}
                      subtitle={instructionName(schedule.agentDefinitionId)}
                      trailing={
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={schedule.enabled}
                            onCheckedChange={(value) =>
                              toggleEnabled(schedule, value)
                            }
                            disabled={isPending}
                            aria-label={`Toggle ${label}`}
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
                                <AlertDialogTitle>
                                  Delete schedule?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This stops the recurring run. This can&apos;t
                                  be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => remove(schedule)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      }
                    />
                  );
                })}
              </AgentSettingCard.Items>
            </AgentSettingCard.Body>
          </AgentSettingCard.Root>
        )}
      </BrowseWorkspace.Frame>

      <ScheduleEditPopover
        open={editingScheduleId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingScheduleId(null);
        }}
        anchorRef={schedulePopoverAnchorRef}
        schedule={scheduleEditTarget}
        teamspaceId={teamspaceId}
        accountId={accountId}
        instructions={instructions}
        onDismissFromAnchor={() => {
          ignoreNextScheduleRowPressRef.current = true;
        }}
      />

      <ScheduleSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        teamspaceId={teamspaceId}
        accountId={accountId}
        instructions={instructions}
      />
    </div>
  );
}
