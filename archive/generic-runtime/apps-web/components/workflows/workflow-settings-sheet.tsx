"use client";

import { GearIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type {
  ActionCatalogEntry,
  EdgeCatalogEntry,
  NodeCatalogEntry,
  Workflow,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { updateWorkflowSettingsFormAction } from "@/app/actions";
import { AddWorkflowNodeDialog } from "@/components/workflows/add-workflow-node-dialog";
import { WorkflowDescriptionEditor } from "@/components/workflows/workflow-description-editor";
import { WorkflowApplicableNodeTypesField } from "@/components/workflows/workflow-applicable-node-types-field";
import {
  normalizeApplicableNodeTypesFromWorkflow,
  syncWorkflowNodeCatalogFields,
} from "@/lib/workflows/workflow-applicable-node-types";
import {
  WORKFLOW_ROLE_NONE,
  WORKFLOW_ROLE_OPTIONS,
  workflowRoleFromSelectValue,
  workflowRoleOptionsForValue,
  workflowRoleSelectValue,
} from "@/lib/workflows/workflow-role-catalog";

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

function readWorkflowDescription(workflow: Workflow): string {
  if (workflow.agentNotes) {
    return workflow.agentNotes;
  }
  const inlineBody = workflow.references.find(
    (ref) => ref.id === "agent_body" && ref.kind === "inline",
  );
  if (inlineBody?.kind === "inline" && inlineBody.body) {
    return inlineBody.body;
  }
  return "";
}

export function WorkflowSettingsSheet({
  workflow,
  workflowId,
  projectId,
  orgSlug,
  projectSlug,
  nodeCatalog,
  actionCatalog,
  edgeCatalog,
}: {
  workflow: Workflow;
  workflowId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  nodeCatalog: NodeCatalogEntry[];
  actionCatalog: ActionCatalogEntry[];
  edgeCatalog: EdgeCatalogEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [applicableNodeTypes, setApplicableNodeTypes] = useState<
    WorkflowApplicableNodeType[]
  >(() =>
    normalizeApplicableNodeTypesFromWorkflow(workflow.applicableNodeTypes, []),
  );
  const [workflowRole, setWorkflowRole] = useState(() =>
    workflowRoleSelectValue(workflow.workflowRole),
  );

  const syncedCatalogFields = useMemo(
    () =>
      syncWorkflowNodeCatalogFields(
        applicableNodeTypes,
        nodeCatalog,
        actionCatalog,
      ),
    [actionCatalog, applicableNodeTypes, nodeCatalog],
  );

  const description = readWorkflowDescription(workflow);

  useEffect(() => {
    if (!open) return;
    setApplicableNodeTypes(
      normalizeApplicableNodeTypesFromWorkflow(workflow.applicableNodeTypes, []),
    );
    setWorkflowRole(workflowRoleSelectValue(workflow.workflowRole));
  }, [open, workflow]);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Workflow settings"
              data-testid="workflow-settings-trigger"
            />
          }
        >
          <GearIcon className="size-4" />
        </SheetTrigger>
        <SheetContent
          side="right"
          size="half"
          className="flex h-full flex-col gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="sticky top-0 z-10 shrink-0 border-b border-border bg-popover px-6 py-5">
            <SheetTitle>Workflow settings</SheetTitle>
            <SheetDescription>
              이름·역할·설명·Applicable nodes를 수정합니다. Trigger와 Context는
              Builder 패널에서 편집하세요.
            </SheetDescription>
          </SheetHeader>
          <form
            action={updateWorkflowSettingsFormAction}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="workflowId" value={workflowId} />
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="workflowSlug" value={workflow.slug} />
            <input
              type="hidden"
              name="allowedActions"
              value={syncedCatalogFields.allowedActions.join(",")}
            />
            <input
              type="hidden"
              name="workflowRole"
              value={workflowRoleFromSelectValue(workflowRole) ?? ""}
            />

            <div className="min-h-0 flex-1 overflow-y-auto py-5">
              <section className="border-b border-border pb-6">
                <div className={formRowClassName}>
                  <FormRow label="Name" htmlFor="workflow-title">
                    <Input
                      id="workflow-title"
                      name="title"
                      defaultValue={workflow.title}
                      required
                    />
                  </FormRow>

                  <FormRow label="Workflow role" htmlFor="workflow-role">
                    <Select
                      value={workflowRole}
                      onValueChange={(value) =>
                        setWorkflowRole(value ?? WORKFLOW_ROLE_NONE)
                      }
                    >
                      <SelectTrigger
                        id="workflow-role"
                        className="w-full"
                        data-testid="workflow-role"
                      >
                        <SelectValue placeholder="Select role">
                          {workflowRole === WORKFLOW_ROLE_NONE
                            ? "None"
                            : (WORKFLOW_ROLE_OPTIONS.find(
                                (option) => option.value === workflowRole,
                              )?.label ?? workflowRole)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={WORKFLOW_ROLE_NONE}>None</SelectItem>
                        {workflowRoleOptionsForValue(
                          workflowRoleFromSelectValue(workflowRole),
                        ).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Optional label for docs and filtering. Does not change
                      runtime behavior.
                    </p>
                  </FormRow>

                  <FormRow label="Description" htmlFor="workflow-description">
                    <WorkflowDescriptionEditor
                      projectId={projectId}
                      agentNotes={description}
                      agentNotesDoc={workflow.agentNotesDoc}
                    />
                  </FormRow>
                </div>
              </section>

              <section className="py-6">
                <WorkflowApplicableNodeTypesField
                  applicableNodeTypes={applicableNodeTypes}
                  onApplicableNodeTypesChange={setApplicableNodeTypes}
                  nodeCatalog={nodeCatalog}
                  actionCatalog={actionCatalog}
                  onAddNodeClick={() => setAddNodeOpen(true)}
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
