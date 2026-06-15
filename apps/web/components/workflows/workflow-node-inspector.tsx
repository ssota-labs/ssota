"use client";

import { useState } from "react";
import type {
  WorkflowConditionSpec,
  WorkflowReferenceSpec,
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
  updateCondition,
  updateOutput,
  updateReference,
  updateRoute,
  updateStep,
  updateTriggerEvents,
  updateContext,
  type WorkflowDraft,
} from "@/lib/workflows/workflow-draft";
import { AddWorkflowTriggerDialog } from "@/components/workflows/add-workflow-trigger-dialog";
import { WorkflowTriggersField } from "@/components/workflows/workflow-triggers-field";
import { WorkflowContextField } from "@/components/workflows/workflow-context-field";
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
  selectedNode: WorkflowFlowNode | null;
  onDraftChange: (draft: WorkflowDraft) => void;
  workflowOptions: WorkflowPickerOption[];
  allowedActions: string[];
  contextNodeCatalog: WorkflowNodeCatalogOption[];
  contextEdgeCatalog: WorkflowEdgeCatalogOption[];
};

export function WorkflowNodeInspector({
  draft,
  selectedNode,
  onDraftChange,
  workflowOptions,
  allowedActions,
  contextNodeCatalog,
  contextEdgeCatalog,
}: WorkflowNodeInspectorProps) {
  if (!selectedNode) {
    return (
      <aside
        data-testid="workflow-inspector"
        className="flex w-96 shrink-0 flex-col border-l bg-background"
      >
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Inspector</p>
          <p className="text-xs text-muted-foreground">
            Select a workflow block to configure it.
          </p>
        </div>
      </aside>
    );
  }

  const { data } = selectedNode;
  const canDelete = !["trigger", "context", "output"].includes(data.kind);
  const isSheetStyleInspector =
    data.kind === "trigger" || data.kind === "context";

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
        {data.kind === "condition" ? (
          <ConditionInspector
            draft={draft}
            conditionId={data.conditionId}
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
        {data.kind === "output" ? (
          <OutputInspector draft={draft} onDraftChange={onDraftChange} />
        ) : null}
        {data.kind === "reference" ? (
          <ReferenceInspector
            draft={draft}
            referenceId={data.referenceId}
            workflowOptions={workflowOptions}
            onDraftChange={onDraftChange}
          />
        ) : null}
        {data.kind === "route" ? (
          <RouteInspector
            draft={draft}
            routeId={data.routeId}
            workflowOptions={workflowOptions}
            onDraftChange={onDraftChange}
          />
        ) : null}

        {canDelete ? (
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
        ) : null}
      </div>
    </aside>
  );
}

function ReadonlyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      {children}
    </p>
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
        className="px-4 py-4"
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
      className="px-4 pt-4 pb-6"
    />
  );
}

