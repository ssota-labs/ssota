"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AgentDefinition, AgentTrigger } from "@ssota/contracts";
import { blockNoteContentToText } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { updateAgentDefinitionAction } from "@/app/actions";
import { ScheduleSheetPanel } from "@/components/schedules/schedule-sheet-panel";
import {
  AgentSettingCard,
  AgentSettingSummaryRow,
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
    if (!text) return "No instructions yet";
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }, [draft.instructions]);

  const activeTriggers = draft.allowedTriggers.filter(
    (t) => t === "chat" || t === "chatbot" || t === "task" || t === "schedule",
  );

  const optionalToolCount = draft.toolBundles.filter(
    (b) => !BASE_TOOL_BUNDLES.includes(b),
  ).length;

  const modelLabel =
    MODEL_OPTIONS.find((m) => m.id === draft.model)?.label ?? "Auto";

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
            summary={
              activeTriggers.length === 0 ? (
                <span>No triggers enabled</span>
              ) : (
                <span>
                  {activeTriggers.map((t) => TRIGGER_LABELS[t]).join(", ")}
                  {draft.allowedTriggers.includes("schedule") &&
                  agentSchedules.length > 0
                    ? ` · ${agentSchedules.length} schedule(s)`
                    : null}
                </span>
              )
            }
          />

          <AgentSettingCard
            title="Instructions"
            description="What should the agent do every time it runs?"
            testId="agent-settings-instructions-card"
            onOpen={() => setOpenDialog("instructions")}
            summary={<span className="line-clamp-2">{instructionPreview}</span>}
          />

          <AgentSettingCard
            title="Tools and access"
            description="What can the agent use?"
            testId="agent-settings-tools-card"
            onOpen={() => setOpenDialog("tools")}
            summary={
              <div className="space-y-0.5">
                <AgentSettingSummaryRow
                  label="Base tools"
                  value={`${BASE_TOOL_BUNDLES.length} included`}
                />
                <AgentSettingSummaryRow
                  label="Optional"
                  value={
                    optionalToolCount === 0
                      ? "None"
                      : draft.toolBundles
                          .filter((b) => !BASE_TOOL_BUNDLES.includes(b))
                          .map((b) => TOOL_BUNDLE_LABELS[b])
                          .join(", ")
                  }
                />
                {draft.scriptToolIds.length > 0 ? (
                  <AgentSettingSummaryRow
                    label="Script tools"
                    value={`${draft.scriptToolIds.length} linked`}
                  />
                ) : null}
                {draft.linkedWorkerAgentIds.length > 0 ? (
                  <AgentSettingSummaryRow
                    label="Workers"
                    value={`${draft.linkedWorkerAgentIds.length} linked`}
                  />
                ) : null}
              </div>
            }
          />

          <AgentSettingCard
            title="Model"
            description="Default model for agent runs."
            testId="agent-settings-model-card"
            onOpen={() => setOpenDialog("model")}
            summary={<span>{modelLabel}</span>}
          />

          {agentSchedules.length > 0 ? (
            <section className="rounded-lg border border-border bg-card px-4 py-3">
              <h3 className="text-sm font-medium">Active schedules</h3>
              <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
                {agentSchedules.map((schedule) => {
                  const rec = cronToRecurrence(
                    schedule.cronExpression,
                    schedule.timezone,
                  );
                  const label = rec
                    ? describeRecurrence(rec)
                    : schedule.cronExpression;
                  return (
                    <li key={schedule.id}>
                      {label} ({schedule.enabled ? "on" : "off"})
                    </li>
                  );
                })}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setOpenDialog("add-schedule")}
              >
                Add schedule
              </Button>
            </section>
          ) : null}
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
