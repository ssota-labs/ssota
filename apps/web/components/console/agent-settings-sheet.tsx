"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarBlankIcon,
  ChatCircleIcon,
  ChatsCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuIcon,
  FileTextIcon,
  LightningIcon,
  ListChecksIcon,
  RobotIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { AgentDefinition, AgentTrigger } from "@ssota/contracts";
import { blockNoteContentToText } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { updateAgentDefinitionAction } from "@/app/actions";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import { ScheduleSheetPanel } from "@/components/schedules/schedule-sheet-panel";
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
import {
  BASE_TOOL_BUNDLES,
  TRIGGER_LABELS,
  TOOL_BUNDLE_LABELS,
  mergeToolBundles,
} from "@/lib/console/agent-tool-catalog";
import type { AgentScheduleSummary } from "@/lib/console/load-agent-settings-context";
import { DEFAULT_MODEL_ID, MODEL_OPTIONS } from "@/lib/chat/models";
import { describeRecurrence, cronToRecurrence } from "@/lib/schedules/recurrence";

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

const TRIGGER_ICONS: Partial<Record<AgentTrigger, typeof ChatCircleIcon>> = {
  chat: ChatCircleIcon,
  chatbot: ChatsCircleIcon,
  task: ListChecksIcon,
  schedule: CalendarBlankIcon,
};

function buildDraft(
  definition: AgentDefinition,
  scriptToolIds: string[],
): AgentSettingsDraft {
  return {
    instructions: definition.instructions,
    toolBundles: mergeToolBundles(definition.toolBundles),
    allowedTriggers: definition.runPolicy.allowedTriggers ?? [],
    model: definition.runPolicy.model ?? DEFAULT_MODEL_ID,
    scriptToolIds,
    linkedWorkerAgentIds: definition.runPolicy.linkedWorkerAgentIds ?? [],
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
    buildDraft(definition, initialScriptToolIds),
  );
  const [openDialog, setOpenDialog] = useState<AgentSettingsDialogKind | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(buildDraft(definition, initialScriptToolIds));
  }, [definition, initialScriptToolIds]);

  const agentSchedules = schedules.filter(
    (s) => s.agentDefinitionId === definition.id,
  );

  const instructionPreview = useMemo(() => {
    const text = blockNoteContentToText(draft.instructions).trim();
    if (!text) return null;
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }, [draft.instructions]);

  const activeTriggers = draft.allowedTriggers.filter(
    (t) => t === "chat" || t === "chatbot" || t === "task" || t === "schedule",
  );

  const optionalBundles = draft.toolBundles.filter(
    (b) => !BASE_TOOL_BUNDLES.includes(b),
  );

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

  const linkedWorkers = workers.filter((w) =>
    draft.linkedWorkerAgentIds.includes(w.id),
  );

  const patchDraft = (patch: Partial<AgentSettingsDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const bundles = mergeToolBundles(draft.toolBundles);
      if (draft.linkedWorkerAgentIds.length > 0 && !bundles.includes("delegate")) {
        bundles.push("delegate");
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
          allowedTriggers: draft.allowedTriggers,
          linkedWorkerAgentIds: draft.linkedWorkerAgentIds,
        },
        scriptToolIds: draft.scriptToolIds,
      });
      router.refresh();
      onClose();
    });
  };

  return (
    <>
      <ScheduleSheetPanel
        title="Settings"
        subtitle={definition.name}
        sheetSize="inspector"
        onClose={onClose}
        footer={
          <Button
            type="button"
            className="w-full"
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
            onOpen={() => setOpenDialog("triggers")}
          >
            {activeTriggers.length === 0 && agentSchedules.length === 0 ? (
              <AgentSettingEmpty>No triggers enabled</AgentSettingEmpty>
            ) : (
              <AgentSettingItems>
                {activeTriggers.map((trigger) => {
                  const Icon = TRIGGER_ICONS[trigger] ?? LightningIcon;
                  return (
                    <AgentSettingItem
                      key={trigger}
                      icon={<Icon className="size-3.5 text-muted-foreground" />}
                      title={TRIGGER_LABELS[trigger]}
                      trailing={
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <CheckCircleIcon
                            weight="fill"
                            className="size-3 text-primary"
                          />
                          On
                        </Badge>
                      }
                    />
                  );
                })}
                {draft.allowedTriggers.includes("schedule")
                  ? agentSchedules.map((schedule) => {
                      const rec = cronToRecurrence(
                        schedule.cronExpression,
                        schedule.timezone,
                      );
                      const label = rec
                        ? describeRecurrence(rec)
                        : schedule.cronExpression;
                      return (
                        <AgentSettingItem
                          key={schedule.id}
                          icon={
                            <ClockIcon className="size-3.5 text-muted-foreground" />
                          }
                          title={label}
                          subtitle="Scheduled run"
                          trailing={schedule.enabled ? "On" : "Off"}
                        />
                      );
                    })
                  : null}
              </AgentSettingItems>
            )}
          </AgentSettingCard>

          <AgentSettingCard
            title="Instructions"
            description="What should the agent do every time it runs?"
            testId="agent-settings-instructions-card"
            onOpen={() => setOpenDialog("instructions")}
          >
            {instructionPreview ? (
              <AgentSettingItems>
                <AgentSettingItem
                  icon={
                    <FileTextIcon className="size-3.5 text-muted-foreground" />
                  }
                  title="Current instructions"
                  subtitle={instructionPreview}
                />
              </AgentSettingItems>
            ) : (
              <AgentSettingEmpty>No instructions yet</AgentSettingEmpty>
            )}
          </AgentSettingCard>

          <AgentSettingCard
            title="Tools and access"
            description="What can the agent use?"
            testId="agent-settings-tools-card"
            onOpen={() => setOpenDialog("tools")}
          >
            <AgentSettingItems>
              {BASE_TOOL_BUNDLES.map((bundle) => (
                <AgentSettingItem
                  key={bundle}
                  icon={<WrenchIcon className="size-3.5 text-muted-foreground" />}
                  title={TOOL_BUNDLE_LABELS[bundle]}
                  subtitle="Always included"
                  trailing="On"
                />
              ))}
              {optionalBundles.map((bundle) => (
                <AgentSettingItem
                  key={bundle}
                  icon={<WrenchIcon className="size-3.5 text-muted-foreground" />}
                  title={TOOL_BUNDLE_LABELS[bundle]}
                  trailing="On"
                />
              ))}
              {draft.toolBundles.includes("connectors")
                ? connectors
                    .filter((c) => connectedProviders.has(c.provider))
                    .map((connector) => {
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
                          subtitle="Composio connector"
                          trailing={
                            count > 1 ? `${count} accounts` : "Connected"
                          }
                        />
                      );
                    })
                : null}
              {linkedScriptTools.map((tool) => (
                <AgentSettingItem
                  key={tool.id}
                  icon={<WrenchIcon className="size-3.5 text-muted-foreground" />}
                  title={tool.name}
                  subtitle={tool.key}
                  trailing="Script"
                />
              ))}
              {linkedWorkers.map((worker) => (
                <AgentSettingItem
                  key={worker.id}
                  icon={<RobotIcon className="size-3.5 text-muted-foreground" />}
                  title={worker.name}
                  subtitle={worker.description || "Worker agent"}
                  trailing="Worker"
                />
              ))}
            </AgentSettingItems>
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
        </div>
      </ScheduleSheetPanel>

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
      />
    </>
  );
}
