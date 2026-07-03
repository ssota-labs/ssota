"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarBlankIcon,
  ClockIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type {
  AgentDefinition,
  ConnectionTrigger,
  ToolBundle,
} from "@ssota/contracts";
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
import { provisionSlackAgentMentionTriggerAction } from "@/app/actions";
import type { ConnectorConnection } from "@/components/connectors/connectors-view";
import type { ConnectorDef } from "@/lib/connect/connectors";
import type { InboundChannelStatus } from "@/lib/connect/inbound-channels";
import { inboundChannelAuthorizeHref, inboundChannelStatusFor } from "@/lib/connect/inbound-channels";
import { DEFAULT_MODEL_ID, MODEL_OPTIONS } from "@/lib/chat/models";
import {
  BASE_TOOL_BUNDLES,
  OPTIONAL_TOOL_BUNDLES,
  TOOL_BUNDLE_LABELS,
  isWorkerAgentId,
} from "@/lib/console/agent-tool-catalog";
import {
  ADDABLE_TRIGGER_GROUPS,
  filterAddableTriggerGroups,
  findAddableTrigger,
} from "@/lib/console/agent-trigger-catalog";
import {
  ScheduleSheet,
} from "@/components/schedules/schedule-sheet";
import {
  AgentSettingsSidebarDialog,
  SidebarDetailDoneButton,
  SidebarDetailHeader,
  type SidebarListGroup,
  type SidebarListItem,
} from "@/components/console/agent-settings-sidebar-dialog";

export type AgentSettingsDraft = {
  instructions: AgentDefinition["instructions"];
  toolBundles: ToolBundle[];
  allowedTriggers: NonNullable<AgentDefinition["runPolicy"]["allowedTriggers"]>;
  model: string;
  scriptToolIds: string[];
  linkedWorkerAgentIds: string[];
  enabledConnectorProviders: string[];
  scheduleEnabledById: Record<string, boolean>;
  connectionTriggers: ConnectionTrigger[];
};

type AgentSettingsDialogsProps = {
  definition: AgentDefinition;
  draft: AgentSettingsDraft;
  onDraftChange: (patch: Partial<AgentSettingsDraft>) => void;
  workers: AgentDefinition[];
  scriptTools: Array<{ id: string; key: string; name: string }>;
  connectors: ConnectorDef[];
  connections: { user: ConnectorConnection[]; org: ConnectorConnection[] };
  inboundChannels: InboundChannelStatus[];
  channelsHref: string;
  teamspaceId: string;
  accountId: string;
  openDialog: AgentSettingsDialogKind | null;
  onOpenDialogChange: (kind: AgentSettingsDialogKind | null) => void;
};

export type AgentSettingsDialogKind = "add-trigger" | "tools" | "model";