function ConditionInspector({
  draft,
  conditionId,
  onDraftChange,
}: {
  draft: WorkflowDraft;
  conditionId?: string;
  onDraftChange: (draft: WorkflowDraft) => void;
}) {
  const condition = draft.conditions.find((item) => item.id === conditionId);
  if (!condition || !conditionId) return null;

  const patch = (next: Partial<WorkflowConditionSpec>) =>
    onDraftChange(updateCondition(draft, conditionId, next));

  return (
    <>
      <Field label="Label" htmlFor="condition-label">
        <Input
          id="condition-label"
          value={condition.label ?? ""}
          onChange={(event) => patch({ label: event.target.value })}
        />
      </Field>
      <Field label="Description" htmlFor="condition-description">
        <Textarea
          id="condition-description"
          value={condition.description ?? ""}
          onChange={(event) => patch({ description: event.target.value })}
          className="min-h-20"
        />
      </Field>
      <Field label="Mode">
        <Select
          value={condition.mode}
          onValueChange={(value) =>
            value && patch({ mode: value as WorkflowConditionSpec["mode"] })
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
      <Field label="Enforcement">
        <Select
          value={condition.enforcement}
          onValueChange={(value) =>
            value &&
            patch({ enforcement: value as WorkflowConditionSpec["enforcement"] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="soft">soft</SelectItem>
            <SelectItem value="hard">hard</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Expression" htmlFor="condition-expression">
        <Textarea
          id="condition-expression"
          value={condition.expression ?? ""}
          onChange={(event) => patch({ expression: event.target.value })}
          className="min-h-16 font-mono text-xs"
        />
      </Field>
    </>
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
      <Field label="Actions">
        <div className="space-y-2 rounded-md border p-3">
          {allowedActions.length ? (
            allowedActions.map((actionType) => (
              <label key={actionType} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedActions.has(actionType)}
                  onCheckedChange={(checked) => {
                    const nextActions = checked
                      ? [
                          ...step.actions,
                          { actionType, required: false },
                        ]
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
      <Field label="Linked references">
        <div className="space-y-2 rounded-md border p-3">
          {draft.references.length ? (
            draft.references.map((reference) => (
              <label key={reference.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={step.referenceIds.includes(reference.id)}
                  onCheckedChange={(checked) => {
                    const nextIds = checked
                      ? [...step.referenceIds, reference.id]
                      : step.referenceIds.filter((id) => id !== reference.id);
                    patch({ referenceIds: nextIds });
                  }}
                />
                {reference.title}
              </label>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No references yet.</p>
          )}
        </div>
      </Field>
      <Field label="Step output" htmlFor="step-output">
        <Textarea
          id="step-output"
          value={step.output ?? ""}
          onChange={(event) => patch({ output: event.target.value })}
          className="min-h-16"
        />
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

function OutputInspector({
  draft,
  onDraftChange,
}: {
  draft: WorkflowDraft;
  onDraftChange: (draft: WorkflowDraft) => void;
}) {
  return (
    <>
      <Field label="Format">
        <Input
          value={draft.output.format ?? ""}
          onChange={(event) =>
            onDraftChange(updateOutput(draft, { format: event.target.value }))
          }
        />
      </Field>
      <Field label="Completion criteria">
        <Textarea
          value={draft.output.completionCriteria ?? ""}
          onChange={(event) =>
            onDraftChange(
              updateOutput(draft, { completionCriteria: event.target.value }),
            )
          }
          className="min-h-20"
        />
      </Field>
    </>
  );
}

function ReferenceInspector({
  draft,
  referenceId,
  workflowOptions,
  onDraftChange,
}: {
  draft: WorkflowDraft;
  referenceId?: string;
  workflowOptions: WorkflowPickerOption[];
  onDraftChange: (draft: WorkflowDraft) => void;
}) {
  const reference = draft.references.find((item) => item.id === referenceId);
  if (!reference || !referenceId) return null;

  const patch = (next: Partial<WorkflowReferenceSpec>) =>
    onDraftChange(updateReference(draft, referenceId, next));

  return (
    <>
      <Field label="Title" htmlFor={`ref-title-${referenceId}`}>
        <Input
          id={`ref-title-${referenceId}`}
          value={reference.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>
      <Field label="Kind" htmlFor={`ref-kind-${referenceId}`}>
        <Select
          value={reference.kind}
          onValueChange={(value) => {
            if (!value) return;
            patch({
              kind: value as WorkflowReferenceSpec["kind"],
              body: value === "inline" ? reference.body ?? "" : undefined,
              url: value === "url" ? reference.url : undefined,
              workflowKey:
                value === "workflow"
                  ? reference.workflowKey ?? workflowOptions[0]?.workflowKey
                  : undefined,
            });
          }}
        >
          <SelectTrigger
            id={`ref-kind-${referenceId}`}
            className="w-full"
            data-testid="reference-kind"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inline">inline</SelectItem>
            <SelectItem value="url">url</SelectItem>
            <SelectItem value="workflow">workflow</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {reference.kind === "inline" ? (
        <Field label="Body">
          <Textarea
            value={reference.body ?? ""}
            onChange={(event) => patch({ body: event.target.value })}
            className="min-h-24"
          />
        </Field>
      ) : null}
      {reference.kind === "url" ? (
        <>
          <Field label="URL" htmlFor={`ref-url-${referenceId}`}>
            <Input
              id={`ref-url-${referenceId}`}
              value={reference.url ?? ""}
              onChange={(event) =>
                patch({
                  url: event.target.value.trim() ? event.target.value : undefined,
                })
              }
              placeholder="https://notion.so/..."
            />
          </Field>
          <Field label="Source (MCP hint)">
            <Select
              value={reference.source ?? "generic"}
              onValueChange={(value) =>
                value &&
                patch({
                  source: value as NonNullable<WorkflowReferenceSpec["source"]>,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notion">notion</SelectItem>
                <SelectItem value="gdrive">gdrive</SelectItem>
                <SelectItem value="gmail">gmail</SelectItem>
                <SelectItem value="generic">generic</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      ) : null}
      {reference.kind === "workflow" ? (
        <Field label="Workflow key">
          <Select
            value={reference.workflowKey ?? ""}
            onValueChange={(value) => value && patch({ workflowKey: value })}
          >
            <SelectTrigger className="w-full">
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
        </Field>
      ) : null}
    </>
  );
}

function RouteInspector({
  draft,
  routeId,
  workflowOptions,
  onDraftChange,
}: {
  draft: WorkflowDraft;
  routeId?: string;
  workflowOptions: WorkflowPickerOption[];
  onDraftChange: (draft: WorkflowDraft) => void;
}) {
  const route = draft.routes.find((item) => item.id === routeId);
  if (!route || !routeId) return null;

  const patch = (next: Partial<typeof route>) =>
    onDraftChange(updateRoute(draft, routeId, next));

  return (
    <>
      <Field label="Label">
        <Input
          value={route.label ?? ""}
          onChange={(event) => patch({ label: event.target.value })}
        />
      </Field>
      <Field label="Target workflow">
        <Select
          value={route.targetWorkflowKey}
          onValueChange={(value) => value && patch({ targetWorkflowKey: value })}
        >
          <SelectTrigger className="w-full">
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
      </Field>
      <Field label="Condition id">
        <Select
          value={route.conditionId ?? "__none__"}
          onValueChange={(value) => {
            if (!value) return;
            patch({ conditionId: value === "__none__" ? undefined : value });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Optional condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {draft.conditions.map((condition) => (
              <SelectItem key={condition.id} value={condition.id}>
                {condition.label ?? condition.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

function ReadonlyArea({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea value={value || "-"} readOnly className="min-h-24 font-mono text-xs" />
    </div>
  );
}
