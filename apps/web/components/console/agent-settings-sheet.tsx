"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AtIcon,
  ChatsCircleIcon,
  ClockIcon,
  LightbulbIcon,
  PlusIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { Block } from "@blocknote/core";
import type {
  AgentDefinition,
  AgentTrigger,
  ConnectionTrigger,
  SkillIndex,
} from "@ssota/contracts";
import { Button, buttonVariants } from "@ssota/ui/components/ui/button";
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
} from "@ssota/ui/components/ui/popover";
import { Switch } from "@ssota/ui/components/ui/switch";
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
import { buildConnectorAuthorizeHref } from "@/lib/connect/authorize-href";
import type { InboundChannelStatus } from "@/lib/connect/inbound-channels";
import { TRIGGER_LABELS, mergeToolBundles } from "@/lib/console/agent-tool-catalog";
import type { AgentScheduleSummary } from "@/lib/console/load-agent-settings-context";
import { AgentModelPicker } from "@/components/console/agent-model-picker";
import { DEFAULT_MODEL_ID } from "@/lib/chat/models";
import { describeRecurrence, cronToRecurrence } from "@/lib/schedules/recurrence";
import {
  isAgentSettingsDraftDirty,
  resolveAllowedTriggersForSave,
  resolveToolBundlesForSave,
} from "@/lib/console/agent-settings-save-snapshot";

const DocumentEditorEl = dynamic(
  () =>
    import("@/lib/page-runtime/catalog-document").then(
      (m) => m.DocumentEditorEl,
    ),
  { ssr: false },
);

type AgentSettingsSheetProps = {
  definition: AgentDefinition;
  settingsTarget?: "main" | "agent";
  teamspaceId: string;
  accountId: string;
  scriptToolIds: string[];
  boundSkillIds: string[];
  skillCatalog: SkillIndex[];
  scriptTools: Array<{ id: string; key: string; name: string }>;
  workers: AgentDefinition[];
  connectors: ConnectorDef[];
  connections: { user: ConnectorConnection[]; org: ConnectorConnection[] };
  inboundChannels: InboundChannelStatus[];
  channelsHref: string;
  schedules: AgentScheduleSummary[];
  onClose: () => void;
  registerRequestClose?: (
    requestClose: ((action: () => void) => void) | null,
  ) => void;
};

/** Default triggers always shown on the card (not added via sidebar). */
const DEFAULT_CARD_TRIGGERS: AgentTrigger[] = ["chat", "task"];

function buildDraft(
  definition: AgentDefinition,
  scriptToolIds: string[],
  boundSkillIds: string[],
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
    boundSkillIds,
  };
}

