"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BuildingsIcon,
  CalendarBlankIcon,
  ClockIcon,
  LightbulbIcon,
  UserIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type {
  AgentDefinition,
  AgentConnectorBinding,
  ConnectionTrigger,
  SkillIndex,
  ToolBundle,
} from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Label } from "@ssota/ui/components/ui/label";
import { Switch } from "@ssota/ui/components/ui/switch";
import { ConnectorBrandIcon } from "@/components/connections/connector-brand-icon";
import { provisionSlackAgentMentionTriggerAction } from "@/app/actions";
import type { ConnectorConnection } from "@/components/connectors/connectors-view";
import type { ConnectorDef } from "@/lib/connect/connectors";
import type { InboundChannelStatus } from "@/lib/connect/inbound-channels";
import { inboundChannelAuthorizeHref, inboundChannelStatusFor } from "@/lib/connect/inbound-channels";
import type { ConnectorConnectScope } from "@/lib/connect/authorize-href";
import {
  addConnectorBinding,
  connectorBindingKey,
  connectionDisplayLabel,
  deriveEnabledProvidersFromBindings,
  flattenScopedConnections,
  isConnectorBound,
  removeConnectorBinding,
  scopedConnectionsForProvider,
  type ScopedConnection,
} from "@/lib/console/agent-connector-bindings";
import {
  ADDABLE_TRIGGER_GROUPS,
  filterAddableTriggerGroups,
  findAddableTrigger,
} from "@/lib/console/agent-trigger-catalog";
import {
  ScheduleSheet,
} from "@/components/schedules/schedule-sheet";
import { AgentSettingCard } from "@/components/console/agent-setting-card";
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
  connectorBindings: AgentConnectorBinding[];
  enabledConnectorProviders: string[];
  scheduleEnabledById: Record<string, boolean>;
  connectionTriggers: ConnectionTrigger[];
  boundSkillIds: string[];
};

type AgentSettingsDialogsProps = {
  definition: AgentDefinition;
  draft: AgentSettingsDraft;
  onDraftChange: (patch: Partial<AgentSettingsDraft>) => void;
  workers: AgentDefinition[];
  scriptTools: Array<{ id: string; key: string; name: string }>;
  skillCatalog: SkillIndex[];
  connectors: ConnectorDef[];
  connections: { user: ConnectorConnection[]; org: ConnectorConnection[] };
  inboundChannels: InboundChannelStatus[];
  channelsHref: string;
  connectionsHref: string;
  teamspaceId: string;
  accountId: string;
  returnTo: string;
  allowOrgScope: boolean;
  openDialog: AgentSettingsDialogKind | null;
  onOpenDialogChange: (kind: AgentSettingsDialogKind | null) => void;
};

export type AgentSettingsDialogKind = "add-trigger" | "tools" | "skills";

type ToolEntry =
  | {
      kind: "bound-connection";
      id: string;
      connection: ScopedConnection;
      providerLabel: string;
      label: string;
    }
  | { kind: "connect-provider"; id: string; provider: string; label: string }
  | { kind: "script"; id: string; toolId: string; label: string; key: string };

const SCOPE_LABEL: Record<ConnectorConnectScope, string> = {
  user: "Personal",
  org: "Organization",
};

function matchesSearch(label: string, query: string, extra?: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    label.toLowerCase().includes(q) ||
    (extra?.toLowerCase().includes(q) ?? false)
  );
}

function skillSourceLabel(source: SkillIndex["source"]) {
  if (source === "builtin") return "Platform";
  if (source === "custom") return "Custom";
  return source;
}