type ToolEntry =
  | { kind: "connector"; id: string; provider: string; label: string }
  | { kind: "script"; id: string; toolId: string; label: string; key: string }
  | { kind: "worker"; id: string; workerId: string; label: string }
  | { kind: "bundle"; id: string; bundle: ToolBundle; label: string };

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
  inboundChannels,
  channelsHref,
  teamspaceId,
  accountId,
  openDialog,
  onOpenDialogChange,
}: AgentSettingsDialogsProps) {
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [selectedAddTriggerId, setSelectedAddTriggerId] = useState<
    string | null
  >(null);
  const [toolSearch, setToolSearch] = useState("");
  const [addTriggerSearch, setAddTriggerSearch] = useState("");
  const [isProvisioningSlack, setIsProvisioningSlack] = useState(false);
  const [addTriggerError, setAddTriggerError] = useState<string | null>(null);

  const connectedProviders = useMemo(() => {
    const set = new Set<string>();
    for (const c of connections.user) set.add(c.connector);
    for (const c of connections.org) set.add(c.connector);
    return set;
  }, [connections]);

  const slackInbound = useMemo(
    () => inboundChannelStatusFor(inboundChannels, "slack"),
    [inboundChannels],
  );

  const slackInboundConnectHref =
    slackInbound?.canConnect && slackInbound.connectorUid
      ? inboundChannelAuthorizeHref({
          connectorUid: slackInbound.connectorUid,
          teamspaceId,
          accountId,
          returnTo: channelsHref,
        })
      : channelsHref;

  const addedConnectionTriggerIds = useMemo(
    () => new Set(draft.connectionTriggers.map((t) => t.id)),
    [draft.connectionTriggers],
  );

  const filteredAddTriggerGroups = useMemo(
    () =>
      filterAddableTriggerGroups(
        ADDABLE_TRIGGER_GROUPS,
        addTriggerSearch,
        addedConnectionTriggerIds,
      ),
    [addTriggerSearch, addedConnectionTriggerIds],
  );

  const addTriggerFlatItems = useMemo(
    () => filteredAddTriggerGroups.flatMap((g) => g.items),
    [filteredAddTriggerGroups],
  );

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

  useEffect(() => {
    if (openDialog === "tools") {
      setToolSearch("");
      setSelectedToolId(toolEntries[0]?.id ?? null);
    }
  }, [openDialog, toolEntries]);

  useEffect(() => {
    if (openDialog === "add-trigger") {
      setAddTriggerSearch("");
      setAddTriggerError(null);
      setSelectedAddTriggerId(addTriggerFlatItems[0]?.id ?? null);
    }
  }, [openDialog, addTriggerFlatItems]);

  useEffect(() => {
    if (openDialog !== "tools" || !selectedToolId) return;
    if (!filteredToolEntries.some((entry) => entry.id === selectedToolId)) {
      setSelectedToolId(filteredToolEntries[0]?.id ?? null);
    }
  }, [filteredToolEntries, openDialog, selectedToolId]);

  useEffect(() => {
    if (openDialog !== "add-trigger" || !selectedAddTriggerId) return;
    if (!addTriggerFlatItems.some((item) => item.id === selectedAddTriggerId)) {
      setSelectedAddTriggerId(addTriggerFlatItems[0]?.id ?? null);
    }
  }, [addTriggerFlatItems, openDialog, selectedAddTriggerId]);

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

  const addTriggerSidebarGroups: SidebarListGroup[] = useMemo(
    () =>
      filteredAddTriggerGroups.map((group) => ({
        id: group.id,
        label: group.label,
        icon:
          group.id === "schedule" ? (
            <CalendarBlankIcon className="size-3" aria-hidden />
          ) : (
            <ConnectorBrandIcon provider={group.id} className="size-3" />
          ),
        items: group.items.map((item) => ({
          id: item.id,
          label: item.label,
          icon:
            item.action === "schedule" ? (
              <ClockIcon className="size-3.5 text-muted-foreground" />
            ) : item.provider ? (
              <ConnectorBrandIcon provider={item.provider} className="size-3.5" />
            ) : undefined,
          testId: `add-trigger-${item.id}`,
        })),
      })),
    [filteredAddTriggerGroups],
  );

  const selectedTool = toolEntries.find((e) => e.id === selectedToolId) ?? null;
  const selectedAddTrigger = selectedAddTriggerId
    ? findAddableTrigger(selectedAddTriggerId)
    : null;

  const addConnectionTrigger = async (triggerId: string) => {
    const def = findAddableTrigger(triggerId);
    if (!def || def.action !== "connection" || !def.provider || !def.kind) {
      return;
    }

    setAddTriggerError(null);

    let slackUserGroupId: string | undefined;
    let slackUserGroupHandle: string | undefined;

    if (triggerId === "slack:agent_mentioned") {
      if (!slackInbound?.ready) {
        setAddTriggerError(
          "Connect Slack on the Channels page before adding this trigger.",
        );
        return;
      }

      setIsProvisioningSlack(true);
      try {
        const provisioned = await provisionSlackAgentMentionTriggerAction(
          teamspaceId,
          {
            agentDefinitionId: definition.id,
            agentName: definition.name,
          },
        );
        slackUserGroupId = provisioned.slackUserGroupId;
        slackUserGroupHandle = provisioned.slackUserGroupHandle;
      } catch (error) {
        setAddTriggerError(
          error instanceof Error ? error.message : "Failed to provision Slack user group.",
        );
        setIsProvisioningSlack(false);
        return;
      }
      setIsProvisioningSlack(false);
    }

    const entry: ConnectionTrigger = {
      id: def.id,
      provider: def.provider,
      kind: def.kind,
      label: def.label,
      enabled: true,
      showTypingIndicator: true,
      ...(slackUserGroupId ? { slackUserGroupId } : {}),
      ...(slackUserGroupHandle ? { slackUserGroupHandle } : {}),
    };

    const allowed = new Set(draft.allowedTriggers);
    allowed.add("chatbot");
    if (!draft.enabledConnectorProviders.includes(def.provider)) {
      onDraftChange({
        connectionTriggers: [...draft.connectionTriggers, entry],
        allowedTriggers: [...allowed],
        enabledConnectorProviders: [
          ...draft.enabledConnectorProviders,
          def.provider,
        ],
      });
    } else {
      onDraftChange({
        connectionTriggers: [...draft.connectionTriggers, entry],
        allowedTriggers: [...allowed],
      });
    }
    onOpenDialogChange(null);
  };

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
            Connect an account on the Connections page before running.
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

  const renderAddTriggerDetail = () => {
    if (!selectedAddTrigger) {
      return (
        <p className="text-muted-foreground text-sm">
          Select a trigger type from the list to add it.
        </p>
      );
    }

    if (selectedAddTrigger.action === "schedule") {
      return (
        <>
          <SidebarDetailHeader
            sticky
            icon={<ClockIcon className="size-5 text-muted-foreground" />}
            title={selectedAddTrigger.label}
            status={
              <span className="text-muted-foreground text-xs">
                {selectedAddTrigger.groupLabel}
              </span>
            }
          />
          <p className="text-muted-foreground mt-2 mb-4 text-sm">
            {selectedAddTrigger.description}
          </p>
          <ScheduleSheet
            presentation="inline"
            inlineSubmitPlacement="footer"
            open={openDialog === "add-trigger"}
            onOpenChange={(open) => {
              if (!open) onOpenDialogChange(null);
            }}
            teamspaceId={teamspaceId}
            accountId={accountId}
            instructions={[{ id: definition.id, name: definition.name }]}
          />
        </>
      );
    }

    const icon = selectedAddTrigger.provider ? (
      <ConnectorBrandIcon
        provider={selectedAddTrigger.provider}
        className="size-5"
      />
    ) : undefined;

    return (
      <>
        <SidebarDetailHeader
          icon={icon}
          title={selectedAddTrigger.label}
          status={
            <span className="text-muted-foreground text-xs">
              {selectedAddTrigger.groupLabel}
            </span>
          }
        />
        <p className="text-muted-foreground mb-4 text-sm">
          {selectedAddTrigger.description}
        </p>
        {selectedAddTrigger.id === "slack:agent_mentioned" ? (
          <p className="text-muted-foreground mb-4 text-sm">
            SSOTA creates a Slack user group for this agent so teammates can
            @mention it by name. Your Slack workspace owner must allow members
            to create user groups. Saved or Later messages are not supported.
          </p>
        ) : null}
        {selectedAddTrigger.id === "slack:agent_mentioned" &&
        !slackInbound?.ready ? (
          <div className="mb-4 space-y-3 rounded-lg border px-4 py-3">
            <p className="text-sm">
              Inbound Slack is not connected for this project. Connect the same
              workspace on Channels (Vercel Connect), not the Composio card on
              Connections.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                render={
                  <a
                    href={slackInboundConnectHref}
                    data-testid="agent-trigger-connect-slack-channel"
                  />
                }
              >
                Connect Slack channel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                render={<a href={channelsHref} />}
              >
                Open Channels
              </Button>
            </div>
          </div>
        ) : null}
        {addTriggerError ? (
          <p className="text-destructive mb-4 text-sm">{addTriggerError}</p>
        ) : null}
        <Button
          type="button"
          data-testid="add-trigger-confirm"
          disabled={
            isProvisioningSlack ||
            (selectedAddTrigger.id === "slack:agent_mentioned" &&
              !slackInbound?.ready)
          }
          onClick={() => void addConnectionTrigger(selectedAddTrigger.id)}
        >
          {isProvisioningSlack ? "Creating Slack user group…" : "Add trigger"}
        </Button>
      </>
    );
  };

  return (
    <>
      <AgentSettingsSidebarDialog
        open={openDialog === "add-trigger"}
        onOpenChange={(open) => !open && onOpenDialogChange(null)}
        title="Add trigger"
        testId="agent-add-trigger-sidebar-dialog"
        groups={addTriggerSidebarGroups}
        selectedId={selectedAddTriggerId}
        onSelect={setSelectedAddTriggerId}
        searchQuery={addTriggerSearch}
        onSearchQueryChange={setAddTriggerSearch}
        searchPlaceholder="Search triggers…"
        detail={renderAddTriggerDetail()}
        footer={
          selectedAddTrigger?.action === "schedule" ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenDialogChange(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="schedule-sheet-form"
                data-testid="add-trigger-confirm"
              >
                Add trigger
              </Button>
            </div>
          ) : (
            <SidebarDetailDoneButton onClick={() => onOpenDialogChange(null)} />
          )
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
    </>
  );
}
