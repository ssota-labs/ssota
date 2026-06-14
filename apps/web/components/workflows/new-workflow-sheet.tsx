"use client";

import { useState } from "react";
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
import { defineWorkflowInstructionFormAction } from "@/app/actions";
import { NewTableButton } from "@/components/graph/table-catalog-panel";
import { AddWorkflowTriggerDialog } from "@/components/workflows/add-workflow-trigger-dialog";
import { WorkflowTriggersField } from "@/components/workflows/workflow-triggers-field";
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

export function NewWorkflowSheet({ projectId }: { projectId: string }) {
  const [addTriggerOpen, setAddTriggerOpen] = useState(false);
  const [triggers, setTriggers] = useState(defaultWorkflowTriggerEvents);

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
              이름과 설명만 입력하세요. 단계·게이트·액션은 Builder에서 React Flow로
              구성합니다.
            </SheetDescription>
          </SheetHeader>
          <form
            action={defineWorkflowInstructionFormAction}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="workflowSteps" value="[]" />
            <input type="hidden" name="outputContract" value="{}" />
            <input type="hidden" name="gatePolicy" value="{}" />

            <div className="min-h-0 flex-1 overflow-y-auto py-5">
              <section className="border-b border-border pb-6">
                <div className={formRowClassName}>
                  <FormRow label="Name" htmlFor="workflow-title">
                    <Input
                      id="workflow-title"
                      name="title"
                      placeholder="Homepage creation"
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

              <section className="pt-6">
                <WorkflowTriggersField
                  triggers={triggers}
                  onTriggersChange={setTriggers}
                  onAddTrigger={() => setAddTriggerOpen(true)}
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
        nestedInSheet
        existingKinds={triggers.map((trigger) => trigger.kind)}
        onAddTrigger={(kind) => {
          setTriggers((current) => [
            ...current,
            createWorkflowTriggerEventFromKind(kind),
          ]);
        }}
      />
    </>
  );
}
