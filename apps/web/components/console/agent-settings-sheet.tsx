"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AtIcon,
  ChatsCircleIcon,
  ClockIcon,
  GearIcon,
  LightbulbIcon,
  LinkBreakIcon,
  PlusIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { Block } from "@blocknote/core";
import type {
  AgentDefinition,
  AgentConnectorBinding,
  AgentTrigger,
  ConnectionTrigger,
  SkillIndex,
  WorkerIndex,
} from "@ssota/contracts";
import { deriveEnabledConnectorProviders } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ssota/ui/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ssota/ui/components/ui/popover";
import { Switch } from "@ssota/ui/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ssota/ui/components/ui/tooltip";
import { Input } from "@ssota/ui/components/ui/input";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { Label } from "@ssota/ui/components/ui/label";
import {
  ScheduleSheet,
  type ScheduleEditTarget,
} from "@/components/schedules/schedule-sheet";
import { updateAgentDefinitionAction, updateTeamspaceMainConfigAction } from "@/app/actions";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import { CardListSheetPanel } from "@/components/card-list-sheet";
import { AgentSettingCard } from "@/components/console/agent-setting-card";
import {
  AgentSettingsDialogs,
  type AgentSettingsDialogKind,
  type AgentSettingsDraft,
} from "@/components/console/agent-settings-dialogs";
import type { ConnectorConnection } from "@/components/connectors/connectors-view";
import type { ConnectorDef } from "@/lib/connect/connectors";
import type { InboundChannelStatus } from "@/lib/connect/inbound-channels";
import { TRIGGER_LABELS, mergeToolBundles } from "@/lib/console/agent-tool-catalog";
import type { AgentScheduleSummary } from "@/lib/console/load-agent-settings-context";
import { AgentModelPicker } from "@/components/console/agent-model-picker";
import { AgentConnectorToolPermissionsPopoverContent } from "@/components/console/agent-connector-tool-permissions-popover";
import { DEFAULT_MODEL_ID } from "@/lib/chat/models";
import { describeRecurrence, cronToRecurrence } from "@/lib/schedules/recurrence";
import {
  isAgentSettingsDraftDirty,
  resolveAllowedTriggersForSave,
  resolveConnectorBindingsForSave,
  resolveToolBundlesForSave,
} from "@/lib/console/agent-settings-save-snapshot";
import {
  connectionDisplayLabel,
  migrateConnectorBindings,
  patchConnectorBindingsDraft,
  removeConnectorBinding,
  updateBindingInList,
} from "@/lib/console/agent-connector-bindings";
import { prefetchConnectionToolSettings } from "@/lib/hooks/use-connection-tool-settings";

const DocumentEditorEl = dynamic(
  () =>
    import("@/lib/page-runtime/catalog-document").then(
      (m) => m.DocumentEditorEl,
    ),
  { ssr: false },
);

