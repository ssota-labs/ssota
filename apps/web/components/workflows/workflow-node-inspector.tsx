"use client";

import { useState } from "react";
import type {
  WorkflowStepSpec,
} from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import type { WorkflowFlowNode } from "@/lib/workflows/workflow-flow-model";
import {
  removeBlock,
  updateContext,
  updateRouteBlock,
  updateStep,
  updateTriggerEvents,
  updateWorkflowBlock,
  type WorkflowDraft,
} from "@/lib/workflows/workflow-draft";
import { AddWorkflowTriggerDialog } from "@/components/workflows/add-workflow-trigger-dialog";
import { WorkflowTriggersField } from "@/components/workflows/workflow-triggers-field";
import { WorkflowContextField } from "@/components/workflows/workflow-context-field";
import { WorkflowRouteGuidanceField } from "@/components/workflows/workflow-route-guidance-field";
import { WorkflowRouteOutletsField } from "@/components/workflows/workflow-route-outlets-field";
import { createWorkflowTriggerEventFromKind } from "@/lib/workflows/workflow-trigger-catalog";
import type {
  WorkflowEdgeCatalogOption,
  WorkflowNodeCatalogOption,
} from "@/lib/workflows/workflow-context-defaults";
import { cn } from "@ssota/ui/lib/utils";

export type WorkflowPickerOption = {
  workflowKey: string;
  title: string;
};

type WorkflowNodeInspectorProps = {
  draft: WorkflowDraft;
  selectedNode: WorkflowFlowNode;
  currentWorkflowKey?: string;
  onDraftChange: (draft: WorkflowDraft) => void;
  workflowOptions: WorkflowPickerOption[];
  allowedActions: string[];
  contextNodeCatalog: WorkflowNodeCatalogOption[];
  contextEdgeCatalog: WorkflowEdgeCatalogOption[];
};

