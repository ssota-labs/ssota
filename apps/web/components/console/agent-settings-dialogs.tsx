"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarBlankIcon,
  ChatsCircleIcon,
  ClockIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { AgentDefinition, AgentTrigger, ToolBundle } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import { Label } from "@ssota/ui/components/ui/label";
import { Switch } from "@ssota/ui/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import type { ConnectorConnection } from "@/components/connectors/connectors-view";
import type { ConnectorDef } from "@/lib/connect/connectors";
import { DEFAULT_MODEL_ID, MODEL_OPTIONS } from "@/lib/chat/models";
import {
  BASE_TOOL_BUNDLES,
  OPTIONAL_TOOL_BUNDLES,
  TOOL_BUNDLE_LABELS,
  TRIGGER_LABELS,
  isWorkerAgentId,
} from "@/lib/console/agent-tool-catalog";
import type { AgentScheduleSummary } from "@/lib/console/load-agent-settings-context";
import { ScheduleSheet } from "@/components/schedules/schedule-sheet";
import { describeRecurrence, cronToRecurrence } from "@/lib/schedules/recurrence";
import {
  AgentSettingsSidebarDialog,
  SidebarDetailDoneButton,
  SidebarDetailHeader,
  type SidebarListItem,
} from "@/components/console/agent-settings-sidebar-dialog";

export type AgentSettingsDraft = {
  instructions: AgentDefinition["instructions"];
  toolBundles: ToolBundle[];
  allowedTriggers: AgentTrigger[];
  model: string;
  scriptToolIds: string[];
  linkedWorkerAgentIds: string[];
  enabledConnectorProviders: string[];
  scheduleEnabledById: Record<string, boolean>;
};

type AgentSettingsDialogsProps = {
  definition: AgentDefinition;
  draft: AgentSettingsDraft;
  onDraftChange: (patch: Partial<AgentSettingsDraft>) => void;
  workers: AgentDefinition[];
  scriptTools: Array<{ id: string; key: string; name: string }>;
  connectors: ConnectorDef[];
  connections: { user: ConnectorConnection[]; org: ConnectorConnection[] };
  schedules: AgentScheduleSummary[];
  teamspaceId: string;
  accountId: string;
  openDialog: AgentSettingsDialogKind | null;
  onOpenDialogChange: (kind: AgentSettingsDialogKind | null) => void;
};

export type AgentSettingsDialogKind =
  | "triggers"
  | "tools"
  | "model"
  | "add-schedule";

type ToolEntry =
  | { kind: "connector"; id: string; provider: string; label: string }
  | { kind: "script"; id: string; toolId: string; label: string; key: string }
  | { kind: "worker"; id: string; workerId: string; label: string }
  | { kind: "bundle"; id: string; bundle: ToolBundle; label: string };

type TriggerEntry =
  | { kind: "trigger"; id: string; trigger: AgentTrigger }
  | { kind: "cron"; id: string; scheduleId: string; label: string };

const TRIGGER_DESCRIPTIONS: Partial<Record<AgentTrigger, string>> = {
  chatbot:
    "Run when users message connected bots in Slack, Discord, or Telegram.",
  schedule:
    "Allow recurring cron runs. Add each schedule below once enabled.",
};

function matchesSearch(label: string, query: string, extra?: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    label.toLowerCase().includes(q) ||
    (extra?.toLowerCase().includes(q) ?? false)
  );
}

