"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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

const DocumentEditorEl = dynamic(
  () => import("@/lib/page-runtime/catalog-document").then((m) => m.DocumentEditorEl),
  { ssr: false },
);

export type AgentSettingsDraft = {
  instructions: AgentDefinition["instructions"];
  toolBundles: ToolBundle[];
  allowedTriggers: AgentTrigger[];
  model: string;
  scriptToolIds: string[];
  linkedWorkerAgentIds: string[];
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
  | "instructions"
  | "tools"
  | "model"
  | "add-schedule";

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
  const [instructionDraft, setInstructionDraft] = useState(draft.instructions);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    if (openDialog === "instructions") {
      setInstructionDraft(draft.instructions);
    }
  }, [openDialog, draft.instructions]);

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

  return (
    <>
      <Dialog
        open={openDialog === "triggers"}
        onOpenChange={(open) => !open && onOpenDialogChange(null)}
      >
        <DialogContent className="max-w-2xl" forceBackdrop>
          <DialogHeader>
            <DialogTitle>Triggers</DialogTitle>
            <DialogDescription>
              Choose how this agent is invoked. Cron schedules list each recurring
              run below once enabled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{TRIGGER_LABELS.chatbot}</p>
                <p className="text-muted-foreground text-xs">
                  Slack, Discord, or Telegram bots connected via Chat.
                </p>
              </div>
              <Switch
                checked={draft.allowedTriggers.includes("chatbot")}
                onCheckedChange={(checked) => toggleTrigger("chatbot", checked)}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{TRIGGER_LABELS.task}</p>
                <p className="text-muted-foreground text-xs">
                  Spawned as a task executor from the task board.
                </p>
              </div>
              <Switch
                checked={draft.allowedTriggers.includes("task")}
                onCheckedChange={(checked) => toggleTrigger("task", checked)}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Cron schedules</p>
                <p className="text-muted-foreground text-xs">
                  Allow recurring runs. Add each schedule (e.g. weekly) below.
                </p>
              </div>
              <Switch
                checked={draft.allowedTriggers.includes("schedule")}
                onCheckedChange={(checked) =>
                  toggleTrigger("schedule", checked)
                }
                data-testid="agent-trigger-schedule"
              />
            </div>

            {draft.allowedTriggers.includes("schedule") ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Schedules</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setScheduleOpen(true)}
                  >
                    Add schedule
                  </Button>
                </div>
                {agentSchedules.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No schedules yet for this agent.
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-md border">
                    {agentSchedules.map((schedule) => {
                      const rec = cronToRecurrence(
                        schedule.cronExpression,
                        schedule.timezone,
                      );
                      const label = rec
                        ? describeRecurrence(rec)
                        : schedule.cronExpression;
                      return (
                        <li
                          key={schedule.id}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <span>{label}</span>
                          <span className="text-muted-foreground text-xs">
                            {schedule.enabled ? "On" : "Off"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenDialogChange(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDialog === "instructions"}
        onOpenChange={(open) => !open && onOpenDialogChange(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden" forceBackdrop>
          <DialogHeader>
            <DialogTitle>Instructions</DialogTitle>
            <DialogDescription>
              What should this agent do every time it runs?
            </DialogDescription>
          </DialogHeader>
          <div
            className="max-h-[50vh] min-h-[240px] overflow-y-auto rounded-md border p-2"
            data-testid="agent-instructions-editor"
          >
            <DocumentEditorEl
              compact
              content={instructionDraft}
              onSave={(blocks) => setInstructionDraft(blocks as typeof instructionDraft)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenDialogChange(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                onDraftChange({ instructions: instructionDraft });
                onOpenDialogChange(null);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDialog === "tools"}
        onOpenChange={(open) => !open && onOpenDialogChange(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto" forceBackdrop>
          <DialogHeader>
            <DialogTitle>Tools and access</DialogTitle>
            <DialogDescription>
              Graph, tasks, Composio connectors, and TypeScript scripts are always
              on. Link specific scripts and optional capabilities below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Always included</Label>
              <ul className="divide-y divide-border rounded-md border">
                {BASE_TOOL_BUNDLES.map((bundle) => (
                  <li
                    key={bundle}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>{TOOL_BUNDLE_LABELS[bundle]}</span>
                    <span className="text-muted-foreground text-xs">On</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Optional capabilities</Label>
              <ul className="divide-y divide-border rounded-md border">
                {OPTIONAL_TOOL_BUNDLES.map((bundle) => (
                  <li
                    key={bundle}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="text-sm">{TOOL_BUNDLE_LABELS[bundle]}</span>
                    <Switch
                      checked={draft.toolBundles.includes(bundle)}
                      onCheckedChange={(checked) =>
                        toggleOptionalBundle(bundle, checked)
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Composio connectors</Label>
              <p className="text-muted-foreground text-xs">
                Connected accounts from the Connectors page. All agents can use
                them when connected.
              </p>
              <ul className="divide-y divide-border rounded-md border">
                {connectors.map((connector) => {
                  const connected = connectedProviders.has(connector.provider);
                  return (
                    <li
                      key={connector.provider}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <ConnectorBrandIcon
                        provider={connector.provider}
                        className="size-4"
                      />
                      <span className="flex-1">{connector.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {connected ? "Connected" : "Not connected"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-2">
              <Label>TypeScript scripts</Label>
              {scriptTools.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No TypeScript script tools in this project yet.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-md border">
                  {scriptTools.map((tool) => (
                    <li
                      key={tool.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{tool.name}</p>
                        <p className="text-muted-foreground truncate font-mono text-xs">
                          {tool.key}
                        </p>
                      </div>
                      <Switch
                        checked={draft.scriptToolIds.includes(tool.id)}
                        onCheckedChange={(checked) =>
                          toggleScriptTool(tool.id, checked)
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label>Worker agents</Label>
              <p className="text-muted-foreground text-xs">
                Link batch workers as delegate targets for this agent.
              </p>
              <ul className="divide-y divide-border rounded-md border">
                {workers.map((worker) => (
                  <li
                    key={worker.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{worker.name}</p>
                      <p className="text-muted-foreground line-clamp-1 text-xs">
                        {worker.description}
                      </p>
                    </div>
                    <Switch
                      checked={draft.linkedWorkerAgentIds.includes(worker.id)}
                      onCheckedChange={(checked) =>
                        toggleWorker(worker.id, checked)
                      }
                      disabled={!isWorkerAgentId(worker.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenDialogChange(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        teamspaceId={teamspaceId}
        accountId={accountId}
        instructions={[{ id: definition.id, name: definition.name }]}
      />
    </>
  );
}