function BoundConnectionToolPermissionsControl({
  label,
  binding,
  teamspaceId,
  providerLabel,
  onBindingChange,
}: {
  label: string;
  binding: AgentConnectorBinding;
  teamspaceId: string;
  providerLabel: string;
  onBindingChange: (next: AgentConnectorBinding) => void;
}) {
  return (
    <Popover modal={false}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Tool permissions for ${label}`}
                  data-testid={`agent-bound-connection-settings-${binding.scope}-${binding.connectionId}`}
                  onPointerEnter={() =>
                    prefetchConnectionToolSettings({
                      teamspaceId,
                      connectionId: binding.connectionId,
                      toolkit: binding.provider,
                      scope: binding.scope,
                    })
                  }
                  onFocus={() =>
                    prefetchConnectionToolSettings({
                      teamspaceId,
                      connectionId: binding.connectionId,
                      toolkit: binding.provider,
                      scope: binding.scope,
                    })
                  }
                />
              }
            />
          }
        >
          <GearIcon className="size-4" aria-hidden />
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={5}>
          Tool permissions
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="w-[min(20rem,92vw)] p-3"
        data-testid="agent-tool-permissions-popover"
        initialFocus={false}
        finalFocus={false}
      >
        <AgentConnectorToolPermissionsPopoverContent
          binding={binding}
          teamspaceId={teamspaceId}
          providerLabel={providerLabel}
          onBindingChange={onBindingChange}
        />
      </PopoverContent>
    </Popover>
  );
}

type AgentSettingsSheetProps = {
  definition: AgentDefinition;
  mode?: "create" | "edit";
  /** panel = docked CardListSheet(기본), page = 에이전트 디테일 페이지 설정 탭. */
  presentation?: "panel" | "page";
  settingsTarget?: "main" | "agent";
  teamspaceId: string;
  accountId: string;
  linkedWorkerIds: string[];
  boundSkillIds: string[];
  skillCatalog: SkillIndex[];
  storedWorkers: WorkerIndex[];
  workers: AgentDefinition[];
  connectors: ConnectorDef[];
  connections: { user: ConnectorConnection[]; org: ConnectorConnection[] };
  inboundChannels: InboundChannelStatus[];
  channelsHref: string;
  connectionsHref: string;
  schedules: AgentScheduleSummary[];
  onClose: () => void;
  onCreated?: (definition: AgentDefinition) => void;
  registerRequestClose?: (
    requestClose: ((action: () => void) => void) | null,
  ) => void;
};

/** Default triggers always shown on the card (not added via sidebar). */
function defaultCardTriggers(settingsTarget: "main" | "agent"): AgentTrigger[] {
  return settingsTarget === "main" ? ["chat"] : ["chat", "task"];
}

function buildDraft(
  definition: AgentDefinition,
  linkedWorkerIds: string[],
  boundSkillIds: string[],
  schedules: AgentScheduleSummary[],
  connections: { user: ConnectorConnection[]; org: ConnectorConnection[] },
  settingsTarget: "main" | "agent",
): AgentSettingsDraft {
  const agentSchedules = schedules.filter(
    (s) => s.agentDefinitionId === definition.id,
  );
  const allowedTriggers = (definition.runPolicy.allowedTriggers ?? []).filter(
    (trigger) => settingsTarget !== "main" || trigger !== "task",
  );
  const connectorBindings = migrateConnectorBindings(
    definition.runPolicy.enabledConnectorProviders ?? [],
    connections,
    definition.runPolicy.connectorBindings,
  );
  return {
    name: definition.name,
    description: definition.description,
    instructions: definition.instructions,
    toolBundles: mergeToolBundles(definition.toolBundles),
    allowedTriggers: [
      ...new Set([...allowedTriggers, ...defaultCardTriggers(settingsTarget)]),
    ],
    model: definition.runPolicy.model ?? DEFAULT_MODEL_ID,
    linkedWorkerIds,
    linkedWorkerAgentIds: definition.runPolicy.linkedWorkerAgentIds ?? [],
    connectorBindings,
    enabledConnectorProviders:
      definition.runPolicy.enabledConnectorProviders ?? [],
    scheduleEnabledById: Object.fromEntries(
      agentSchedules.map((s) => [s.id, s.enabled]),
    ),
    connectionTriggers: definition.runPolicy.connectionTriggers ?? [],
    boundSkillIds,
  };
}

export function AgentSettingsSheet({
  definition,
  mode = "edit",
  presentation = "panel",
  settingsTarget = "agent",
  teamspaceId,
  accountId,
  linkedWorkerIds: initialLinkedWorkerIds,
  boundSkillIds: initialBoundSkillIds,
  skillCatalog,
  storedWorkers,
  workers,
  connectors,
  connections,
  inboundChannels,
  channelsHref,
  connectionsHref,
  schedules,
  onClose,
  onCreated,
  registerRequestClose,
}: AgentSettingsSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState(() =>
    buildDraft(
      definition,
      initialLinkedWorkerIds,
      initialBoundSkillIds,
      schedules,
      connections,
      settingsTarget,
    ),
  );
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const pendingCloseActionRef = useRef<(() => void) | null>(null);
  const [openDialog, setOpenDialog] = useState<AgentSettingsDialogKind | null>(
    null,
  );
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null,
  );
  const [editingSlackTriggerId, setEditingSlackTriggerId] = useState<
    string | null
  >(null);
  const schedulePopoverAnchorRef = useRef<HTMLDivElement | null>(null);
  const ignoreNextScheduleRowPressRef = useRef(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(
      buildDraft(
        definition,
        initialLinkedWorkerIds,
        initialBoundSkillIds,
        schedules,
        connections,
        settingsTarget,
      ),
    );
  }, [definition, initialLinkedWorkerIds, initialBoundSkillIds, schedules, connections, settingsTarget]);

  useEffect(() => {
    for (const binding of draft.connectorBindings) {
      prefetchConnectionToolSettings({
        teamspaceId,
        connectionId: binding.connectionId,
        toolkit: binding.provider,
        scope: binding.scope,
      });
    }
  }, [teamspaceId, draft.connectorBindings]);

  const agentSchedules = schedules.filter(
    (s) => s.agentDefinitionId === definition.id,
  );

  const savedDraft = useMemo(
    () =>
      buildDraft(
        definition,
        initialLinkedWorkerIds,
        initialBoundSkillIds,
        schedules,
        connections,
        settingsTarget,
      ),
    [definition, initialLinkedWorkerIds, initialBoundSkillIds, schedules, connections, settingsTarget],
  );

  const isDirty = useMemo(
    () =>
      isAgentSettingsDraftDirty(
        draft,
        savedDraft,
        agentSchedules,
        settingsTarget,
      ),
    [draft, savedDraft, agentSchedules, settingsTarget],
  );

  const requestClose = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      if (discardDialogOpen) {
        return;
      }
      pendingCloseActionRef.current = action;
      setDiscardDialogOpen(true);
    },
    [discardDialogOpen, isDirty],
  );

  const handleClose = useCallback(() => {
    requestClose(onClose);
  }, [requestClose, onClose]);

  const handleDiscardDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      pendingCloseActionRef.current = null;
      setDiscardDialogOpen(false);
    }
  }, []);

  const handleDiscardChanges = useCallback(() => {
    const action = pendingCloseActionRef.current;
    pendingCloseActionRef.current = null;
    setDiscardDialogOpen(false);
    action?.();
  }, []);

  useEffect(() => {
    registerRequestClose?.(requestClose);
    return () => registerRequestClose?.(null);
  }, [registerRequestClose, requestClose]);

  const editingSchedule = editingScheduleId
    ? agentSchedules.find((s) => s.id === editingScheduleId)
    : undefined;

  const editingSlackTrigger = editingSlackTriggerId
    ? draft.connectionTriggers.find((t) => t.id === editingSlackTriggerId)
    : undefined;

  const scheduleEditTarget: ScheduleEditTarget | undefined = editingSchedule
    ? {
        id: editingSchedule.id,
        agentDefinitionId: editingSchedule.agentDefinitionId,
        targetType: "agent",
        cronExpression: editingSchedule.cronExpression,
        timezone: editingSchedule.timezone,
        enabled: editingSchedule.enabled,
      }
    : undefined;

  const patchDraft = (patch: Partial<AgentSettingsDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const removeBindingFromDraft = (
    scope: AgentConnectorBinding["scope"],
    connectionId: string,
  ) => {
    patchDraft(
      patchConnectorBindingsDraft(
        removeConnectorBinding(draft.connectorBindings, scope, connectionId),
      ),
    );
  };

  const updateBindingToolPermissions = (
    scope: AgentConnectorBinding["scope"],
    connectionId: string,
    updater: (binding: AgentConnectorBinding) => AgentConnectorBinding,
  ) => {
    patchDraft(
      patchConnectorBindingsDraft(
        updateBindingInList(
          draft.connectorBindings,
          scope,
          connectionId,
          updater,
        ),
      ),
    );
  };

  const handleInstructionsSave = useCallback((blocks: Block[]) => {
    setDraft((current) => ({
      ...current,
      instructions: blocks as AgentDefinition["instructions"],
    }));
  }, []);

  const toggleTrigger = (trigger: AgentTrigger, enabled: boolean) => {
    if (trigger === "chat") return;
    const next = new Set(draft.allowedTriggers);
    if (enabled) next.add(trigger);
    else next.delete(trigger);
    next.add("chat");
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

  const patchConnectionTrigger = (
    triggerId: string,
    patch: Partial<ConnectionTrigger>,
  ) => {
    patchDraft({
      connectionTriggers: draft.connectionTriggers.map((t) =>
        t.id === triggerId ? { ...t, ...patch } : t,
      ),
    });
  };

  const linkedWorkers = storedWorkers.filter(
    (t) => t.kind !== "tool" && draft.linkedWorkerIds.includes(t.id),
  );

  const boundConnectorItems = useMemo(() => {
    const connectorLabels = new Map(
      connectors.map((c) => [c.provider, c.label]),
    );
    return draft.connectorBindings.map((binding) => ({
      binding,
      label:
        binding.accountLabel ??
        connectionDisplayLabel(
          {
            connector: binding.provider,
            name: binding.accountLabel ?? null,
          },
          connectorLabels.get(binding.provider),
        ),
      providerLabel: connectorLabels.get(binding.provider) ?? binding.provider,
    }));
  }, [connectors, draft.connectorBindings]);

  const boundSkills = skillCatalog.filter((skill) =>
    draft.boundSkillIds.includes(skill.id),
  );

  const chatLabel = `New chat with ${draft.name.trim() || definition.name}`;

  const canSave =
    mode === "create"
      ? draft.name.trim().length > 0 && isDirty
      : isDirty;

  const handleSave = () => {
    startTransition(async () => {
      const bundles = resolveToolBundlesForSave(draft);
      const allowedTriggers = resolveAllowedTriggersForSave(
        draft,
        agentSchedules,
        settingsTarget,
      );
      const connectorBindings = resolveConnectorBindingsForSave(draft);
      const runPolicy = {
        ...definition.runPolicy,
        model: draft.model,
        allowedTriggers,
        linkedWorkerAgentIds: draft.linkedWorkerAgentIds,
        connectorBindings,
        enabledConnectorProviders: deriveEnabledConnectorProviders({
          connectorBindings,
        }),
        connectionTriggers: draft.connectionTriggers,
      };
      const name = draft.name.trim();
      const description = draft.description.trim();

      if (settingsTarget === "main") {
        await updateTeamspaceMainConfigAction(teamspaceId, {
          instructions: draft.instructions,
          toolBundles: bundles,
          runPolicy,
        });
      } else {
        await updateAgentDefinitionAction(teamspaceId, {
          id: definition.id,
          name,
          description,
          instructions: draft.instructions,
          toolBundles: bundles,
          runPolicy,
          linkedWorkerIds: draft.linkedWorkerIds,
        });
      }

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

      const skillsRes = await fetch(
        `/api/agents/${definition.id}/skills`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamspaceId,
            skillIds: draft.boundSkillIds,
          }),
        },
      );
      if (!skillsRes.ok) {
        throw new Error(`Failed to update skill bindings (${skillsRes.status})`);
      }

      router.refresh();
      if (mode === "create" && settingsTarget === "agent") {
        onCreated?.({
          ...definition,
          name,
          description,
          instructions: draft.instructions,
          toolBundles: bundles,
          runPolicy,
          updatedAt: new Date().toISOString(),
        });
      }
      onClose();
    });
  };

  const saveButton = (
    <Button
      type="button"
      size="sm"
      variant={canSave ? "default" : "secondary"}
      disabled={isPending || !canSave}
      onClick={handleSave}
      data-testid="agent-settings-save"
      aria-disabled={isPending || !canSave}
    >
      {isPending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create agent"
          : isDirty
            ? "Save changes"
            : "Saved"}
    </Button>
  );

  const settingsBody = (
        <div
          className="space-y-3"
          data-testid="agent-settings-sheet"
          data-unsaved={isDirty ? "true" : undefined}
        >
          {settingsTarget === "agent" ? (
            <AgentSettingCard.Root testId="agent-settings-details-card">
              <AgentSettingCard.Header
                title="Details"
                description="Name and when to route work to this agent."
              />
              <AgentSettingCard.Body className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="agent-settings-name">Name</Label>
                  <Input
                    id="agent-settings-name"
                    placeholder="Research assistant"
                    value={draft.name}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                    data-testid="agent-settings-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agent-settings-description">When to use</Label>
                  <Textarea
                    id="agent-settings-description"
                    placeholder="Use when the user needs deep research on a topic…"
                    value={draft.description}
                    onChange={(e) =>
                      patchDraft({ description: e.target.value })
                    }
                    rows={3}
                    data-testid="agent-settings-description"
                  />
                </div>
              </AgentSettingCard.Body>
            </AgentSettingCard.Root>
          ) : null}

          <AgentSettingCard.Root testId="agent-settings-triggers-card">
            <AgentSettingCard.Header
              title="Triggers"
              description="When should this agent run?"
            />
            <AgentSettingCard.Body>
              <AgentSettingCard.Items>
              <AgentSettingCard.Item
                testId="agent-trigger-chat"
                icon={<ChatsCircleIcon className="size-3.5 text-muted-foreground" />}
                title={chatLabel}
              />
              {settingsTarget !== "main" ? (
                <AgentSettingCard.Item
                  testId="agent-trigger-task"
                  icon={<AtIcon className="size-3.5 text-muted-foreground" />}
                  title={TRIGGER_LABELS.task}
                  trailing={
                    <Switch
                      checked={draft.allowedTriggers.includes("task")}
                      onCheckedChange={(checked) => toggleTrigger("task", checked)}
                      aria-label={TRIGGER_LABELS.task}
                    />
                  }
                />
              ) : null}
              {draft.connectionTriggers.map((trigger) => (
                <AgentSettingCard.Item
                  key={trigger.id}
                  className={trigger.id === "slack:agent_mentioned" ? "group" : undefined}
                  onPress={
                    trigger.id === "slack:agent_mentioned"
                      ? () => setEditingSlackTriggerId(trigger.id)
                      : undefined
                  }
                  icon={
                    <ConnectorBrandIcon
                      provider={trigger.provider}
                      className="size-3.5"
                    />
                  }
                  title={trigger.label}
                  subtitle={
                    trigger.slackUserGroupHandle
                      ? `@${trigger.slackUserGroupHandle}`
                      : trigger.provider
                  }
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
                  <AgentSettingCard.Item
                    key={schedule.id}
                    className="group"
                    testId={`agent-schedule-edit-${schedule.id}`}
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
              </AgentSettingCard.Items>
            </AgentSettingCard.Body>
            <AgentSettingCard.Footer>
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
            </AgentSettingCard.Footer>
          </AgentSettingCard.Root>

          <AgentSettingCard.Root testId="agent-settings-instructions-card">
            <AgentSettingCard.Header
              title="Instructions"
              description="What should the agent do every time it runs?"
            />
            <AgentSettingCard.Body>
            <div
              className="min-h-[200px] max-h-[min(24rem,45vh)] overflow-y-auto"
              data-testid="agent-instructions-editor"
            >
              <DocumentEditorEl
                compact
                content={draft.instructions}
                onSave={handleInstructionsSave}
              />
            </div>
            </AgentSettingCard.Body>
          </AgentSettingCard.Root>

          <AgentSettingCard.Root testId="agent-settings-tools-card">
            <AgentSettingCard.Header
              title="Tools and access"
              description="Connectors and integrations for this agent."
            />
            <AgentSettingCard.Body>
              <AgentSettingCard.Items>
                {boundConnectorItems.length === 0 &&
                linkedWorkers.length === 0 ? (
                  <AgentSettingCard.Item
                    testId="agent-tools-empty"
                    icon={
                      <WrenchIcon className="size-3.5 text-muted-foreground" />
                    }
                    title="No connectors selected yet"
                  />
                ) : (
                  <>
                    {boundConnectorItems.map(({ binding, label, providerLabel }) => (
                      <AgentSettingCard.Item
                        key={`${binding.scope}:${binding.connectionId}`}
                        icon={
                          <ConnectorBrandIcon
                            provider={binding.provider}
                            className="size-3.5"
                          />
                        }
                        title={label}
                        subtitle={`${providerLabel} · ${
                          binding.scope === "org" ? "Organization" : "Personal"
                        }`}
                        testId={`agent-bound-connection-${binding.scope}-${binding.connectionId}`}
                        trailing={
                          <div className="flex items-center gap-1">
                            <BoundConnectionToolPermissionsControl
                              label={label}
                              binding={binding}
                              teamspaceId={teamspaceId}
                              providerLabel={providerLabel}
                              onBindingChange={(next) =>
                                updateBindingToolPermissions(
                                  binding.scope,
                                  binding.connectionId,
                                  () => next,
                                )
                              }
                            />
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
                                    aria-label={`Unlink ${label} from agent`}
                                    data-testid={`agent-bound-connection-unlink-${binding.scope}-${binding.connectionId}`}
                                    onClick={() =>
                                      removeBindingFromDraft(
                                        binding.scope,
                                        binding.connectionId,
                                      )
                                    }
                                  />
                                }
                              >
                                <LinkBreakIcon className="size-4" aria-hidden />
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                Unlink from agent
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        }
                      />
                    ))}
                    {linkedWorkers.map((tool) => (
                      <AgentSettingCard.Item
                        key={tool.id}
                        icon={
                          <WrenchIcon className="size-3.5 text-muted-foreground" />
                        }
                        title={tool.name}
                        subtitle={tool.key}
                        trailing="TypeScript"
                      />
                    ))}
                  </>
                )}
              </AgentSettingCard.Items>
            </AgentSettingCard.Body>
            <AgentSettingCard.Footer>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-fit justify-start gap-2"
                data-testid="agent-tools-manage"
                onClick={() => setOpenDialog("tools")}
              >
                <WrenchIcon className="size-3.5" aria-hidden />
                Manage tools
              </Button>
            </AgentSettingCard.Footer>
          </AgentSettingCard.Root>

          <AgentSettingCard.Root testId="agent-settings-advanced-card">
            <AgentSettingCard.Header
              title="Advanced"
              description="Additional configuration for agent runs."
            />
            <AgentSettingCard.Body>
              <AgentSettingCard.Items divided>
                <div
                  className="flex items-center justify-between gap-3 px-1 py-2"
                  data-testid="agent-advanced-model-row"
                >
                  <Label
                    htmlFor="agent-model-picker"
                    className="text-sm font-normal"
                  >
                    Model
                  </Label>
                  <AgentModelPicker
                    value={draft.model || DEFAULT_MODEL_ID}
                    onChange={(modelId) => patchDraft({ model: modelId })}
                  />
                </div>
              </AgentSettingCard.Items>
            </AgentSettingCard.Body>
          </AgentSettingCard.Root>

          <AgentSettingCard.Root testId="agent-settings-skills-card">
            <AgentSettingCard.Header
              title="Skills"
              description="Runtime skills loaded via read_skill."
            />
            <AgentSettingCard.Body>
              <AgentSettingCard.Items>
                {boundSkills.length === 0 ? (
                  <AgentSettingCard.Item
                    testId="agent-skills-empty"
                    icon={
                      <LightbulbIcon className="size-3.5 text-muted-foreground" />
                    }
                    title="No skills bound yet"
                  />
                ) : (
                  boundSkills.map((skill) => (
                    <AgentSettingCard.Item
                      key={skill.id}
                      testId={`agent-bound-skill-${skill.key}`}
                      icon={
                        <LightbulbIcon className="size-3.5 text-muted-foreground" />
                      }
                      title={skill.name}
                      subtitle={skill.key}
                      trailing={
                        skill.source === "builtin" ? "Platform" : "Custom"
                      }
                    />
                  ))
                )}
              </AgentSettingCard.Items>
            </AgentSettingCard.Body>
            <AgentSettingCard.Footer>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-fit justify-start gap-2"
                data-testid="agent-skills-manage"
                onClick={() => setOpenDialog("skills")}
              >
                <LightbulbIcon className="size-3.5" aria-hidden />
                Manage skills
              </Button>
            </AgentSettingCard.Footer>
          </AgentSettingCard.Root>
        </div>
  );

  return (
    <>
      {presentation === "page" ? (
        <div className="space-y-3" data-testid="agent-settings-page">
          <div className="flex items-center justify-end">{saveButton}</div>
          {settingsBody}
        </div>
      ) : (
        <CardListSheetPanel
          title={mode === "create" ? "Create agent" : "Settings"}
          subtitle={
            draft.name.trim() || (mode === "create" ? "New agent" : definition.name)
          }
          onClose={handleClose}
          headerAction={saveButton}
        >
          {settingsBody}
        </CardListSheetPanel>
      )}

      <Popover
        open={editingScheduleId !== null}
        onOpenChange={(open, eventDetails) => {
          if (
            !open &&
            eventDetails?.reason === "outside-press" &&
            schedulePopoverAnchorRef.current?.contains(
              eventDetails.event.target as Node,
            )
          ) {
            setEditingScheduleId(null);
            ignoreNextScheduleRowPressRef.current = true;
            return;
          }
          if (!open) setEditingScheduleId(null);
        }}
      >
        <PopoverContent
          anchor={schedulePopoverAnchorRef}
          side="bottom"
          align="start"
          sideOffset={6}
          className="w-[min(22rem,92vw)] max-h-[min(65vh,24rem)] overflow-y-auto border border-border p-3"
          data-testid="schedule-edit-popover"
        >
          {scheduleEditTarget ? (
            <ScheduleSheet
              presentation="inline"
              inlineSubmitPlacement="header"
              compact
              open
              onOpenChange={(open) => {
                if (!open) setEditingScheduleId(null);
              }}
              teamspaceId={teamspaceId}
              accountId={accountId}
              instructions={[{ id: definition.id, name: definition.name }]}
              schedule={scheduleEditTarget}
            />
          ) : null}
        </PopoverContent>
      </Popover>

      <Dialog
        open={editingSlackTriggerId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingSlackTriggerId(null);
        }}
      >
        <DialogContent className="max-w-md" forceBackdrop>
          <DialogHeader>
            <DialogTitle>Slack agent mention</DialogTitle>
            <DialogDescription>
              Mention this agent in Slack with its user group handle. Workspace
              owners must allow members to create user groups.
            </DialogDescription>
          </DialogHeader>
          {editingSlackTrigger ? (
            <div className="space-y-4">
              <div className="rounded-lg border px-4 py-3 text-sm">
                <p className="text-muted-foreground text-xs">Mention handle</p>
                <p className="font-mono">
                  {editingSlackTrigger.slackUserGroupHandle
                    ? `@${editingSlackTrigger.slackUserGroupHandle}`
                    : "Not provisioned yet"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <Label htmlFor="slack-show-typing">Show typing indicator in Slack</Label>
                <Switch
                  id="slack-show-typing"
                  checked={editingSlackTrigger.showTypingIndicator !== false}
                  onCheckedChange={(checked) =>
                    patchConnectionTrigger(editingSlackTrigger.id, {
                      showTypingIndicator: checked,
                    })
                  }
                  data-testid="slack-trigger-show-typing"
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Saved or Later messages in Slack are not supported.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setEditingSlackTriggerId(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AgentSettingsDialogs
        definition={definition}
        draft={draft}
        onDraftChange={patchDraft}
        workers={workers}
        storedWorkers={storedWorkers}
        skillCatalog={skillCatalog}
        connectors={connectors}
        connections={connections}
        inboundChannels={inboundChannels}
        channelsHref={channelsHref}
        connectionsHref={connectionsHref}
        teamspaceId={teamspaceId}
        accountId={accountId}
        returnTo={pathname}
        allowOrgScope
        settingsTarget={settingsTarget}
        openDialog={openDialog}
        onOpenDialogChange={setOpenDialog}
      />

      <AlertDialog
        open={discardDialogOpen}
        onOpenChange={handleDiscardDialogOpenChange}
      >
        <AlertDialogContent data-testid="agent-settings-discard-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes have not been saved. Close without saving and they
              will not apply to the agent runtime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="agent-settings-discard-cancel">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="agent-settings-discard-confirm"
              onClick={handleDiscardChanges}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
