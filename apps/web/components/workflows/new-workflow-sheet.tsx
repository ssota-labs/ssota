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

export function NewWorkflowSheet({ projectId }: { projectId: string }) {
  const [addTriggerOpen, setAddTriggerOpen] = useState(false);

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

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="workflow-title">Name</Label>
                <Input
                  id="workflow-title"
                  name="title"
                  placeholder="Homepage creation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  name="body"
                  placeholder="에이전트가 이 워크플로우를 언제, 어떤 목적으로 실행하는지 설명합니다."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workflow-key">Key</Label>
                <Input
                  id="workflow-key"
                  name="instructionKey"
                  placeholder="homepage_creation"
                  pattern="[a-z][a-z0-9_]*"
                />
                <p className="text-xs text-muted-foreground">
                  선택. MCP·로그에서 쓰는 snake_case 식별자입니다.
                </p>
              </div>

              <WorkflowTriggersField onAddTrigger={() => setAddTriggerOpen(true)} />
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
      />
    </>
  );
}