export function AgentSettingsDialogs({
  definition,
  draft,
  onDraftChange,
  workers,
  scriptTools,
  connectors,
  connections,
  schedules,
  teamspaceId,
  accountId,
  openDialog,
  onOpenDialogChange,
}: AgentSettingsDialogsProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [selectedTriggerId, setSelectedTriggerId] = useState<string | null>(
    null,
  );
  const [toolSearch, setToolSearch] = useState("");
  const [triggerSearch, setTriggerSearch] = useState("");

  useEffect(() => {
    if (openDialog === "add-schedule") {
      setScheduleOpen(true);
      onOpenDialogChange(null);
    }
  }, [openDialog, onOpenDialogChange]);

  const agentSchedules = schedules.filter(
    (s) => s.agentDefinitionId === definition.id,
  );

  const connectedProviders = useMemo(() => {
    const set = new Set<string>();
    for (const c of connections.user) set.add(c.connector);
    for (const c of connections.org) set.add(c.connector);
    return set;
  }, [connections]);

  const toolEntries = useMemo((): ToolEntry[] => {
    const entries: ToolEntry[] = [
      ...connectors.map((connector) => ({
        kind: "connector" as const,
        id: `connector:${connector.provider}`,
        provider: connector.provider,
        label: connector.label,
      })),
      ...scriptTools.map((tool) => ({
        kind: "script" as const,
        id: `script:${tool.id}`,
        toolId: tool.id,
        label: tool.name,
        key: tool.key,
      })),
      ...workers.map((worker) => ({
        kind: "worker" as const,
        id: `worker:${worker.id}`,
        workerId: worker.id,
        label: worker.name,
      })),
      ...OPTIONAL_TOOL_BUNDLES.map((bundle) => ({
        kind: "bundle" as const,
        id: `bundle:${bundle}`,
        bundle,
        label: TOOL_BUNDLE_LABELS[bundle],
      })),
    ];
    return entries.sort((a, b) => a.label.localeCompare(b.label));
  }, [connectors, scriptTools, workers]);

  const filteredToolEntries = useMemo(
    () =>
      toolEntries.filter((entry) => {
        if (entry.kind === "script") {
          return matchesSearch(entry.label, toolSearch, entry.key);
        }
        return matchesSearch(entry.label, toolSearch);
      }),
    [toolEntries, toolSearch],
  );

  const triggerEntries = useMemo((): TriggerEntry[] => {
    const base: TriggerEntry[] = [
      { kind: "trigger", id: "trigger:chatbot", trigger: "chatbot" },
      { kind: "trigger", id: "trigger:schedule", trigger: "schedule" },
    ];
    if (draft.allowedTriggers.includes("schedule")) {
      for (const schedule of agentSchedules) {
        const rec = cronToRecurrence(
          schedule.cronExpression,
          schedule.timezone,
        );
        const label = rec
          ? describeRecurrence(rec)
          : schedule.cronExpression;
        base.push({
          kind: "cron",
          id: `cron:${schedule.id}`,
          scheduleId: schedule.id,
          label,
        });
      }
    }
    return base;
  }, [agentSchedules, draft.allowedTriggers]);

  const filteredTriggerEntries = useMemo(
    () =>
      triggerEntries.filter((entry) => {
        const label =
          entry.kind === "trigger"
            ? TRIGGER_LABELS[entry.trigger]
            : entry.label;
        return matchesSearch(label, triggerSearch);
      }),
    [triggerEntries, triggerSearch],
  );

  useEffect(() => {
    if (openDialog === "tools") {
      setToolSearch("");
      setSelectedToolId(toolEntries[0]?.id ?? null);
    }
  }, [openDialog, toolEntries]);

  useEffect(() => {
    if (openDialog === "triggers") {
      setTriggerSearch("");
      setSelectedTriggerId(triggerEntries[0]?.id ?? null);
    }
  }, [openDialog, triggerEntries]);

  useEffect(() => {
    if (openDialog !== "tools" || !selectedToolId) return;
    if (!filteredToolEntries.some((entry) => entry.id === selectedToolId)) {
      setSelectedToolId(filteredToolEntries[0]?.id ?? null);
    }
  }, [filteredToolEntries, openDialog, selectedToolId]);

  useEffect(() => {
    if (openDialog !== "triggers" || !selectedTriggerId) return;
    if (!filteredTriggerEntries.some((entry) => entry.id === selectedTriggerId)) {
      setSelectedTriggerId(filteredTriggerEntries[0]?.id ?? null);
    }
  }, [filteredTriggerEntries, openDialog, selectedTriggerId]);

  const toggleTrigger = (trigger: AgentTrigger, enabled: boolean) => {
    const next = new Set(draft.allowedTriggers);
    if (enabled) next.add(trigger);
    else next.delete(trigger);
    onDraftChange({ allowedTriggers: [...next] });
  };

  const toggleOptionalBundle = (bundle: ToolBundle, enabled: boolean) => {
    const optionalSet = new Set(
      draft.toolBundles.filter((b) => !BASE_TOOL_BUNDLES.includes(b)),
    );
    if (enabled) optionalSet.add(bundle);
    else optionalSet.delete(bundle);
    onDraftChange({
      toolBundles: [...BASE_TOOL_BUNDLES, ...optionalSet],
    });
  };

  const toggleScriptTool = (id: string, enabled: boolean) => {
    const next = new Set(draft.scriptToolIds);
    if (enabled) next.add(id);
    else next.delete(id);
    onDraftChange({ scriptToolIds: [...next] });
  };

  const toggleConnectorProvider = (provider: string, enabled: boolean) => {
    const next = new Set(draft.enabledConnectorProviders);
    if (enabled) next.add(provider);
    else next.delete(provider);
    onDraftChange({ enabledConnectorProviders: [...next] });
  };

  const toggleWorker = (id: string, enabled: boolean) => {
    const next = new Set(draft.linkedWorkerAgentIds);
    if (enabled) next.add(id);
    else next.delete(id);
    const hasWorkers = next.size > 0;
    const bundleSet = new Set(draft.toolBundles);
    if (hasWorkers) bundleSet.add("delegate");
    onDraftChange({
      linkedWorkerAgentIds: [...next],
      toolBundles: [...bundleSet],
    });
  };

  const toggleScheduleEnabled = (scheduleId: string, enabled: boolean) => {
    onDraftChange({
      scheduleEnabledById: {
        ...draft.scheduleEnabledById,
        [scheduleId]: enabled,
      },
    });
  };

  const isToolEnabled = (entry: ToolEntry) => {
    switch (entry.kind) {
      case "connector":
        return draft.enabledConnectorProviders.includes(entry.provider);
      case "script":
        return draft.scriptToolIds.includes(entry.toolId);
      case "worker":
        return draft.linkedWorkerAgentIds.includes(entry.workerId);
      case "bundle":
        return draft.toolBundles.includes(entry.bundle);
    }
  };

  const toolSidebarItems: SidebarListItem[] = filteredToolEntries.map(
    (entry) => {
      const enabled = isToolEnabled(entry);
      const subtitle =
        entry.kind === "script"
          ? entry.key
          : entry.kind === "connector"
            ? connectedProviders.has(entry.provider)
              ? "Connected"
              : "Not connected"
            : undefined;

      const icon =
        entry.kind === "connector" ? (
          <ConnectorBrandIcon provider={entry.provider} className="size-3.5" />
        ) : (
          <WrenchIcon className="size-3.5 text-muted-foreground" />
        );

      return {
        id: entry.id,
        label: entry.label,
        subtitle,
        icon,
        enabled,
        testId:
          entry.kind === "connector"
            ? `agent-connector-${entry.provider}`
            : undefined,
      };
    },
  );

  const triggerSidebarItems: SidebarListItem[] = filteredTriggerEntries.map(
    (entry) => {
      if (entry.kind === "trigger") {
        const Icon =
          entry.trigger === "chatbot"
            ? ChatsCircleIcon
            : CalendarBlankIcon;
        return {
          id: entry.id,
          label: TRIGGER_LABELS[entry.trigger],
          icon: <Icon className="size-3.5 text-muted-foreground" />,
          enabled: draft.allowedTriggers.includes(entry.trigger),
          testId:
            entry.trigger === "schedule"
              ? "agent-trigger-schedule"
              : `agent-trigger-${entry.trigger}`,
        };
      }

      const schedule = agentSchedules.find((s) => s.id === entry.scheduleId);
      const enabled =
        draft.scheduleEnabledById[entry.scheduleId] ?? schedule?.enabled ?? false;

      return {
        id: entry.id,
        label: entry.label,
        subtitle: "Cron schedule",
        icon: <ClockIcon className="size-3.5 text-muted-foreground" />,
        enabled,
        testId: `agent-schedule-${entry.scheduleId}`,
      };
    },
  );

  const selectedTool = toolEntries.find((e) => e.id === selectedToolId) ?? null;
  const selectedTrigger =
    triggerEntries.find((e) => e.id === selectedTriggerId) ?? null;

  const renderToolDetail = () => {
    if (!selectedTool) {
      return (
        <p className="text-muted-foreground text-sm">
          Select a tool from the list to configure access.
        </p>
      );
    }

    const enabled = isToolEnabled(selectedTool);

    if (selectedTool.kind === "connector") {
      const connected = connectedProviders.has(selectedTool.provider);
      return (
        <>
          <SidebarDetailHeader
            icon={
              <ConnectorBrandIcon
                provider={selectedTool.provider}
                className="size-5"
              />
            }
            title={selectedTool.label}
            status={
              <span className="text-muted-foreground text-xs">
                {connected ? "Connected" : "Not connected"}
              </span>
            }
          />
          <p className="text-muted-foreground mb-6 text-sm">
            Allow this agent to use {selectedTool.label} through Composio.
            Connect an account on the Connectors page before running.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <Label htmlFor={`tool-enable-${selectedTool.id}`}>
              Enable for this agent
            </Label>
            <Switch
              id={`tool-enable-${selectedTool.id}`}
              checked={enabled}
              onCheckedChange={(checked) =>
                toggleConnectorProvider(selectedTool.provider, checked)
              }
              data-testid={`agent-connector-${selectedTool.provider}`}
            />
          </div>
        </>
      );
    }

    if (selectedTool.kind === "script") {
      return (
        <>
          <SidebarDetailHeader
            icon={<WrenchIcon className="size-5 text-muted-foreground" />}
            title={selectedTool.label}
            status={
              <span className="text-muted-foreground font-mono text-xs">
                {selectedTool.key}
              </span>
            }
          />
          <p className="text-muted-foreground mb-6 text-sm">
            Run this TypeScript script as a tool during agent execution.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <Label htmlFor={`tool-enable-${selectedTool.id}`}>
              Enable for this agent
            </Label>
            <Switch
              id={`tool-enable-${selectedTool.id}`}
              checked={enabled}
              onCheckedChange={(checked) =>
                toggleScriptTool(selectedTool.toolId, checked)
              }
            />
          </div>
        </>
      );
    }

    if (selectedTool.kind === "worker") {
      const worker = workers.find((w) => w.id === selectedTool.workerId);
      return (
        <>
          <SidebarDetailHeader
            title={selectedTool.label}
            status={
              <span className="text-muted-foreground text-xs">Worker agent</span>
            }
          />
          <p className="text-muted-foreground mb-6 text-sm">
            {worker?.description ??
              "Link this worker as a delegate target for batch runs."}
          </p>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <Label htmlFor={`tool-enable-${selectedTool.id}`}>
              Link worker
            </Label>
            <Switch
              id={`tool-enable-${selectedTool.id}`}
              checked={enabled}
              onCheckedChange={(checked) =>
                toggleWorker(selectedTool.workerId, checked)
              }
              disabled={!isWorkerAgentId(selectedTool.workerId)}
            />
          </div>
        </>
      );
    }

    return (
      <>
        <SidebarDetailHeader title={selectedTool.label} />
        <p className="text-muted-foreground mb-6 text-sm">
          Optional capability for this agent beyond the default tool set.
        </p>
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <Label htmlFor={`tool-enable-${selectedTool.id}`}>Enable</Label>
          <Switch
            id={`tool-enable-${selectedTool.id}`}
            checked={enabled}
            onCheckedChange={(checked) =>
              toggleOptionalBundle(selectedTool.bundle, checked)
            }
          />
        </div>
      </>
    );
  };

  const renderTriggerDetail = () => {
    if (!selectedTrigger) {
      return (
        <p className="text-muted-foreground text-sm">
          Select a trigger from the list to configure it.
        </p>
      );
    }

    if (selectedTrigger.kind === "cron") {
      const schedule = agentSchedules.find(
        (s) => s.id === selectedTrigger.scheduleId,
      );
      const enabled =
        draft.scheduleEnabledById[selectedTrigger.scheduleId] ??
        schedule?.enabled ??
        false;

      return (
        <>
          <SidebarDetailHeader
            icon={<ClockIcon className="size-5 text-muted-foreground" />}
            title={selectedTrigger.label}
            status={
              <span className="text-muted-foreground text-xs">Cron schedule</span>
            }
          />
          <p className="text-muted-foreground mb-6 text-sm">
            Recurring run for this agent. Toggle off to pause without deleting
            the schedule.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <Label htmlFor={`trigger-enable-${selectedTrigger.id}`}>
              Schedule enabled
            </Label>
            <Switch
              id={`trigger-enable-${selectedTrigger.id}`}
              checked={enabled}
              onCheckedChange={(checked) =>
                toggleScheduleEnabled(selectedTrigger.scheduleId, checked)
              }
              data-testid={`agent-schedule-${selectedTrigger.scheduleId}`}
            />
          </div>
        </>
      );
    }

    const { trigger } = selectedTrigger;
    const Icon =
      trigger === "chatbot" ? ChatsCircleIcon : CalendarBlankIcon;

    return (
      <>
        <SidebarDetailHeader
          icon={<Icon className="size-5 text-muted-foreground" />}
          title={TRIGGER_LABELS[trigger]}
        />
        <p className="text-muted-foreground mb-6 text-sm">
          {TRIGGER_DESCRIPTIONS[trigger]}
        </p>
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <Label htmlFor={`trigger-enable-${selectedTrigger.id}`}>Enabled</Label>
          <Switch
            id={`trigger-enable-${selectedTrigger.id}`}
            checked={draft.allowedTriggers.includes(trigger)}
            onCheckedChange={(checked) => toggleTrigger(trigger, checked)}
            data-testid={
              trigger === "schedule"
                ? "agent-trigger-schedule"
                : `agent-trigger-${trigger}`
            }
          />
        </div>
        {trigger === "schedule" && draft.allowedTriggers.includes("schedule") ? (
          <div className="mt-4">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setScheduleOpen(true)}
            >
              Add trigger
            </Button>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <>
      <AgentSettingsSidebarDialog
        open={openDialog === "triggers"}
        onOpenChange={(open) => !open && onOpenDialogChange(null)}
        title="Triggers"
        testId="agent-triggers-sidebar-dialog"
        items={triggerSidebarItems}
        selectedId={selectedTriggerId}
        onSelect={setSelectedTriggerId}
        searchQuery={triggerSearch}
        onSearchQueryChange={setTriggerSearch}
        searchPlaceholder="Search triggers…"
        detail={renderTriggerDetail()}
        footer={
          <SidebarDetailDoneButton onClick={() => onOpenDialogChange(null)} />
        }
      />

      <AgentSettingsSidebarDialog
        open={openDialog === "tools"}
        onOpenChange={(open) => !open && onOpenDialogChange(null)}
        title="Tools and access"
        testId="agent-tools-sidebar-dialog"
        items={toolSidebarItems}
        selectedId={selectedToolId}
        onSelect={setSelectedToolId}
        searchQuery={toolSearch}
        onSearchQueryChange={setToolSearch}
        searchPlaceholder="Search tools…"
        detail={
          <>
            <p className="text-muted-foreground mb-4 text-xs">
              Graph and task tools are always available in the background.
            </p>
            {renderToolDetail()}
          </>
        }
        footer={
          <SidebarDetailDoneButton onClick={() => onOpenDialogChange(null)} />
        }
      />

      <Dialog
        open={openDialog === "model"}
        onOpenChange={(open) => !open && onOpenDialogChange(null)}
      >
        <DialogContent className="max-w-xl" forceBackdrop>
          <DialogHeader>
            <DialogTitle>Model</DialogTitle>
            <DialogDescription>
              Default model for this agent when not overridden per run.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="agent-model-select">Model</Label>
            <Select
              value={draft.model || DEFAULT_MODEL_ID}
              onValueChange={(value) =>
                value && onDraftChange({ model: value })
              }
              items={MODEL_OPTIONS.map((m) => ({
                value: m.id,
                label: `${m.label} (${m.provider})`,
              }))}
            >
              <SelectTrigger id="agent-model-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label} — {model.provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenDialogChange(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScheduleSheet
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        presentation="dialog"
        teamspaceId={teamspaceId}
        accountId={accountId}
        instructions={[{ id: definition.id, name: definition.name }]}
      />
    </>
  );
}