export function AgentSettingsDialogs({
  definition,
  draft,
  onDraftChange,
  workers,
  scriptTools,
  skillCatalog,
  connectors,
  connections,
  inboundChannels,
  channelsHref,
  connectionsHref,
  teamspaceId,
  accountId,
  returnTo,
  allowOrgScope,
  openDialog,
  onOpenDialogChange,
}: AgentSettingsDialogsProps) {
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedAddTriggerId, setSelectedAddTriggerId] = useState<
    string | null
  >(null);
  const [toolSearch, setToolSearch] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [addTriggerSearch, setAddTriggerSearch] = useState("");
  const [isProvisioningSlack, setIsProvisioningSlack] = useState(false);
  const [addTriggerError, setAddTriggerError] = useState<string | null>(null);
  const connectorByProvider = useMemo(
    () => new Map(connectors.map((c) => [c.provider, c])),
    [connectors],
  );

  const scopedConnections = useMemo(
    () => flattenScopedConnections(connections),
    [connections],
  );

  const connectionsByProvider = useMemo(() => {
    const map = new Map<string, ScopedConnection[]>();
    for (const c of scopedConnections) {
      const list = map.get(c.connector) ?? [];
      list.push(c);
      map.set(c.connector, list);
    }
    return map;
  }, [scopedConnections]);

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
    const entries: ToolEntry[] = [];

    for (const binding of draft.connectorBindings) {
      const connection = scopedConnections.find(
        (c) =>
          c.id === binding.connectionId &&
          c.scope === binding.scope &&
          c.connector === binding.provider,
      );
      if (!connection) continue;
      const providerLabel =
        connectorByProvider.get(binding.provider)?.label ?? binding.provider;
      entries.push({
        kind: "bound-connection",
        id: `bound:${connectorBindingKey(binding.scope, binding.connectionId)}`,
        connection,
        providerLabel,
        label: binding.accountLabel ?? connectionDisplayLabel(connection, providerLabel),
      });
    }

    for (const connector of connectors) {
      entries.push({
        kind: "connect-provider",
        id: `connect:${connector.provider}`,
        provider: connector.provider,
        label: connector.label,
      });
    }

    for (const tool of scriptTools) {
      entries.push({
        kind: "script",
        id: `script:${tool.id}`,
        toolId: tool.id,
        label: tool.name,
        key: tool.key,
      });
    }

    return entries;
  }, [
    connectors,
    connectorByProvider,
    draft.connectorBindings,
    scopedConnections,
    scriptTools,
  ]);

  const filteredToolEntries = useMemo(
    () =>
      toolEntries.filter((entry) => {
        if (entry.kind === "script") {
          return matchesSearch(entry.label, toolSearch, entry.key);
        }
        if (entry.kind === "connect-provider") {
          return matchesSearch(entry.label, toolSearch);
        }
        return matchesSearch(
          entry.label,
          toolSearch,
          `${entry.providerLabel} ${SCOPE_LABEL[entry.connection.scope]}`,
        );
      }),
    [toolEntries, toolSearch],
  );

  const filteredSkills = useMemo(
    () =>
      [...skillCatalog]
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter(
          (skill) =>
            matchesSearch(skill.name, skillSearch, skill.key) ||
            matchesSearch(skill.description, skillSearch),
        ),
    [skillCatalog, skillSearch],
  );

  useEffect(() => {
    if (openDialog === "tools") {
      setToolSearch("");
      setSelectedToolId(toolEntries[0]?.id ?? null);
    }
  }, [openDialog, toolEntries]);

  useEffect(() => {
    if (openDialog === "skills") {
      setSkillSearch("");
      setSelectedSkillId(filteredSkills[0]?.id ?? skillCatalog[0]?.id ?? null);
    }
  }, [openDialog, filteredSkills, skillCatalog]);

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
    if (openDialog !== "skills" || !selectedSkillId) return;
    if (!filteredSkills.some((skill) => skill.id === selectedSkillId)) {
      setSelectedSkillId(filteredSkills[0]?.id ?? null);
    }
  }, [filteredSkills, openDialog, selectedSkillId]);

  useEffect(() => {
    if (openDialog !== "add-trigger" || !selectedAddTriggerId) return;
    if (!addTriggerFlatItems.some((item) => item.id === selectedAddTriggerId)) {
      setSelectedAddTriggerId(addTriggerFlatItems[0]?.id ?? null);
    }
  }, [addTriggerFlatItems, openDialog, selectedAddTriggerId]);

  const patchConnectorBindings = (bindings: AgentConnectorBinding[]) => {
    onDraftChange({
      connectorBindings: bindings,
      enabledConnectorProviders: deriveEnabledProvidersFromBindings(bindings),
    });
  };

  const addBindingForConnection = (connection: ScopedConnection) => {
    const providerLabel =
      connectorByProvider.get(connection.connector)?.label ??
      connection.connector;
    patchConnectorBindings(
      addConnectorBinding(
        draft.connectorBindings,
        connection,
        providerLabel,
      ),
    );
  };

  const removeBindingForConnection = (connection: ScopedConnection) => {
    patchConnectorBindings(
      removeConnectorBinding(
        draft.connectorBindings,
        connection.scope,
        connection.id,
      ),
    );
  };

  const toggleScriptTool = (id: string, enabled: boolean) => {
    const next = new Set(draft.scriptToolIds);
    if (enabled) next.add(id);
    else next.delete(id);
    onDraftChange({ scriptToolIds: [...next] });
  };

  const toggleSkillBinding = (skillId: string, enabled: boolean) => {
    const next = new Set(draft.boundSkillIds);
    if (enabled) next.add(skillId);
    else next.delete(skillId);
    onDraftChange({ boundSkillIds: [...next] });
  };

  const isToolEnabled = (entry: ToolEntry) => {
    switch (entry.kind) {
      case "bound-connection":
        return true;
      case "connect-provider":
        return false;
      case "script":
        return draft.scriptToolIds.includes(entry.toolId);
    }
  };

  const toolEntryToSidebarItem = (entry: ToolEntry): SidebarListItem => {
    const enabled = isToolEnabled(entry);
    let subtitle: string | undefined;
    let icon: ReactNode;
    let testId: string;

    switch (entry.kind) {
      case "bound-connection": {
        subtitle = `${entry.providerLabel} · ${SCOPE_LABEL[entry.connection.scope]}`;
        icon = (
          <ConnectorBrandIcon
            provider={entry.connection.connector}
            className="size-3.5"
          />
        );
        testId = `agent-connection-${entry.connection.scope}-${entry.connection.id}`;
        break;
      }
      case "connect-provider": {
        const count = connectionsByProvider.get(entry.provider)?.length ?? 0;
        subtitle =
          count > 0
            ? `${count} connection${count === 1 ? "" : "s"}`
            : undefined;
        icon = (
          <ConnectorBrandIcon provider={entry.provider} className="size-3.5" />
        );
        testId = `agent-connect-${entry.provider}`;
        break;
      }
      case "script":
        subtitle = entry.key;
        icon = <WrenchIcon className="size-3.5 text-muted-foreground" />;
        testId = `agent-script-${entry.toolId}`;
        break;
    }

    return {
      id: entry.id,
      label: entry.label,
      subtitle,
      icon,
      enabled,
      testId,
    };
  };

  const toolSidebarGroups: SidebarListGroup[] = useMemo(() => {
    const bound = filteredToolEntries.filter((e) => e.kind === "bound-connection");
    const connect = filteredToolEntries.filter(
      (e) => e.kind === "connect-provider",
    );
    const scripts = filteredToolEntries.filter((e) => e.kind === "script");
    const groups: SidebarListGroup[] = [];

    if (bound.length > 0) {
      groups.push({
        id: "on-agent",
        label: "On this agent",
        items: bound.map(toolEntryToSidebarItem),
      });
    }
    if (connect.length > 0) {
      groups.push({
        id: "connect",
        label: "Connect",
        items: connect.map(toolEntryToSidebarItem),
      });
    }
    if (scripts.length > 0) {
      groups.push({
        id: "scripts",
        label: "TypeScript scripts",
        icon: <WrenchIcon className="size-3" aria-hidden />,
        items: scripts.map(toolEntryToSidebarItem),
      });
    }

    return groups;
  }, [filteredToolEntries, draft.connectorBindings, draft.scriptToolIds]);

  const skillSidebarItems: SidebarListItem[] = filteredSkills.map((skill) => ({
    id: skill.id,
    label: skill.name,
    subtitle: skill.key,
    icon: <LightbulbIcon className="size-3.5 text-muted-foreground" />,
    enabled: draft.boundSkillIds.includes(skill.id),
    testId: `agent-skill-${skill.key}`,
  }));

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
  const selectedSkill =
    skillCatalog.find((skill) => skill.id === selectedSkillId) ?? null;
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

    const providerConnections =
      connectionsByProvider.get(def.provider) ?? [];
    const firstConnection = providerConnections[0];
    let nextBindings = draft.connectorBindings;
    if (
      firstConnection &&
      !isConnectorBound(
        draft.connectorBindings,
        firstConnection.scope,
        firstConnection.id,
      )
    ) {
      const providerLabel =
        connectorByProvider.get(def.provider)?.label ?? def.provider;
      nextBindings = addConnectorBinding(
        draft.connectorBindings,
        firstConnection,
        providerLabel,
      );
    }

    onDraftChange({
      connectionTriggers: [...draft.connectionTriggers, entry],
      allowedTriggers: [...allowed],
      connectorBindings: nextBindings,
      enabledConnectorProviders:
        deriveEnabledProvidersFromBindings(nextBindings),
    });
    onOpenDialogChange(null);
  };

  const scopeOptions: ConnectorConnectScope[] = allowOrgScope
    ? ["user", "org"]
    : ["user"];

  const connectionRowClassName =
    "rounded-none px-1 @max-[26rem]/detail:flex-col @max-[26rem]/detail:items-stretch @max-[26rem]/detail:gap-2.5 py-2.5";
  const connectionActionClassName =
    "@max-[26rem]/detail:w-full shrink-0 sm:shrink-0";

  const renderProviderConnectionRow = (
    connection: ScopedConnection,
    providerLabel: string,
  ) => {
    const label = connectionDisplayLabel(connection, providerLabel);
    const bound = isConnectorBound(
      draft.connectorBindings,
      connection.scope,
      connection.id,
    );
    return (
      <AgentSettingCard.Item
        key={connectorBindingKey(connection.scope, connection.id)}
        title={label}
        className={connectionRowClassName}
        testId={`agent-provider-connection-${connection.scope}-${connection.id}`}
        trailing={
          bound ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={connectionActionClassName}
              data-testid={`agent-connection-remove-${connection.scope}-${connection.id}`}
              onClick={() => removeBindingForConnection(connection)}
            >
              Remove
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className={connectionActionClassName}
              data-testid={`agent-connection-add-${connection.scope}-${connection.id}`}
              onClick={() => addBindingForConnection(connection)}
            >
              <span className="hidden @max-[26rem]/detail:inline">Add</span>
              <span className="@max-[26rem]/detail:hidden">Add to agent</span>
            </Button>
          )
        }
      />
    );
  };

  const renderProviderConnectionSection = (
    scope: ConnectorConnectScope,
    providerConnections: ScopedConnection[],
    providerLabel: string,
  ) => {
    const ScopeIcon = scope === "user" ? UserIcon : BuildingsIcon;
    return (
      <div className="space-y-2" data-testid={`agent-connect-section-${scope}`}>
        <div className="flex items-center gap-2">
          <ScopeIcon className="size-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{SCOPE_LABEL[scope]}</p>
        </div>
        {providerConnections.length > 0 ? (
          <AgentSettingCard.Root>
            <AgentSettingCard.Body className="pb-2 pt-0">
              <AgentSettingCard.Items divided>
                {providerConnections.map((connection) =>
                  renderProviderConnectionRow(connection, providerLabel),
                )}
              </AgentSettingCard.Items>
            </AgentSettingCard.Body>
          </AgentSettingCard.Root>
        ) : (
          <p className="text-muted-foreground text-sm">
            No {SCOPE_LABEL[scope].toLowerCase()} {providerLabel} connections
            yet.
          </p>
        )}
      </div>
    );
  };

  const renderToolDetail = () => {
    if (!selectedTool) {
      return (
        <p className="text-muted-foreground text-sm">
          Select a tool from the list to configure access.
        </p>
      );
    }

    if (selectedTool.kind === "bound-connection") {
      const { connection, providerLabel, label } = selectedTool;
      return (
        <>
          <SidebarDetailHeader
            icon={
              <ConnectorBrandIcon
                provider={connection.connector}
                className="size-5"
              />
            }
            title={label}
            status={
              <span className="text-muted-foreground text-xs">
                {providerLabel} · {SCOPE_LABEL[connection.scope]}
              </span>
            }
          />
          <p className="text-muted-foreground mb-6 text-sm">
            This connected account is available to the agent at runtime.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid={`agent-connection-remove-${connection.scope}-${connection.id}`}
              onClick={() => removeBindingForConnection(connection)}
            >
              Remove from agent
            </Button>
          </div>
        </>
      );
    }

    if (selectedTool.kind === "connect-provider") {
      const providerLabel = selectedTool.label;
      const { user: userConnections, org: orgConnections } =
        scopedConnectionsForProvider(connections, selectedTool.provider);
      const totalConnections = userConnections.length + orgConnections.length;
      return (
        <>
          <SidebarDetailHeader
            icon={
              <ConnectorBrandIcon
                provider={selectedTool.provider}
                className="size-5"
              />
            }
            title={providerLabel}
            status={
              <span className="text-muted-foreground text-xs">
                {totalConnections > 0
                  ? `${totalConnections} connected account${totalConnections === 1 ? "" : "s"}`
                  : "Not connected"}
              </span>
            }
          />
          <p className="text-muted-foreground mb-4 text-sm">
            Choose a connected account to add to this agent. Connect new
            accounts on the Connections page.
          </p>
          <div className="mb-6 space-y-4">
            {renderProviderConnectionSection(
              "user",
              userConnections,
              providerLabel,
            )}
            {scopeOptions.includes("org")
              ? renderProviderConnectionSection(
                  "org",
                  orgConnections,
                  providerLabel,
                )
              : null}
          </div>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={connectionsHref}
                data-testid={`agent-connect-manage-${selectedTool.provider}`}
              />
            }
          >
            Open Connections
          </Button>
        </>
      );
    }

    if (selectedTool.kind === "script") {
      const enabled = draft.scriptToolIds.includes(selectedTool.toolId);
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

    return null;
  };

  const renderSkillDetail = () => {
    if (!selectedSkill) {
      return (
        <p className="text-muted-foreground text-sm">
          Select a skill from the list to bind it to this agent.
        </p>
      );
    }

    const enabled = draft.boundSkillIds.includes(selectedSkill.id);

    return (
      <>
        <SidebarDetailHeader
          icon={<LightbulbIcon className="size-5 text-muted-foreground" />}
          title={selectedSkill.name}
          status={
            <span className="text-muted-foreground font-mono text-xs">
              {selectedSkill.key}
            </span>
          }
        />
        <p className="text-muted-foreground mb-6 text-sm">
          {selectedSkill.description.trim() ||
            "Skill descriptions appear in the agent manifest. Full bodies load via read_skill at runtime."}
        </p>
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <Label htmlFor={`skill-enable-${selectedSkill.id}`}>
            Bind to this agent
          </Label>
          <Switch
            id={`skill-enable-${selectedSkill.id}`}
            checked={enabled}
            onCheckedChange={(checked) =>
              toggleSkillBinding(selectedSkill.id, checked)
            }
            data-testid={`agent-skill-bind-${selectedSkill.key}`}
          />
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Source: {skillSourceLabel(selectedSkill.source)}
        </p>
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
              Slack is not connected for this project yet. Connect your workspace
              on the Channels page to enable @mentions.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                nativeButton={false}
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
                size="sm"
                variant="outline"
                nativeButton={false}
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
      </>
    );
  };

  const renderAddTriggerFooter = () => {
    if (!selectedAddTrigger) return null;

    if (selectedAddTrigger.action === "schedule") {
      return (
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
      );
    }

    return (
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenDialogChange(null)}
        >
          Cancel
        </Button>
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
      </div>
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
        footer={renderAddTriggerFooter()}
      />

      <AgentSettingsSidebarDialog
        open={openDialog === "tools"}
        onOpenChange={(open) => !open && onOpenDialogChange(null)}
        title="Tools and access"
        testId="agent-tools-sidebar-dialog"
        groups={toolSidebarGroups}
        selectedId={selectedToolId}
        onSelect={setSelectedToolId}
        searchQuery={toolSearch}
        onSearchQueryChange={setToolSearch}
        searchPlaceholder="Search tools…"
        detail={renderToolDetail()}
        footer={
          <SidebarDetailDoneButton onClick={() => onOpenDialogChange(null)} />
        }
      />

      <AgentSettingsSidebarDialog
        open={openDialog === "skills"}
        onOpenChange={(open) => !open && onOpenDialogChange(null)}
        title="Skills"
        testId="agent-skills-sidebar-dialog"
        items={skillSidebarItems}
        selectedId={selectedSkillId}
        onSelect={setSelectedSkillId}
        searchQuery={skillSearch}
        onSearchQueryChange={setSkillSearch}
        searchPlaceholder="Search skills…"
        detail={
          <>
            <p className="text-muted-foreground mb-4 text-xs">
              Bound skill descriptions appear in the agent manifest. Full bodies
              load via read_skill at runtime.
            </p>
            {renderSkillDetail()}
          </>
        }
        footer={
          <SidebarDetailDoneButton onClick={() => onOpenDialogChange(null)} />
        }
      />

    </>
  );
}
