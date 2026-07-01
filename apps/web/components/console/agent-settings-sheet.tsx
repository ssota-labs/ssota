"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AtIcon,
  ChatsCircleIcon,
  ClockIcon,
  CpuIcon,
  PlusIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { Block } from "@blocknote/core";
import type { AgentDefinition, AgentTrigger } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import { Switch } from "@ssota/ui/components/ui/switch";
import { cn } from "@ssota/ui/lib/utils";
import { updateAgentDefinitionAction } from "@/app/actions";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import { AgentSkillBindings } from "@/components/console/skills-workspace";
import { CardListSheetPanel } from "@/components/card-list-sheet";
import {
  AgentSettingCard,
  AgentSettingEmpty,
  AgentSettingItem,
  AgentSettingItems,
} from "@/components/console/agent-setting-card";
import {
  AgentSettingsDialogs,
  type AgentSettingsDialogKind,
  type AgentSettingsDraft,
} from "@/components/console/agent-settings-dialogs";
import type { ConnectorConnection } from "@/components/connectors/connectors-view";
import type { ConnectorDef } from "@/lib/connect/connectors";
import { TRIGGER_LABELS, mergeToolBundles } from "@/lib/console/agent-tool-catalog";
import type { AgentScheduleSummary } from "@/lib/console/load-agent-settings-context";
import { DEFAULT_MODEL_ID, MODEL_OPTIONS } from "@/lib/chat/models";
import { describeRecurrence, cronToRecurrence } from "@/lib/schedules/recurrence";

const DocumentEditorEl = dynamic(
  () =>
    import("@/lib/page-runtime/catalog-document").then(
      (m) => m.DocumentEditorEl,
    ),
  { ssr: false },
);

type AgentSettingsSheetProps = {
  definition: AgentDefinition;
  teamspaceId: string;
  accountId: string;
  scriptToolIds: string[];
  scriptTools: Array<{ id: string; key: string; name: string }>;
  workers: AgentDefinition[];
  connectors: ConnectorDef[];
  connections: { user: ConnectorConnection[]; org: ConnectorConnection[] };
  schedules: AgentScheduleSummary[];
  onClose: () => void;
};

/** Default triggers always shown on the card (not added via sidebar). */
const DEFAULT_CARD_TRIGGERS: AgentTrigger[] = ["chat", "task"];

function buildDraft(
  definition: AgentDefinition,
  scriptToolIds: string[],
  schedules: AgentScheduleSummary[],
): AgentSettingsDraft {
  const agentSchedules = schedules.filter(
    (s) => s.agentDefinitionId === definition.id,
  );
  const allowedTriggers = definition.runPolicy.allowedTriggers ?? [];
  return {
    instructions: definition.instructions,
    toolBundles: mergeToolBundles(definition.toolBundles),
    allowedTriggers: [
      ...new Set([...allowedTriggers, ...DEFAULT_CARD_TRIGGERS]),
    ],
    model: definition.runPolicy.model ?? DEFAULT_MODEL_ID,
    scriptToolIds,
    linkedWorkerAgentIds: definition.runPolicy.linkedWorkerAgentIds ?? [],
    enabledConnectorProviders:
      definition.runPolicy.enabledConnectorProviders ?? [],
    scheduleEnabledById: Object.fromEntries(
      agentSchedules.map((s) => [s.id, s.enabled]),
    ),
    connectionTriggers: definition.runPolicy.connectionTriggers ?? [],
  };
}

