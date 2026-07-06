"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowsClockwiseIcon,
  CaretRightIcon,
  ClockIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
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
  nextOccurrence,
} from "@/lib/schedules/recurrence";
import {
  ScheduleSheet,
  type InstructionOption,
  type ScheduleEditTarget,
} from "@/components/schedules/schedule-sheet";
import { toggleSyncWorkerEnabledAction } from "@/app/[orgSlug]/[teamspaceSlug]/schedules/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { legacyOrgTeamspacePath } from "@/lib/console/paths";
import type {
  ScheduleHubAgentSchedule,
  ScheduleHubSyncWorker,
} from "@/lib/schedules/load-schedule-hub-context";

type ScheduleHubProps = {
  orgSlug: string;
  teamspaceSlug: string;
  teamspaceId: string;
  accountId: string;
  schedules: ScheduleHubAgentSchedule[];
  syncWorkers: ScheduleHubSyncWorker[];
  agents: InstructionOption[];
};

function summarizeCron(cron: string, timezone: string): string {
  const rec = cronToRecurrence(cron, timezone);
  return rec ? describeRecurrence(rec) : cron;
}

function ScheduleRows({
  schedules,
  agents,
  teamspaceId,
  accountId,
  isPending,
  onEdit,
  onToggle,
  onDelete,
}: {
  schedules: ScheduleHubAgentSchedule[];
  agents: InstructionOption[];
  teamspaceId: string;
  accountId: string;
  isPending: boolean;
  onEdit: (schedule: ScheduleHubAgentSchedule) => void;
  onToggle: (schedule: ScheduleHubAgentSchedule, enabled: boolean) => void;
  onDelete: (schedule: ScheduleHubAgentSchedule) => void;
}) {
  const agentName = useMemo(() => {
    const map = new Map(agents.map((agent) => [agent.id, agent.name]));
    return (id: string) => map.get(id) ?? "Unknown agent";
  }, [agents]);

  return (
    <div
      className="divide-y divide-border overflow-hidden rounded-lg border border-border"
      data-testid="schedule-hub-agent-list"
    >
      {schedules.map((schedule) => {
        const next = nextOccurrence(schedule.cronExpression, schedule.timezone);
        return (
          <div
            key={schedule.id}
            className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 transition-colors"
            data-testid={`schedule-list-item-${schedule.id}`}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() => onEdit(schedule)}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-sm font-medium">
                  {agentName(schedule.agentDefinitionId)}
                </span>
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {summarizeCron(schedule.cronExpression, schedule.timezone)}
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
                onCheckedChange={(value) => onToggle(schedule, value)}
                onClick={(event) => event.stopPropagation()}
                disabled={isPending}
                aria-label={`Toggle ${agentName(schedule.agentDefinitionId)}`}
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
                      This stops the recurring run. This can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(schedule)}>
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
  );
}

function WorkerSyncRows({
  workers,
  workersHref,
  isPending,
  onToggle,
}: {
  workers: ScheduleHubSyncWorker[];
  workersHref: string;
  isPending: boolean;
  onToggle: (worker: ScheduleHubSyncWorker, enabled: boolean) => void;
}) {
  return (
    <div
      className="divide-y divide-border overflow-hidden rounded-lg border border-border"
      data-testid="schedule-hub-worker-sync-list"
    >
      {workers.map((worker) => {
        const next = nextOccurrence(worker.cronExpression, worker.timezone);
        return (
          <div
            key={worker.id}
            className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 transition-colors"
            data-testid={`schedule-hub-sync-item-${worker.key}`}
          >
            <Link
              href={workersHref}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-sm font-medium">{worker.name}</span>
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {worker.description.trim() ||
                    summarizeCron(worker.cronExpression, worker.timezone)}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {worker.cronExpression}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {worker.timezone}
                  </Badge>
                  <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                    <ClockIcon className="size-3" />
                    {next
                      ? next.toLocaleString("en-US", {
                          timeZone: worker.timezone,
                        })
                      : "—"}
                  </span>
                </div>
              </div>
              <CaretRightIcon
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
            </Link>
            <Switch
              checked={worker.enabled}
              onCheckedChange={(value) => onToggle(worker, value)}
              disabled={isPending}
              aria-label={`Toggle ${worker.name}`}
              data-testid={`schedule-hub-sync-toggle-${worker.key}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export function ScheduleHub({
  orgSlug,
  teamspaceSlug,
  teamspaceId,
  accountId,
  schedules,
  syncWorkers: initialSyncWorkers,
  agents,
}: ScheduleHubProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<ScheduleEditTarget | null>(null);
  const [syncWorkers, setSyncWorkers] =
    useState<ScheduleHubSyncWorker[]>(initialSyncWorkers);

  useEffect(() => {
    setSyncWorkers(initialSyncWorkers);
  }, [initialSyncWorkers]);

  const workersHref = legacyOrgTeamspacePath(
    { orgSlug, teamspaceSlug },
    "workers",
  );

  function openCreateSheet() {
    setEditingSchedule(null);
    setSheetOpen(true);
  }

  function openEditSheet(schedule: ScheduleHubAgentSchedule) {
    setEditingSchedule({
      id: schedule.id,
      agentDefinitionId: schedule.agentDefinitionId,
      targetType: schedule.targetType,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      enabled: schedule.enabled,
    });
    setSheetOpen(true);
  }

  function toggleScheduleEnabled(
    schedule: ScheduleHubAgentSchedule,
    enabled: boolean,
  ) {
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

  function removeSchedule(schedule: ScheduleHubAgentSchedule) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/schedules/${schedule.id}?teamspaceId=${teamspaceId}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function toggleSyncWorker(worker: ScheduleHubSyncWorker, enabled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await toggleSyncWorkerEnabledAction({
          orgSlug,
          teamspaceSlug,
          teamspaceId,
          workerId: worker.id,
          enabled,
        });
        setSyncWorkers((prev) =>
          prev.map((row) =>
            row.id === worker.id ? { ...row, enabled } : row,
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update worker");
      }
    });
  }

  useEffect(() => {
    if (!sheetOpen) setEditingSchedule(null);
  }, [sheetOpen]);

  const isEmpty = schedules.length === 0 && syncWorkers.length === 0;

  return (
    <div
      className="absolute inset-0 flex flex-col"
      data-testid="schedule-hub"
    >
      <BrowseWorkspace.Frame>
        <BrowseWorkspace.Header
          title={t("scheduleHub.title")}
          description={t("scheduleHub.description")}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {isEmpty ? (
          <BrowseWorkspace.Empty>
            {t("scheduleHub.empty")}
          </BrowseWorkspace.Empty>
        ) : null}

        <BrowseWorkspace.Section label={t("scheduleHub.agentTriggers")}>
          <div className="flex items-center justify-end">
            <Button size="sm" onClick={openCreateSheet}>
              {t("scheduleHub.addAgentTrigger")}
            </Button>
          </div>
          {schedules.length === 0 ? (
            <BrowseWorkspace.Empty>
              {t("scheduleHub.noAgentTriggers")}
            </BrowseWorkspace.Empty>
          ) : (
            <ScheduleRows
              schedules={schedules}
              agents={agents}
              teamspaceId={teamspaceId}
              accountId={accountId}
              isPending={isPending}
              onEdit={openEditSheet}
              onToggle={toggleScheduleEnabled}
              onDelete={removeSchedule}
            />
          )}
        </BrowseWorkspace.Section>

        <BrowseWorkspace.Section label={t("scheduleHub.workerSync")}>
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={workersHref}
                  data-testid="schedule-hub-open-workers"
                />
              }
            >
              <ArrowsClockwiseIcon className="size-4" aria-hidden />
              {t("scheduleHub.manageWorkers")}
            </Button>
          </div>
          {syncWorkers.length === 0 ? (
            <BrowseWorkspace.Empty>
              {t("scheduleHub.noWorkerSync")}
            </BrowseWorkspace.Empty>
          ) : (
            <WorkerSyncRows
              workers={syncWorkers}
              workersHref={workersHref}
              isPending={isPending}
              onToggle={toggleSyncWorker}
            />
          )}
        </BrowseWorkspace.Section>
      </BrowseWorkspace.Frame>

      <ScheduleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        teamspaceId={teamspaceId}
        accountId={accountId}
        instructions={agents}
        schedule={editingSchedule ?? undefined}
      />
    </div>
  );
}
