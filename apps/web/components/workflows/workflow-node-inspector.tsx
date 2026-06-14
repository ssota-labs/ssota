"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ActionCatalogEntry,
  NodeCatalogEntry,
  Workflow,
  WorkflowNodeBinding,
} from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { updateWorkflowAction } from "@/app/actions";
import { WorkflowNodeBindingsField } from "@/components/workflows/workflow-node-bindings-field";
import type { WorkflowFlowNode } from "@/lib/workflows/workflow-flow-model";
import {
  normalizeNodeBindingsFromWorkflow,
  syncWorkflowNodeCatalogFields,
} from "@/lib/workflows/workflow-node-bindings";
import { getWorkflowTriggerMeta } from "@/lib/workflows/workflow-trigger-catalog";

type WorkflowNodeInspectorProps = {
  workflow: Workflow;
  workflowId: string;
  projectId: string;
  nodeCatalog: NodeCatalogEntry[];
  actionCatalog: ActionCatalogEntry[];
  selectedNode: WorkflowFlowNode | null;
};

export function WorkflowNodeInspector({
  workflow,
  workflowId,
  projectId,
  nodeCatalog,
  actionCatalog,
  selectedNode,
}: WorkflowNodeInspectorProps) {
  if (!selectedNode) {
    return (
      <aside className="flex w-96 shrink-0 flex-col border-l bg-background">
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

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l bg-background">
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
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        {data.kind === "trigger" ? <TriggerInspector workflow={workflow} /> : null}
        {data.kind === "context" ? (
          <ContextInspector
            workflow={workflow}
            workflowId={workflowId}
            projectId={projectId}
            nodeCatalog={nodeCatalog}
            actionCatalog={actionCatalog}
          />
        ) : null}
        {data.kind === "condition" ? (
          <ConditionInspector workflow={workflow} conditionId={data.conditionId} />
        ) : null}
        {data.kind === "step" || data.kind === "gate" ? (
          <StepInspector workflow={workflow} stepId={data.stepId} />
        ) : null}
        {data.kind === "output" ? <OutputInspector workflow={workflow} /> : null}
        {data.kind === "reference" ? (
          <ReferenceInspector workflow={workflow} referenceId={data.referenceId} />
        ) : null}
        {data.kind === "route" ? (
          <RouteInspector workflow={workflow} routeId={data.routeId} />
        ) : null}
      </div>
    </aside>
  );
}

function TriggerInspector({ workflow }: { workflow: Workflow }) {
  const activeEvents = workflow.trigger.events.filter((event) => event.enabled);
  return (
    <>
      <ReadonlyArea
        label="Events"
        value={
          activeEvents.length
            ? activeEvents
                .map((event) => {
                  const meta = getWorkflowTriggerMeta(event.kind);
                  return `${meta.label} (${event.kind})`;
                })
                .join("\n")
            : "No active triggers"
        }
      />
    </>
  );
}

function ContextInspector({
  workflow,
  workflowId,
  projectId,
  nodeCatalog,
  actionCatalog,
}: {
  workflow: Workflow;
  workflowId: string;
  projectId: string;
  nodeCatalog: NodeCatalogEntry[];
  actionCatalog: ActionCatalogEntry[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bindings, setBindings] = useState<WorkflowNodeBinding[]>(() =>
    normalizeNodeBindingsFromWorkflow(
      workflow.nodeBindings,
      workflow.applicableNodeTypes,
    ),
  );

  useEffect(() => {
    setBindings(
      normalizeNodeBindingsFromWorkflow(
        workflow.nodeBindings,
        workflow.applicableNodeTypes,
      ),
    );
  }, [workflow.applicableNodeTypes, workflow.nodeBindings]);

  function persist(nextBindings: WorkflowNodeBinding[]) {
    setBindings(nextBindings);
    const patch = syncWorkflowNodeCatalogFields(
      nextBindings,
      nodeCatalog,
      actionCatalog,
    );
    startTransition(async () => {
      await updateWorkflowAction({
        projectId,
        workflowId,
        patch,
      });
      router.refresh();
    });
  }

  return (
    <>
      <WorkflowNodeBindingsField
        nodeBindings={bindings}
        onNodeBindingsChange={persist}
        nodeCatalog={nodeCatalog}
        actionCatalog={actionCatalog}
        disabled={isPending}
      />
      <ReadonlyArea
        label="Queries"
        value={workflow.context.queries
          .map(
            (query) =>
              `${query.label ?? query.id}${query.nodeType ? ` · ${query.nodeType}` : ""}`,
          )
          .join("\n")}
      />
      <ReadonlyArea
        label="Traversals"
        value={workflow.context.traversals
          .map(
            (traversal) =>
              `${traversal.label ?? traversal.id} · ${traversal.direction} · ${traversal.maxHops} hop(s)`,
          )
          .join("\n")}
      />
      <ReadonlyArea
        label="Assertions"
        value={workflow.context.assertions
          .map(
            (assertion) =>
              `${assertion.label ?? assertion.id} · ${assertion.kind} · ${assertion.enforcement}`,
          )
          .join("\n")}
      />
      <ReadonlyArea label="Notes" value={workflow.context.notes ?? ""} />
    </>
  );
}

function ConditionInspector({
  workflow,
  conditionId,
}: {
  workflow: Workflow;
  conditionId?: string;
}) {
  const condition = workflow.conditions.find((item) => item.id === conditionId);
  return (
    <>
      <ReadonlyText label="Mode" value={condition?.mode ?? ""} />
      <ReadonlyText label="Enforcement" value={condition?.enforcement ?? ""} />
      <ReadonlyArea label="Expression" value={condition?.expression ?? ""} />
      <ReadonlyArea label="Description" value={condition?.description ?? ""} />
    </>
  );
}

function StepInspector({
  workflow,
  stepId,
}: {
  workflow: Workflow;
  stepId?: string;
}) {
  const step = workflow.steps.find((item) => item.id === stepId);
  return (
    <>
      <ReadonlyText label="Title" value={step?.title ?? ""} />
      <ReadonlyText label="Mode" value={step?.mode ?? ""} />
      <ReadonlyArea label="Guidance" value={step?.description ?? ""} />
      <ReadonlyArea
        label="Action refs"
        value={step?.actions
          .map(
            (action) =>
              `${action.actionType}${action.required ? " · required" : ""}`,
          )
          .join("\n")}
      />
      <ReadonlyArea label="Reference refs" value={step?.referenceIds.join("\n")} />
      <ReadonlyText label="Route target" value={step?.routeToWorkflowKey ?? ""} />
      <ReadonlyArea label="Output" value={step?.output ?? ""} />
      {step?.gate ? (
        <ReadonlyArea
          label="Gate policy"
          value={JSON.stringify(step.gate.policy, null, 2)}
        />
      ) : null}
    </>
  );
}

function OutputInspector({ workflow }: { workflow: Workflow }) {
  return (
    <>
      <ReadonlyText label="Format" value={workflow.output.format ?? ""} />
      <ReadonlyArea
        label="Completion criteria"
        value={workflow.output.completionCriteria ?? ""}
      />
      <ReadonlyArea
        label="Output contract"
        value={JSON.stringify(workflow.output.contract, null, 2)}
      />
    </>
  );
}

function ReferenceInspector({
  workflow,
  referenceId,
}: {
  workflow: Workflow;
  referenceId?: string;
}) {
  const reference = workflow.references.find((item) => item.id === referenceId);
  return (
    <>
      <ReadonlyText label="Kind" value={reference?.kind ?? ""} />
      <ReadonlyText label="URL" value={reference?.url ?? ""} />
      <ReadonlyText label="Workflow key" value={reference?.workflowKey ?? ""} />
      <ReadonlyArea label="Body" value={reference?.body ?? ""} />
    </>
  );
}

function RouteInspector({
  workflow,
  routeId,
}: {
  workflow: Workflow;
  routeId?: string;
}) {
  const route = workflow.routes.find((item) => item.id === routeId);
  return (
    <>
      <ReadonlyText label="Target workflow" value={route?.targetWorkflowKey ?? ""} />
      <ReadonlyText label="Condition" value={route?.conditionId ?? ""} />
      <ReadonlyText label="Label" value={route?.label ?? ""} />
    </>
  );
}

function ReadonlyText({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value || "-"} readOnly />
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