export function AgentSettingsSheet({
  definition,
  teamspaceId,
  accountId,
  scriptToolIds: initialScriptToolIds,
  scriptTools,
  workers,
  connectors,
  connections,
  schedules,
  onClose,
}: AgentSettingsSheetProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(() =>
    buildDraft(definition, initialScriptToolIds, schedules),
  );
  const [openDialog, setOpenDialog] = useState<AgentSettingsDialogKind | null>(
    null,
  );
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(buildDraft(definition, initialScriptToolIds, schedules));
  }, [definition, initialScriptToolIds, schedules]);

  const agentSchedules = schedules.filter(
    (s) => s.agentDefinitionId === definition.id,
  );

  const patchDraft = (patch: Partial<AgentSettingsDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleInstructionsSave = useCallback((blocks: Block[]) => {
    setDraft((current) => ({
      ...current,
      instructions: blocks as AgentDefinition["instructions"],
    }));
  }, []);

  const toggleTrigger = (trigger: AgentTrigger, enabled: boolean) => {
    const next = new Set(draft.allowedTriggers);
    if (enabled) next.add(trigger);
    else next.delete(trigger);
    patchDraft({ allowedTriggers: [...next] });
  };

  const toggleScheduleEnabled = (scheduleId: string, enabled: boolean) => {
    patchDraft({
      scheduleEnabledById: {
        ...draft.scheduleEnabledById,
        [scheduleId]: enabled,
      },
    });
  };

  const toggleConnectionTrigger = (triggerId: string, enabled: boolean) => {
    patchDraft({
      connectionTriggers: draft.connectionTriggers.map((t) =>
        t.id === triggerId ? { ...t, enabled } : t,
      ),
    });
  };

  const modelLabel =
    MODEL_OPTIONS.find((m) => m.id === draft.model)?.label ?? "Auto";

  const modelProvider =
    MODEL_OPTIONS.find((m) => m.id === draft.model)?.provider ?? "";

  const connectedProviders = useMemo(() => {
    const map = new Map<string, ConnectorConnection[]>();
    for (const c of connections.user) {
      const list = map.get(c.connector) ?? [];
      list.push(c);
      map.set(c.connector, list);
    }
    for (const c of connections.org) {
      const list = map.get(c.connector) ?? [];
      list.push(c);
      map.set(c.connector, list);
    }
    return map;
  }, [connections]);

  const linkedScriptTools = scriptTools.filter((t) =>
    draft.scriptToolIds.includes(t.id),
  );

  const enabledConnectors = connectors.filter((c) =>
    draft.enabledConnectorProviders.includes(c.provider),
  );

  const chatLabel = `New chat with ${definition.name}`;

  const handleSave = () => {
    startTransition(async () => {
      const bundles = mergeToolBundles(draft.toolBundles);
      if (draft.linkedWorkerAgentIds.length > 0 && !bundles.includes("delegate")) {
        bundles.push("delegate");
      }

      const allowedTriggers = [...draft.allowedTriggers];
      if (agentSchedules.length > 0 && !allowedTriggers.includes("schedule")) {
        allowedTriggers.push("schedule");
      }
      if (
        draft.connectionTriggers.some((t) => t.enabled) &&
        !allowedTriggers.includes("chatbot")
      ) {
        allowedTriggers.push("chatbot");
      }

      await updateAgentDefinitionAction(teamspaceId, {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        instructions: draft.instructions,
        isMain: definition.isMain,
        referenceOnly: definition.referenceOnly,
        toolBundles: bundles,
        runPolicy: {
          ...definition.runPolicy,
          model: draft.model,
          allowedTriggers,
          linkedWorkerAgentIds: draft.linkedWorkerAgentIds,
          enabledConnectorProviders: draft.enabledConnectorProviders,
          connectionTriggers: draft.connectionTriggers,
        },
        scriptToolIds: draft.scriptToolIds,
      });

      const schedulePatches = agentSchedules.filter(
        (schedule) =>
          draft.scheduleEnabledById[schedule.id] !== undefined &&
          draft.scheduleEnabledById[schedule.id] !== schedule.enabled,
      );
      await Promise.all(
        schedulePatches.map((schedule) =>
          fetch(`/api/schedules/${schedule.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              teamspaceId,
              accountId,
              enabled: draft.scheduleEnabledById[schedule.id],
            }),
          }).then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to update schedule (${res.status})`);
            }
          }),
        ),
      );
      router.refresh();
      onClose();
    });
  };

  return (
    <>
      <CardListSheetPanel
        title="Settings"
        subtitle={definition.name}
        sheetSize="inspector"
        onClose={onClose}
        headerAction={
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleSave}
            data-testid="agent-settings-save"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        }
      >
        <div
          className="space-y-3"
          data-testid="agent-settings-sheet"
        >
          <AgentSettingCard
            title="Triggers"
            description="When should this agent run?"
            testId="agent-settings-triggers-card"
            footer={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-fit justify-start gap-2"
                data-testid="agent-triggers-add"
                onClick={() => setOpenDialog("add-trigger")}
              >
                <PlusIcon className="size-3.5" aria-hidden />
                Add trigger
              </Button>
            }
          >
            <AgentSettingItems>
              <AgentSettingItem
                icon={<ChatsCircleIcon className="size-3.5 text-muted-foreground" />}
                title={chatLabel}
                subtitle={TRIGGER_LABELS.chat}
                trailing={
                  <Switch
                    checked={draft.allowedTriggers.includes("chat")}
                    onCheckedChange={(checked) => toggleTrigger("chat", checked)}
                    data-testid="agent-trigger-chat"
                    aria-label={chatLabel}
                  />
                }
              />
              <AgentSettingItem
                icon={<AtIcon className="size-3.5 text-muted-foreground" />}
                title={TRIGGER_LABELS.task}
                trailing={
                  <Checkbox
                    checked={draft.allowedTriggers.includes("task")}
                    onCheckedChange={(checked) =>
                      toggleTrigger("task", checked === true)
                    }
                    data-testid="agent-trigger-task"
                    aria-label={TRIGGER_LABELS.task}
                  />
                }
              />
              {draft.connectionTriggers.map((trigger) => (
                <AgentSettingItem
                  key={trigger.id}
                  icon={
                    <ConnectorBrandIcon
                      provider={trigger.provider}
                      className="size-3.5"
                    />
                  }
                  title={trigger.label}
                  subtitle={trigger.provider}
                  trailing={
                    <Switch
                      checked={trigger.enabled}
                      onCheckedChange={(checked) =>
                        toggleConnectionTrigger(trigger.id, checked)
                      }
                      data-testid={`agent-connection-trigger-${trigger.id}`}
                      aria-label={trigger.label}
                    />
                  }
                />
              ))}
              {agentSchedules.map((schedule) => {
                const rec = cronToRecurrence(
                  schedule.cronExpression,
                  schedule.timezone,
                );
                const label = rec
                  ? describeRecurrence(rec)
                  : schedule.cronExpression;
                const enabled =
                  draft.scheduleEnabledById[schedule.id] ?? schedule.enabled;
                return (
                  <AgentSettingItem
                    key={schedule.id}
                    className="group"
                    icon={
                      <ClockIcon className="size-3.5 text-muted-foreground" />
                    }
                    title={
                      <button
                        type="button"
                        className={cn(
                          "text-left text-sm underline-offset-2 hover:underline",
                        )}
                        data-testid={`agent-schedule-edit-${schedule.id}`}
                        onClick={() => setEditingScheduleId(schedule.id)}
                      >
                        {label}
                      </button>
                    }
                    subtitle="Cron schedule"
                    trailing={
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          toggleScheduleEnabled(schedule.id, checked)
                        }
                        data-testid={`agent-schedule-${schedule.id}`}
                        aria-label={label}
                      />
                    }
                  />
                );
              })}
            </AgentSettingItems>
          </AgentSettingCard>

          <AgentSettingCard
            title="Instructions"
            description="What should the agent do every time it runs?"
            testId="agent-settings-instructions-card"
          >
            <div
              className="min-h-[200px] overflow-y-auto rounded-md border border-border/60 bg-background/40 p-2"
              data-testid="agent-instructions-editor"
            >
              <DocumentEditorEl
                compact
                content={draft.instructions}
                onSave={handleInstructionsSave}
              />
            </div>
          </AgentSettingCard>

          <AgentSettingCard
            title="Tools and access"
            description="Composio connectors and TypeScript scripts for this agent."
            testId="agent-settings-tools-card"
            onOpen={() => setOpenDialog("tools")}
          >
            {enabledConnectors.length === 0 && linkedScriptTools.length === 0 ? (
              <AgentSettingEmpty>
                No connectors or scripts selected yet
              </AgentSettingEmpty>
            ) : (
              <AgentSettingItems>
                {enabledConnectors.map((connector) => {
                  const connected = connectedProviders.has(connector.provider);
                  const count =
                    connectedProviders.get(connector.provider)?.length ?? 0;
                  return (
                    <AgentSettingItem
                      key={connector.provider}
                      icon={
                        <ConnectorBrandIcon
                          provider={connector.provider}
                          className="size-3.5"
                        />
                      }
                      title={connector.label}
                      subtitle={
                        connected ? "Composio connector" : "Enabled — not connected"
                      }
                      trailing={
                        connected
                          ? count > 1
                            ? `${count} accounts`
                            : "Connected"
                          : "Pending"
                      }
                    />
                  );
                })}
                {linkedScriptTools.map((tool) => (
                  <AgentSettingItem
                    key={tool.id}
                    icon={
                      <WrenchIcon className="size-3.5 text-muted-foreground" />
                    }
                    title={tool.name}
                    subtitle={tool.key}
                    trailing="TypeScript"
                  />
                ))}
              </AgentSettingItems>
            )}
          </AgentSettingCard>

          <AgentSettingCard
            title="Model"
            description="Default model for agent runs."
            testId="agent-settings-model-card"
            onOpen={() => setOpenDialog("model")}
          >
            <AgentSettingItems>
              <AgentSettingItem
                icon={<CpuIcon className="size-3.5 text-muted-foreground" />}
                title={modelLabel}
                subtitle={modelProvider || "Default model"}
              />
            </AgentSettingItems>
          </AgentSettingCard>

          <AgentSettingCard
            title="Skills"
            description="Runtime skills loaded via read_skill."
            testId="agent-settings-skills-card"
          >
            <AgentSkillBindings
              teamspaceId={teamspaceId}
              agentDefinitionId={definition.id}
            />
          </AgentSettingCard>
        </div>
      </CardListSheetPanel>

      <AgentSettingsDialogs
        definition={definition}
        draft={draft}
        onDraftChange={patchDraft}
        workers={workers}
        scriptTools={scriptTools}
        connectors={connectors}
        connections={connections}
        schedules={schedules}
        teamspaceId={teamspaceId}
        accountId={accountId}
        openDialog={openDialog}
        onOpenDialogChange={setOpenDialog}
        editingScheduleId={editingScheduleId}
        onEditingScheduleIdChange={setEditingScheduleId}
      />
    </>
  );
}