export function AgentSettingsSheet({
  definition,
  settingsTarget = "agent",
  teamspaceId,
  accountId,
  scriptToolIds: initialScriptToolIds,
  boundSkillIds: initialBoundSkillIds,
  skillCatalog,
  scriptTools,
  workers,
  connectors,
  connections,
  inboundChannels,
  channelsHref,
  schedules,
  onClose,
  registerRequestClose,
}: AgentSettingsSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState(() =>
    buildDraft(
      definition,
      initialScriptToolIds,
      initialBoundSkillIds,
      schedules,
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
        initialScriptToolIds,
        initialBoundSkillIds,
        schedules,
      ),
    );
  }, [definition, initialScriptToolIds, initialBoundSkillIds, schedules]);

  const agentSchedules = schedules.filter(
    (s) => s.agentDefinitionId === definition.id,
  );

  const savedDraft = useMemo(
    () =>
      buildDraft(
        definition,
        initialScriptToolIds,
        initialBoundSkillIds,
        schedules,
      ),
    [definition, initialScriptToolIds, initialBoundSkillIds, schedules],
  );

  const isDirty = useMemo(
    () => isAgentSettingsDraftDirty(draft, savedDraft, agentSchedules),
    [draft, savedDraft, agentSchedules],
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

  const boundSkills = skillCatalog.filter((skill) =>
    draft.boundSkillIds.includes(skill.id),
  );

  const enabledConnectors = connectors.filter((c) =>
    draft.enabledConnectorProviders.includes(c.provider),
  );

  const chatLabel = `New chat with ${definition.name}`;

  const handleSave = () => {
    startTransition(async () => {
      const bundles = resolveToolBundlesForSave(draft);
      const allowedTriggers = resolveAllowedTriggersForSave(draft, agentSchedules);
      const runPolicy = {
        ...definition.runPolicy,
        model: draft.model,
        allowedTriggers,
        linkedWorkerAgentIds: draft.linkedWorkerAgentIds,
        enabledConnectorProviders: draft.enabledConnectorProviders,
        connectionTriggers: draft.connectionTriggers,
      };

      if (settingsTarget === "main") {
        await updateTeamspaceMainConfigAction(teamspaceId, {
          instructions: draft.instructions,
          toolBundles: bundles,
          runPolicy,
        });
      } else {
        await updateAgentDefinitionAction(teamspaceId, {
          id: definition.id,
          name: definition.name,
          description: definition.description,
          instructions: draft.instructions,
          toolBundles: bundles,
          runPolicy,
          scriptToolIds: draft.scriptToolIds,
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
      onClose();
    });
  };

  return (
    <>
      <CardListSheetPanel
        title="Settings"
        subtitle={definition.name}
        sheetSize="inspector"
        onClose={handleClose}
        headerAction={
          <Button
            type="button"
            size="sm"
            variant={isDirty ? "default" : "secondary"}
            disabled={isPending || !isDirty}
            onClick={handleSave}
            data-testid="agent-settings-save"
            aria-disabled={isPending || !isDirty}
          >
            {isPending ? "Saving…" : isDirty ? "Save changes" : "Saved"}
          </Button>
        }
      >
        <div
          className="space-y-3"
          data-testid="agent-settings-sheet"
          data-unsaved={isDirty ? "true" : undefined}
        >
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
              description="Composio connectors and TypeScript scripts for this agent."
            />
            <AgentSettingCard.Body>
              <AgentSettingCard.Items>
                {enabledConnectors.length === 0 && linkedScriptTools.length === 0 ? (
                  <AgentSettingCard.Item
                    testId="agent-tools-empty"
                    icon={
                      <WrenchIcon className="size-3.5 text-muted-foreground" />
                    }
                    title="No connectors or scripts selected yet"
                    onPress={() => setOpenDialog("tools")}
                    trailing={<AgentSettingCard.ItemCaret />}
                  />
                ) : (
                  <>
                    {enabledConnectors.map((connector) => {
                      const connected = connectedProviders.has(connector.provider);
                      const count =
                        connectedProviders.get(connector.provider)?.length ?? 0;
                      return (
                        <AgentSettingCard.Item
                          key={connector.provider}
                          icon={
                            <ConnectorBrandIcon
                              provider={connector.provider}
                              className="size-3.5"
                            />
                          }
                          title={connector.label}
                          subtitle={
                            connected ? "Composio connector" : "Enabled"
                          }
                          trailing={
                            connected ? (
                              count > 1 ? (
                                `${count} accounts`
                              ) : (
                                "Connected"
                              )
                            ) : (
                              <a
                                href={buildConnectorAuthorizeHref({
                                  slug: connector.provider,
                                  teamspaceId,
                                  accountId,
                                  returnTo: pathname,
                                })}
                                className={buttonVariants({
                                  variant: "secondary",
                                  size: "sm",
                                  className: "h-7 shrink-0",
                                })}
                                data-testid={`agent-connector-connect-${connector.provider}`}
                              >
                                Connect
                              </a>
                            )
                          }
                        />
                      );
                    })}
                    {linkedScriptTools.map((tool) => (
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
                    onPress={() => setOpenDialog("skills")}
                    trailing={<AgentSettingCard.ItemCaret />}
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
      </CardListSheetPanel>

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
          className="w-[min(22rem,92vw)] max-h-[min(65vh,24rem)] overflow-y-auto p-3"
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
        scriptTools={scriptTools}
        skillCatalog={skillCatalog}
        connectors={connectors}
        connections={connections}
        inboundChannels={inboundChannels}
        channelsHref={channelsHref}
        teamspaceId={teamspaceId}
        accountId={accountId}
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