export function WorkflowNodeInspector({
  draft,
  selectedNode,
  currentWorkflowKey,
  onDraftChange,
  workflowOptions,
  allowedActions,
  contextNodeCatalog,
  contextEdgeCatalog,
}: WorkflowNodeInspectorProps) {
  const { data } = selectedNode;
  const canDelete = !["trigger", "context"].includes(data.kind);
  const isSheetStyleInspector =
    data.kind === "trigger" || data.kind === "context" || data.kind === "route";

  return (
    <aside
      data-testid="workflow-inspector"
      className="flex w-96 shrink-0 flex-col border-l bg-background"
    >
      {!isSheetStyleInspector ? (
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {data.label}
            </p>
            <Badge variant="secondary">{data.kind}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure the selected workflow block.
          </p>
        </div>
      ) : null}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto",
          isSheetStyleInspector ? "" : "space-y-4 p-4",
        )}
      >
        {data.kind === "trigger" ? (
          <TriggerInspector draft={draft} onDraftChange={onDraftChange} />
        ) : null}
        {data.kind === "context" ? (
          <ContextInspector
            draft={draft}
            nodeCatalog={contextNodeCatalog}
            edgeCatalog={contextEdgeCatalog}
            onDraftChange={onDraftChange}
          />
        ) : null}
        {data.kind === "step" || data.kind === "gate" ? (
          <StepInspector
            draft={draft}
            stepId={data.stepId}
            allowedActions={allowedActions}
            onDraftChange={onDraftChange}
          />
        ) : null}
        {data.kind === "route" ? (
          <RouteBlockInspector
            draft={draft}
            routeId={data.routeId}
            onDraftChange={onDraftChange}
          />
        ) : null}
        {data.kind === "workflow" ? (
          <WorkflowBlockInspector
            draft={draft}
            workflowBlockId={data.workflowBlockId}
            currentWorkflowKey={currentWorkflowKey}
            workflowOptions={workflowOptions}
            onDraftChange={onDraftChange}
          />
        ) : null}

        {canDelete ? (
          <div className={isSheetStyleInspector ? "px-4 pb-4" : undefined}>
            <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-destructive"
            data-testid="delete-workflow-block"
            onClick={() => onDraftChange(removeBlock(draft, selectedNode.id))}
          >
            Delete block
          </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function TriggerInspector({
  draft,
  onDraftChange,
}: {
  draft: WorkflowDraft;
  onDraftChange: (draft: WorkflowDraft) => void;
}) {
  const [addTriggerOpen, setAddTriggerOpen] = useState(false);

  return (
    <>
      <WorkflowTriggersField
        triggers={draft.trigger.events}
        onTriggersChange={(events) =>
          onDraftChange(updateTriggerEvents(draft, events))
        }
        onAddTrigger={() => setAddTriggerOpen(true)}
        inspectorHeader
      />
      <AddWorkflowTriggerDialog
        open={addTriggerOpen}
        onOpenChange={setAddTriggerOpen}
        existingKinds={draft.trigger.events.map((trigger) => trigger.kind)}
        onAddTrigger={(kind) => {
          onDraftChange(
            updateTriggerEvents(draft, [
              ...draft.trigger.events,
              createWorkflowTriggerEventFromKind(kind),
            ]),
          );
        }}
      />
    </>
  );
}

function ContextInspector({
  draft,
  nodeCatalog,
  edgeCatalog,
  onDraftChange,
}: {
  draft: WorkflowDraft;
  nodeCatalog: WorkflowNodeCatalogOption[];
  edgeCatalog: WorkflowEdgeCatalogOption[];
  onDraftChange: (draft: WorkflowDraft) => void;
}) {
  return (
    <WorkflowContextField
      context={draft.context}
      nodeCatalog={nodeCatalog}
      edgeCatalog={edgeCatalog}
      onContextChange={(context) => onDraftChange(updateContext(draft, context))}
      inspectorHeader
    />
  );
}

function StepInspector({
  draft,
  stepId,
  allowedActions,
  onDraftChange,
}: {
  draft: WorkflowDraft;
  stepId?: string;
  allowedActions: string[];
  onDraftChange: (draft: WorkflowDraft) => void;
}) {
  const step = draft.steps.find((item) => item.id === stepId);
  if (!step || !stepId) return null;

  const patch = (next: Partial<WorkflowStepSpec>) =>
    onDraftChange(updateStep(draft, stepId, next));

  const selectedActions = new Set(step.actions.map((action) => action.actionType));

  return (
    <>
      <Field label="Title" htmlFor="step-title">
        <Input
          id="step-title"
          value={step.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>
      <Field label="Mode">
        <Select
          value={step.mode}
          onValueChange={(value) =>
            value && patch({ mode: value as WorkflowStepSpec["mode"] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agentic">agentic</SelectItem>
            <SelectItem value="deterministic">deterministic</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Guidance" htmlFor="step-guidance">
        <Textarea
          id="step-guidance"
          value={step.description ?? ""}
          onChange={(event) => patch({ description: event.target.value })}
          className="min-h-20"
        />
      </Field>
      <Field label="Instruction URL" htmlFor="step-instruction-url">
        <Input
          id="step-instruction-url"
          value={step.instructionUrl ?? ""}
          onChange={(event) =>
            patch({
              instructionUrl: event.target.value.trim()
                ? event.target.value
                : null,
            })
          }
          placeholder="https://notion.so/…"
        />
        <p className="text-xs text-muted-foreground">
          Notion runbook or external guide for executing this step.
        </p>
      </Field>
      <Field label="Actions">
        <div className="space-y-2 rounded-md border p-3">
          {allowedActions.length ? (
            allowedActions.map((actionType) => (
              <label key={actionType} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedActions.has(actionType)}
                  onCheckedChange={(checked) => {
                    const nextActions = checked
                      ? [...step.actions, { actionType, required: false }]
                      : step.actions.filter(
                          (action) => action.actionType !== actionType,
                        );
                    patch({ actions: nextActions });
                  }}
                />
                {actionType}
              </label>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              No allowed actions. Add applicable node types in Create Sheet.
            </p>
          )}
        </div>
      </Field>
      {step.gate ? (
        <>
          <Field label="Gate required">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={step.gate.required}
                onCheckedChange={(checked) =>
                  patch({
                    gate: {
                      ...step.gate!,
                      required: checked === true,
                    },
                  })
                }
              />
              Human approval required
            </label>
          </Field>
          <Field label="Gate reason">
            <Input
              value={step.gate.reason ?? ""}
              onChange={(event) =>
                patch({
                  gate: { ...step.gate!, reason: event.target.value },
                })
              }
            />
          </Field>
          <Field label="Gate policy (JSON)">
            <Textarea
              value={JSON.stringify(step.gate.policy ?? {}, null, 2)}
              onChange={(event) => {
                try {
                  const policy = JSON.parse(event.target.value) as Record<
                    string,
                    unknown
                  >;
                  patch({ gate: { ...step.gate!, policy } });
                } catch {
                  // ignore invalid JSON while typing
                }
              }}
              className="min-h-24 font-mono text-xs"
            />
          </Field>
        </>
      ) : null}
    </>
  );
}

function RouteBlockInspector({
  draft,
  routeId,
  onDraftChange,
}: {
  draft: WorkflowDraft;
  routeId?: string;
  onDraftChange: (draft: WorkflowDraft) => void;
}) {
  const route = draft.routeBlocks.find((item) => item.id === routeId);
  if (!route || !routeId) return null;

  return (
    <>
      <div className="border-b px-4 py-3">
        <Field label="Label" htmlFor="route-label">
          <Input
            id="route-label"
            value={route.label}
            onChange={(event) =>
              onDraftChange(
                updateRouteBlock(draft, routeId, { label: event.target.value }),
              )
            }
          />
        </Field>
      </div>

      <WorkflowRouteGuidanceField
        draft={draft}
        routeId={routeId}
        routingInstructionUrl={route.routingInstructionUrl}
        links={route.links}
        onDraftChange={onDraftChange}
        inspectorHeader
      />

      <WorkflowRouteOutletsField
        draft={draft}
        routeId={routeId}
        outlets={route.outlets}
        onDraftChange={onDraftChange}
        inspectorHeader
      />
    </>
  );
}

function WorkflowBlockInspector({
  draft,
  workflowBlockId,
  currentWorkflowKey,
  workflowOptions,
  onDraftChange,
}: {
  draft: WorkflowDraft;
  workflowBlockId?: string;
  currentWorkflowKey?: string;
  workflowOptions: WorkflowPickerOption[];
  onDraftChange: (draft: WorkflowDraft) => void;
}) {
  const block = draft.workflowBlocks.find((item) => item.id === workflowBlockId);
  if (!block || !workflowBlockId) return null;

  const selfHandoff =
    currentWorkflowKey && block.workflowKey === currentWorkflowKey;

  return (
    <>
      {selfHandoff ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          This workflow references itself. Circular handoffs may loop at runtime.
        </p>
      ) : null}
      <Field label="Label" htmlFor="workflow-block-label">
        <Input
          id="workflow-block-label"
          value={block.label ?? ""}
          onChange={(event) =>
            onDraftChange(
              updateWorkflowBlock(draft, workflowBlockId, {
                label: event.target.value,
              }),
            )
          }
        />
      </Field>
      <Field label="Target workflow">
        <Select
          value={block.workflowKey}
          onValueChange={(value) =>
            value &&
            onDraftChange(
              updateWorkflowBlock(draft, workflowBlockId, { workflowKey: value }),
            )
          }
        >
          <SelectTrigger className="w-full" data-testid="workflow-block-picker">
            <SelectValue placeholder="Select workflow" />
          </SelectTrigger>
          <SelectContent>
            {workflowOptions.map((option) => (
              <SelectItem key={option.workflowKey} value={option.workflowKey}>
                {option.title} ({option.workflowKey})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Hand off execution to another workflow. This branch ends here.
        </p>
      </Field>
    </>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
