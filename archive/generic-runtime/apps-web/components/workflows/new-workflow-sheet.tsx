"use client";

import { useMemo, useState } from "react";
import type {
  ActionCatalogEntry,
  EdgeCatalogEntry,
  NodeCatalogEntry,
  WorkflowApplicableNodeType,
} from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@ssota/ui/components/ui/sheet";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { defineWorkflowFormAction } from "@/app/actions";
import { NewTableButton } from "@/components/graph/table-catalog-panel";
import { AddWorkflowNodeDialog } from "@/components/workflows/add-workflow-node-dialog";
import { AddWorkflowTriggerDialog } from "@/components/workflows/add-workflow-trigger-dialog";
import { WorkflowContextField } from "@/components/workflows/workflow-context-field";
import { WorkflowApplicableNodeTypesField } from "@/components/workflows/workflow-applicable-node-types-field";
import { WorkflowTriggersField } from "@/components/workflows/workflow-triggers-field";
import { syncWorkflowNodeCatalogFields } from "@/lib/workflows/workflow-applicable-node-types";
import {
  defaultContextSpec,
} from "@/lib/workflows/workflow-context-defaults";
import {
  createWorkflowTriggerEventFromKind,
  defaultWorkflowTriggerEvents,
} from "@/lib/workflows/workflow-trigger-catalog";

const formRowClassName =
  "grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-start gap-x-8 gap-y-5 px-6";

function FormRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Label htmlFor={htmlFor} className="pt-2.5 text-sm font-normal">
        {label}
      </Label>
      <div className="min-w-0">{children}</div>
    </>
  );
}

export function NewWorkflowSheet({
  projectId,
  orgSlug,
  projectSlug,
  nodeCatalog,
  actionCatalog,
  edgeCatalog,
}: {
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  nodeCatalog: NodeCatalogEntry[];
  actionCatalog: ActionCatalogEntry[];
  edgeCatalog: EdgeCatalogEntry[];
}) {
  const [addTriggerOpen, setAddTriggerOpen] = useState(false);
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [triggers, setTriggers] = useState(defaultWorkflowTriggerEvents);
  const [applicableNodeTypes, setApplicableNodeTypes] = useState<
    WorkflowApplicableNodeType[]
  >([]);
  const [context, setContext] = useState(defaultContextSpec);

  const syncedCatalogFields = useMemo(
    () =>
      syncWorkflowNodeCatalogFields(
        applicableNodeTypes,
        nodeCatalog,
        actionCatalog,
      ),
    [actionCatalog, applicableNodeTypes, nodeCatalog],
  );

  const nodeCatalogOptions = useMemo(
    () =>
      nodeCatalog.map((entry) => ({
        nodeType: entry.nodeType,
        label: entry.label,
        propertyKeys: Object.keys(entry.propertySchema ?? {}),
      })),
    [nodeCatalog],
  );

  const edgeCatalogOptions = useMemo(
    () =>
      edgeCatalog.map((entry) => ({
        edgeType: entry.edgeType,
        label: entry.label,
      })),
    [edgeCatalog],
  );

  return (
    <>
      <Sheet>
        <SheetTrigger render={<NewTableButton />}>New workflow</SheetTrigger>
        <SheetContent
          side="right"
          size="half"
          className="flex h-full flex-col gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="sticky top-0 z-10 shrink-0 border-b border-border bg-popover px-6 py-5">
            <SheetTitle>Create a new workflow</SheetTitle>
            <SheetDescription>
              Metadata, triggers, and context를 설정하세요. 단계·게이트·액션은 Builder에서
              React Flow로 구성합니다.
            </SheetDescription>
          </SheetHeader>
          <form
            action={defineWorkflowFormAction}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="workflowSteps" value="[]" />
            <input type="hidden" name="outputContract" value="{}" />
            <input type="hidden" name="gatePolicy" value="{}" />
            <input
              type="hidden"
              name="allowedActions"
              value={syncedCatalogFields.allowedActions.join(",")}
            />

            <div className="min-h-0 flex-1 overflow-y-auto py-5">
              <section className="border-b border-border pb-6">
                <div className={formRowClassName}>
                  <FormRow label="Name" htmlFor="workflow-title">
                    <Input
                      id="workflow-title"
                      name="title"
                      placeholder="Document creation workflow"
                      required
                    />
                  </FormRow>

                  <FormRow label="Description" htmlFor="workflow-description">
                    <Textarea
                      id="workflow-description"
                      name="body"
                      placeholder="에이전트가 이 워크플로우를 언제, 어떤 목적으로 실행하는지 설명합니다."
                      rows={4}
                      required
                    />
                  </FormRow>
                </div>
              </section>

              <section className="border-b border-border pb-6 pt-6">
                <WorkflowTriggersField
                  triggers={triggers}
                  onTriggersChange={setTriggers}
                  onAddTrigger={() => setAddTriggerOpen(true)}
                />
              </section>

              <section className="border-b border-border py-6">
                <WorkflowApplicableNodeTypesField
                  applicableNodeTypes={applicableNodeTypes}
                  onApplicableNodeTypesChange={setApplicableNodeTypes}
                  nodeCatalog={nodeCatalog}
                  actionCatalog={actionCatalog}
                  onAddNodeClick={() => setAddNodeOpen(true)}
                />
              </section>

              <section className="pt-6">
                <WorkflowContextField
                  context={context}
                  onContextChange={setContext}
                  nodeCatalog={nodeCatalogOptions}
                  edgeCatalog={edgeCatalogOptions}
                />
              </section>
            </div>

            <SheetFooter className="sticky bottom-0 z-10 shrink-0 flex-row justify-end gap-2 border-t border-border bg-popover px-6 py-4">
              <SheetClose render={<Button type="button" variant="outline" />}>
                Cancel
              </SheetClose>
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AddWorkflowTriggerDialog
        open={addTriggerOpen}
        onOpenChange={setAddTriggerOpen}
        existingKinds={triggers.map((trigger) => trigger.kind)}
        onAddTrigger={(kind) => {
          setTriggers((current) => [
            ...current,
            createWorkflowTriggerEventFromKind(kind),
          ]);
        }}
      />

      <AddWorkflowNodeDialog
        open={addNodeOpen}
        onOpenChange={setAddNodeOpen}
        existingNodeTypes={applicableNodeTypes.map((entry) => entry.nodeType)}
        nodeCatalog={nodeCatalog}
        edgeCatalog={edgeCatalog}
        onAddNode={(nodeType) => {
          if (applicableNodeTypes.some((entry) => entry.nodeType === nodeType)) {
            return;
          }
          setApplicableNodeTypes((current) => [
            ...current,
            { nodeType, disabledActions: [] },
          ]);
        }}
      />
    </>
  );
}
